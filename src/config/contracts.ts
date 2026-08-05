/**
 * Private client contracts.
 *
 * Everything the contract page renders and everything the payment charges
 * comes from here, so the browser can never alter a price, a date or a term.
 * /api/contract looks the contract up by slug and uses these figures; the
 * form only ever supplies names, contact details and venue addresses.
 */

export interface PriceRow {
  label: string;
  pence: number;
  note?: string;
}

export interface ContractDay {
  /** ISO date. The weekday shown on the page is derived from this, never typed. */
  date: string;
  heading: string;
  items: string[];
  /** Whole-day hold, so nothing else can be booked around a wedding. */
  blockFrom: string;
  blockTo: string;
}

export interface Contract {
  slug: string;
  /** The sole contracting party. Only this person signs. */
  signerName: string;
  /** Named for context only. Not a party, not required, never signs. */
  partnerName: string;
  title: string;
  eyebrow: string;
  /** Shown in emails and admin in place of a package name. */
  bookingTitle: string;
  images: string[];
  imageCaption: string;
  days: ContractDay[];
  priceRows: PriceRow[];
  standardTotalPence: number;
  /** Charged in full, in one payment. There is no deposit and no balance. */
  agreedTotalPence: number;
  /** What day one would have cost, waived entirely. */
  dayOneWaivedPence: number;
  acknowledgements: { id: string; label: string }[];
  terms: { heading: string; body: string }[];
  included: string[];
  excluded: string[];
}

const DIVINE_BOLU: Contract = {
  slug: 'divine-bolu',
  signerName: 'Divine Ayerume',
  partnerName: 'Bolu',
  title: 'Divine & Bolu',
  eyebrow: 'Private contract',
  bookingTitle: 'Wedding Coverage, Divine & Bolu',
  images: [
    '/assets/img/quotes/divine-bolu/divine-bolu-01.jpg',
    '/assets/img/quotes/divine-bolu/divine-bolu-02.jpg',
    '/assets/img/quotes/divine-bolu/divine-bolu-03.jpg',
    '/assets/img/quotes/divine-bolu/divine-bolu-04.jpg',
  ],
  imageCaption: 'Divine & Bolu, pre-wedding session at CHACE STUDIOS',

  days: [
    {
      date: '2026-08-17',
      heading: 'Traditional Wedding',
      items: [
        'Studio session at CHACE STUDIOS following your makeup session. One outfit, one look, a small set of images of the two of you before the day begins',
        'Coverage at the traditional wedding venue, approximately 5 hours',
        'Timings may shift slightly on the day and we will adapt with you',
      ],
      blockFrom: '09:00',
      blockTo: '23:59',
    },
    {
      date: '2026-08-18',
      heading: 'White Wedding',
      items: [
        'Couple portrait session at the venue before guests arrive',
        'Church ceremony coverage',
        'Reception coverage back at the venue',
        'Nine hours of coverage, photographed to follow the order of proceedings',
      ],
      blockFrom: '09:00',
      blockTo: '23:59',
    },
  ],

  priceRows: [
    { label: 'Day one, studio session, one look', pence: 20000 },
    { label: 'Day one, venue coverage, 5 hours', pence: 67500, note: 'event rate, 10% multi-hour discount applied' },
    { label: 'Day two, wedding coverage, 9 hours', pence: 229500, note: '£300/hour, 15% multi-hour discount applied' },
  ],
  standardTotalPence: 317000,
  agreedTotalPence: 50000,
  dayOneWaivedPence: 87500,

  acknowledgements: [
    { id: 'ack_read', label: 'I have read this agreement in full and I understand what is included and what is not.' },
    { id: 'ack_photo_only', label: 'I understand this agreement covers <strong>photography only</strong>, and does not include video.' },
    { id: 'ack_delivery', label: 'I understand delivery is by <strong>online gallery link only</strong>, with no printed items, albums, frames, USB drives or other devices included.' },
    { id: 'ack_focus', label: 'I understand the focus is on the couple and the order of proceedings, and that some moments, including the arrival of unfamiliar guests, may not be captured.' },
    { id: 'ack_logistics', label: 'I understand that <strong>moving the photography team, lighting and equipment between locations on both days is my responsibility</strong>.' },
    { id: 'ack_confidential', label: 'I understand the agreed rate is <strong>confidential</strong> and specific to this booking.' },
    { id: 'ack_terms', label: 'I agree to the terms and conditions set out above.' },
  ],

  terms: [
    { heading: 'Coverage focus', body: 'Photography will concentrate on the couple and on the order of proceedings. CHACE STUDIOS will make every reasonable effort to capture the wider event.' },
    { heading: 'Moments that may be missed', body: 'Because the primary focus is the bride and groom, some moments may not be captured, including the arrival of guests unknown to the photography team. This is accepted as a normal limitation of documentary wedding coverage and is not a failure of service.' },
    { heading: 'Logistics and movement', body: 'Transporting the photography team, lighting and equipment between locations on both days is the responsibility of the client. This includes movement between the studio, the ceremony venue, the church and the reception.' },
    { heading: 'Timings', body: 'Schedules given are approximate. Weddings run late. CHACE STUDIOS will remain flexible and adapt to the day as it unfolds. Significant overrun beyond the contracted hours may be chargeable and will be discussed at the time rather than added afterwards.' },
    { heading: 'Delivery', body: 'A private online gallery will be provided for selection. Final edited images are delivered 7 to 10 days after selection, with retouching completed within 4 to 6 working days of that selection.' },
    { heading: 'Creative approach', body: 'CHACE STUDIOS retains creative control over styling, framing and post-production, consistent with the work shown in the pre-wedding session.' },
    { heading: 'Payment', body: '£500 is payable in full at signing, as a single payment. This one payment covers both days. There is no deposit and no balance to follow.' },
    { heading: 'Cancellation', body: 'Payment secures both dates and is non-refundable, as those dates are then held exclusively and turned away from other clients.' },
    { heading: 'Confidentiality of rate', body: 'The rate in this agreement is private and specific to this booking.' },
    { heading: 'Use of images', body: 'CHACE STUDIOS may use selected images for portfolio and social media. If you would prefer otherwise, say so in the notes below and it will be honoured.' },
    { heading: 'Force majeure', body: 'In the event of illness, accident or circumstances genuinely beyond control, CHACE STUDIOS will arrange a suitably qualified replacement photographer or refund all monies paid.' },
  ],

  included: [
    'All coverage listed in the schedule above',
    'Professional editing and retouching of the selected images',
    'Delivery as a private online gallery link. Final retouched images shared via online drive',
  ],
  excluded: [
    'Video of any kind. This agreement covers photography only',
    'Printed deliverables. No albums, prints or photo frames',
    'Physical media. No USB drives, iPads or any device',
    'Any additional day, location or session not listed above',
  ],
};

export const CONTRACTS: Contract[] = [DIVINE_BOLU];

export function getContract(slug: string | null | undefined): Contract | undefined {
  if (!slug) return undefined;
  return CONTRACTS.find((c) => c.slug === slug);
}

/** Bookings created from a contract carry this slug; used for display only. */
export const CONTRACT_PACKAGE_SLUG = 'wedding-contract';

/** Lets admin and the booking emails name a contract booking properly. */
export function contractBookingTitle(packageSlug: string): string | undefined {
  if (packageSlug !== CONTRACT_PACKAGE_SLUG) return undefined;
  return 'Wedding Coverage';
}

export function discountPence(c: Contract): number {
  return c.standardTotalPence - c.agreedTotalPence;
}

export function money(pence: number): string {
  return pence % 100 === 0 ? `£${(pence / 100).toLocaleString('en-GB')}` : `£${(pence / 100).toFixed(2)}`;
}

/** Weekday and long date derived from the ISO date, never hand-typed. */
export function longDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
