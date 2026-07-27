// Single source of truth for bookable packages, tiers, payment rules,
// session durations and opening hours (PAYMENTS_BRIEF.md + PACKAGES.md).
// Prices are integer pence — never floats.

export interface Tier {
  id: string;
  label: string; // e.g. "2 looks"
  pricePence: number;
  // 'full'    → charge 100% at booking
  // 'deposit' → charge 80% now, 20% balance later
  charge: 'full' | 'deposit';
  durationMin: number;
  fromPrice?: boolean; // "From £300" tiers
}

export interface BookablePackage {
  slug: string;
  title: string;
  tiers: Tier[];
}

export const DEPOSIT_RATE = 0.8; // 80% deposit / 20% balance

// CHACE STUDIOS opening hours (confirmed by Hadley, 27 Jul 2026).
// Mon–Sat 09:00–23:59 · Sunday 15:00–23:59. 0=Sunday … 6=Saturday.
// `close` is the latest a session may END, so the last start time offered
// is (close − session duration).
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

export const PACKAGES: BookablePackage[] = [
  {
    slug: 'individual-portrait',
    title: 'Individual Portrait',
    tiers: [
      { id: '1-look', label: '1 look', pricePence: 17000, charge: 'full', durationMin: 60 },
      { id: '2-looks', label: '2 looks', pricePence: 30000, charge: 'deposit', durationMin: 60 },
    ],
  },
  {
    slug: 'corporate-headshots',
    title: 'Professional Corporate Headshots',
    tiers: [
      { id: '1-look', label: '1 look', pricePence: 15000, charge: 'full', durationMin: 60 },
      { id: '2-looks', label: '2 looks', pricePence: 30000, charge: 'deposit', durationMin: 60 },
    ],
  },
  {
    slug: 'maternity',
    title: 'Maternity Shoot',
    tiers: [
      { id: 'single', label: 'Single — 1 look', pricePence: 17000, charge: 'full', durationMin: 60 },
      { id: 'couple', label: 'Couple — 1 look', pricePence: 20000, charge: 'full', durationMin: 60 },
    ],
  },
  {
    slug: 'baby-shoot',
    title: 'Baby Shoot · Ages 1–10',
    tiers: [
      { id: '1-look', label: '1 look', pricePence: 15000, charge: 'full', durationMin: 60 },
      { id: '2-looks', label: '2 looks', pricePence: 25000, charge: 'deposit', durationMin: 60 },
    ],
  },
  {
    slug: 'family-shoot',
    title: 'Family Shoot',
    tiers: [
      {
        id: '1-look',
        label: '1 look (family of 4)',
        pricePence: 25000,
        charge: 'full',
        durationMin: 60,
      },
    ],
  },
  {
    slug: 'pre-wedding-engagement',
    title: 'Pre-Wedding & Engagement',
    tiers: [
      { id: '1-look', label: '1 look', pricePence: 20000, charge: 'full', durationMin: 90 },
      { id: '2-looks', label: '2 looks', pricePence: 40000, charge: 'deposit', durationMin: 90 },
      { id: '3-looks', label: '3 looks', pricePence: 50000, charge: 'deposit', durationMin: 90 },
    ],
  },
  {
    slug: 'civil-wedding',
    title: 'Civil Wedding',
    tiers: [
      {
        id: '1-hour',
        label: '1 hour · within London',
        pricePence: 30000,
        charge: 'deposit',
        durationMin: 60,
        fromPrice: true,
      },
    ],
  },
  {
    slug: 'event-shoot',
    title: 'Event Shoot',
    tiers: [
      {
        id: '2-hours',
        label: '2 hours · within London',
        pricePence: 30000,
        charge: 'deposit',
        durationMin: 120,
        fromPrice: true,
      },
    ],
  },
  {
    slug: 'studio-hire',
    title: 'Studio Hire',
    tiers: [
      { id: '1-hour', label: '1 hour', pricePence: 3500, charge: 'full', durationMin: 60 },
      { id: '2-hours', label: '2 hours', pricePence: 6000, charge: 'full', durationMin: 120 },
    ],
  },
  {
    slug: 'podcast',
    title: 'Podcast & Live Broadcast Production',
    tiers: [
      {
        id: 'single-session',
        label: '1-hour session (1–3 speakers)',
        pricePence: 20000,
        charge: 'full',
        durationMin: 60,
      },
      // Continuous package (£150/ep) is enquiry-only — not bookable online.
    ],
  },
  // Fashion & Brand Campaigns: enquiry-only (mailto), never bookable online.
];

export function getPackage(slug: string): BookablePackage | undefined {
  return PACKAGES.find((p) => p.slug === slug);
}

export function getTier(slug: string, tierId: string): Tier | undefined {
  return getPackage(slug)?.tiers.find((t) => t.id === tierId);
}

/** Amount charged at booking time, integer pence (80% for deposit tiers). */
export function chargeNowPence(tier: Tier): number {
  return tier.charge === 'deposit' ? Math.round(tier.pricePence * DEPOSIT_RATE) : tier.pricePence;
}
