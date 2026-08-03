// Single source of truth for bookable packages, tiers, payment rules,
// session durations and opening hours (PACKAGES.md is authoritative).
// Prices are integer pence, never floats.

export interface Tier {
  id: string;
  /** Short name, e.g. "3 looks". */
  label: string;
  /** What the tier includes, e.g. "12 edited images". */
  includes?: string;
  /** Price actually charged, after any automatic discount. */
  pricePence: number;
  /** Undiscounted price. Present only when a discount applies. */
  listPence?: number;
  /** Whole-percent automatic discount, e.g. 15. */
  discountPct?: number;
  // 'full'    -> charge 100% at booking
  // 'deposit' -> charge 80% now, 20% balance later
  charge: 'full' | 'deposit';
  durationMin: number;
  fromPrice?: boolean;
}

export interface BookablePackage {
  slug: string;
  title: string;
  tiers: Tier[];
  /** Can only happen at one of our studios, no on-location option. */
  studioOnly?: boolean;
  /** Automatic returning-client rate, currently podcast only. */
  returningPricePence?: number;
}

export interface Studio {
  id: string;
  name: string;
  address: string;
}

/** Add further studios here; the booking form turns into a real picker. */
export const STUDIOS: Studio[] = [
  { id: 'pocklingtons', name: 'CHACE STUDIOS', address: '5 Pocklingtons Walk, Leicester LE1 6BT, UK' },
];

export function getStudio(id: string | null | undefined): Studio | undefined {
  return STUDIOS.find((s) => s.id === id);
}

export const DEFAULT_STUDIO = STUDIOS[0];

export const DEPOSIT_RATE = 0.8; // 80% deposit, 20% balance
export const MAX_HOURS_PER_DAY = 10; // hard daily cap

// CHACE STUDIOS opening hours (confirmed by Hadley, 27 Jul 2026).
// Mon to Sat 09:00 to 23:59, Sunday 15:00 to 23:59. 0=Sunday ... 6=Saturday.
// `close` is the latest a session may END, so the last start time offered
// is (close minus session duration).
export const OPENING_HOURS: Record<number, { open: string; close: string } | null> = {
  0: { open: '15:00', close: '23:59' }, // Sunday
  1: { open: '09:00', close: '23:59' },
  2: { open: '09:00', close: '23:59' },
  3: { open: '09:00', close: '23:59' },
  4: { open: '09:00', close: '23:59' },
  5: { open: '09:00', close: '23:59' },
  6: { open: '09:00', close: '23:59' },
};

export const SLOT_STEP_MIN = 60; // start times offered on the hour
export const HOLD_MINUTES = 30; // pending-payment slot hold

/** Apply a whole-percent discount to an integer-pence amount. */
function discounted(listPence: number, pct: number): number {
  return Math.round(listPence * (1 - pct / 100));
}

const hourLabel = (h: number) => (h === 1 ? '1 hour' : `${h} hours`);
const hourId = (h: number) => (h === 1 ? '1-hour' : `${h}-hours`);
const lookLabel = (n: number) => (n === 1 ? '1 look' : `${n} looks`);
const lookId = (n: number) => (n === 1 ? '1-look' : `${n}-looks`);

/**
 * Family Shoot: £250 per look, 15% off above one look. Dropdown offers 1 to 4.
 * Each look needs its own hour of studio time, so the booking blocks the
 * calendar for the full session rather than a single hour.
 */
function familyTiers(): Tier[] {
  return [1, 2, 3, 4].map((n) => {
    const list = n * 25000;
    const pct = n > 1 ? 15 : 0;
    return {
      id: lookId(n),
      label: lookLabel(n),
      includes: `family of 4, ${n * 8} pictures`,
      listPence: pct ? list : undefined,
      discountPct: pct || undefined,
      pricePence: pct ? discounted(list, pct) : list,
      charge: n > 1 ? 'deposit' : 'full',
      durationMin: n * 60,
    } satisfies Tier;
  });
}

/** Civil Wedding: £300 per hour, 15% off above one hour, deposit on every tier. */
function civilWeddingTiers(): Tier[] {
  return Array.from({ length: MAX_HOURS_PER_DAY }, (_, i) => i + 1).map((h) => {
    const list = h * 30000;
    const pct = h > 1 ? 15 : 0;
    return {
      id: hourId(h),
      label: hourLabel(h),
      includes: '10 retouched portraits plus all edited images',
      listPence: pct ? list : undefined,
      discountPct: pct || undefined,
      pricePence: pct ? discounted(list, pct) : list,
      charge: 'deposit',
      durationMin: h * 60,
    } satisfies Tier;
  });
}

/** Event Shoot: £300 for the first 2 hours then £150 each, 10% off above 2 hours. */
function eventTiers(): Tier[] {
  return Array.from({ length: MAX_HOURS_PER_DAY - 1 }, (_, i) => i + 2).map((h) => {
    const list = 30000 + (h - 2) * 15000;
    const pct = h > 2 ? 10 : 0;
    return {
      id: hourId(h),
      label: hourLabel(h),
      listPence: pct ? list : undefined,
      discountPct: pct || undefined,
      pricePence: pct ? discounted(list, pct) : list,
      charge: 'deposit',
      durationMin: h * 60,
    } satisfies Tier;
  });
}

/** Studio Hire: £35 for 1 hour, £60 for 2, then £30 per extra hour. No discount. */
function studioHireTiers(): Tier[] {
  return Array.from({ length: MAX_HOURS_PER_DAY }, (_, i) => i + 1).map((h) => {
    const price = h === 1 ? 3500 : 6000 + (h - 2) * 3000;
    return {
      id: hourId(h),
      label: hourLabel(h),
      pricePence: price,
      charge: 'full',
      durationMin: h * 60,
    } satisfies Tier;
  });
}

// Look-based sessions book one hour of studio time per look (90 minutes per
// look for pre-wedding), so the calendar is blocked for the true session
// length rather than a single slot.
export const PACKAGES: BookablePackage[] = [
  {
    slug: 'individual-portrait',
    title: 'Individual Portrait',
    tiers: [
      { id: '1-look', label: '1 look', includes: '4 edited pictures', pricePence: 17000, charge: 'full', durationMin: 60 },
      { id: '2-looks', label: '2 looks', includes: '8 edited pictures', pricePence: 30000, charge: 'deposit', durationMin: 120 },
      { id: '3-looks', label: '3 looks', includes: '12 edited pictures', pricePence: 40000, charge: 'deposit', durationMin: 180 },
    ],
  },
  {
    slug: 'corporate-headshots',
    title: 'Professional Corporate Headshots',
    tiers: [
      { id: '1-look', label: '1 look', includes: '4 retouched pictures', pricePence: 15000, charge: 'full', durationMin: 60 },
      { id: '2-looks', label: '2 looks', includes: '8 retouched pictures', pricePence: 30000, charge: 'deposit', durationMin: 120 },
      { id: '3-looks', label: '3 looks', includes: '12 retouched pictures', pricePence: 40000, charge: 'deposit', durationMin: 180 },
    ],
  },
  {
    slug: 'maternity',
    title: 'Maternity Shoot',
    tiers: [
      { id: 'single', label: 'Single, 1 look', includes: '4 edited images', pricePence: 17000, charge: 'full', durationMin: 60 },
      { id: 'couple', label: 'Couple, 1 look', includes: '6 edited images', pricePence: 20000, charge: 'full', durationMin: 60 },
      { id: '2-looks', label: '2 looks', includes: '10 edited images', pricePence: 32000, charge: 'deposit', durationMin: 120 },
      { id: '3-looks', label: '3 looks', includes: '15 edited images', pricePence: 45000, charge: 'deposit', durationMin: 180 },
    ],
  },
  {
    // Renamed from Baby Shoot. Slug and image kept so existing links still work.
    slug: 'baby-shoot',
    title: 'Kids Shoot, ages 1 to 10',
    tiers: [
      { id: '1-look', label: '1 look', includes: '4 edited images', pricePence: 15000, charge: 'full', durationMin: 60 },
      { id: '2-looks', label: '2 looks', includes: '8 edited images', pricePence: 25000, charge: 'deposit', durationMin: 120 },
      { id: '3-looks', label: '3 looks', includes: '12 edited images', pricePence: 35000, charge: 'deposit', durationMin: 180 },
    ],
  },
  {
    slug: 'family-shoot',
    title: 'Family Shoot',
    tiers: familyTiers(),
  },
  {
    // Graduation tiers vary by who is in frame and whether we travel to the
    // ceremony, not by look count, so the labels carry no hour counts. The
    // durations are here purely so the calendar blocks the right slot.
    slug: 'graduation',
    title: 'Graduation',
    tiers: [
      {
        id: 'graduation-studio',
        label: 'Studio, solo',
        includes: '1 look, 6 edited studio images',
        pricePence: 17000,
        charge: 'full',
        durationMin: 60,
      },
      {
        id: 'graduation-family',
        label: 'Studio, with family and friends',
        includes: '1 look, 6 edited studio images',
        pricePence: 20000,
        charge: 'full',
        durationMin: 60,
      },
      {
        id: 'graduation-venue',
        label: 'Studio and venue coverage',
        includes: '6 edited studio images plus 6 from the venue',
        pricePence: 30000,
        charge: 'deposit',
        durationMin: 120,
      },
    ],
  },
  {
    slug: 'pre-wedding-engagement',
    title: 'Pre-Wedding & Engagement',
    tiers: [
      { id: '1-look', label: '1 look', includes: '7 images per look', pricePence: 20000, charge: 'full', durationMin: 90 },
      { id: '2-looks', label: '2 looks', pricePence: 40000, charge: 'deposit', durationMin: 180 },
      { id: '3-looks', label: '3 looks', pricePence: 50000, charge: 'deposit', durationMin: 270 },
    ],
  },
  {
    slug: 'civil-wedding',
    title: 'Civil Wedding',
    tiers: civilWeddingTiers(),
  },
  {
    slug: 'event-shoot',
    title: 'Event Shoot',
    tiers: eventTiers(),
  },
  {
    slug: 'studio-hire',
    title: 'Studio Hire',
    studioOnly: true,
    tiers: studioHireTiers(),
  },
  {
    slug: 'podcast',
    title: 'Podcast & Live Broadcast Production',
    studioOnly: true,
    returningPricePence: 15000,
    tiers: [
      {
        id: 'single-session',
        label: '1 hour session, 1 to 3 speakers',
        pricePence: 20000,
        charge: 'full',
        durationMin: 60,
      },
    ],
  },
  // Fashion & Brand Campaigns: enquiry only, never bookable online.
];

export function getPackage(slug: string): BookablePackage | undefined {
  return PACKAGES.find((p) => p.slug === slug);
}

export function getTier(slug: string, tierId: string): Tier | undefined {
  return getPackage(slug)?.tiers.find((t) => t.id === tierId);
}

/** Amount charged at booking time, integer pence (80% for deposit tiers). */
export function chargeNowPence(tier: Tier, totalPence = tier.pricePence): number {
  return tier.charge === 'deposit' ? Math.round(totalPence * DEPOSIT_RATE) : totalPence;
}

/**
 * Phone comparison key: digits only, with UK country code and trunk zero
 * removed so "+44 7700 900123", "07700 900123" and "7700900123" all match.
 */
export function phoneKey(phone: string | null | undefined): string {
  if (!phone) return '';
  let d = String(phone).replace(/[^0-9]/g, '');
  if (d.startsWith('44')) d = d.slice(2);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
}
