/**
 * Settled invoices: payment for work already delivered.
 *
 * Kept deliberately apart from bookings and contracts. An invoice bills for a
 * session that has already been shot, so nothing here touches the calendar,
 * holds a slot or consults availability. The amount lives in this file so the
 * browser can never change what is charged.
 */

export interface Invoice {
  slug: string;
  /** Whose invoice this is, as it should read on a receipt. */
  clientName: string;
  /** Headline on the page. */
  title: string;
  /** What was shot. */
  sessionLabel: string;
  /** ISO date the session took place. Weekday is derived, never typed. */
  sessionDate: string;
  amountPence: number;
  /** Explains the price, e.g. that it is the standard published rate. */
  rateNote: string;
  ogImage: string;
  /** Line item description on the Stripe receipt. */
  stripeLabel: string;
}

const INVOICES: Invoice[] = [
  {
    slug: 'prewedding-divine-bolu',
    clientName: 'Divine Ayerume & Bolu',
    title: 'Pre-Wedding Session',
    sessionLabel: 'Pre-Wedding & Engagement, three looks',
    sessionDate: '2026-07-04',
    amountPence: 50000,
    rateNote:
      'This is the standard three-look Pre-Wedding & Engagement rate. No discount has been applied and there is nothing further to pay.',
    ogImage: '/assets/og/prewedding-divine-bolu.jpg',
    stripeLabel: 'Pre-Wedding & Engagement session, three looks',
  },
];

export function getInvoice(slug: string | null | undefined): Invoice | undefined {
  if (!slug) return undefined;
  return INVOICES.find((i) => i.slug === slug);
}

export function money(pence: number): string {
  return pence % 100 === 0 ? `£${(pence / 100).toLocaleString('en-GB')}` : `£${(pence / 100).toFixed(2)}`;
}

/**
 * DATE columns arrive as 'YYYY-MM-DD' strings (see lib/db), but TIMESTAMPTZ
 * still arrives as a Date object, so it must be formatted rather than sliced.
 */
export function whenPaid(value: string | Date): string {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
