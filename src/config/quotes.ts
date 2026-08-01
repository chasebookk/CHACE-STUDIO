// Privately agreed rates for individual client quotes.
//
// These override the list price for one client on one quote page and never
// touch the public packages or /packages pricing. The booking form sends the
// quote id, and /api/checkout looks the rate up here, so the agreed price is
// enforced server side and cannot be altered from the browser.
//
// The 80/20 rule still applies: a deposit tier charges 80% of the agreed
// total, leaving 20% due after the session.
import { getTier, chargeNowPence } from './booking';

export interface AgreedQuote {
  /** Matches the markdown filename in src/content/quotes/. */
  id: string;
  packageSlug: string;
  tierId: string;
  /** What this client actually pays, in integer pence. */
  totalPence: number;
  /** List price, shown struck through for context. */
  listPence: number;
}

export const AGREED_QUOTES: AgreedQuote[] = [
  {
    id: 'divine',
    packageSlug: 'individual-portrait',
    tierId: '2-looks',
    totalPence: 25000,
    listPence: 30000,
  },
];

export function getAgreedQuote(id: string | null | undefined): AgreedQuote | undefined {
  if (!id) return undefined;
  return AGREED_QUOTES.find((q) => q.id === id);
}

/**
 * The agreed total split into what is charged now and what is left, using the
 * same deposit rule as every other booking.
 */
export function agreedSplit(quote: AgreedQuote): { totalPence: number; depositPence: number; balancePence: number } {
  const tier = getTier(quote.packageSlug, quote.tierId);
  if (!tier) throw new Error(`Quote "${quote.id}" references unknown tier ${quote.packageSlug}/${quote.tierId}`);
  const depositPence = chargeNowPence(tier, quote.totalPence);
  return {
    totalPence: quote.totalPence,
    depositPence,
    balancePence: quote.totalPence - depositPence,
  };
}
