// Display copy for the rate cards — mirrors PACKAGES.md (authoritative).
// `slug` matches src/config/booking.ts so /packages, /book/[slug] and the
// booking widget all speak the same identifiers.
import { EMAIL } from './portfolio';

export interface CardPrice {
  amount: string;
  label: string;
}

export interface PackageCard {
  slug: string;
  title: string;
  image: string;
  tagline: string;
  prices: CardPrice[];
  bullets: string[];
  /** Enquiry-only packages are never bookable online and get no /book page. */
  enquiryOnly?: boolean;
  ctaLabel?: string;
  ctaHref?: string;
}

export interface PackageGroup {
  label: string;
  id: string;
  cards: PackageCard[];
}

export const GROUPS: PackageGroup[] = [
  {
    label: 'Portraits & People',
    id: 'portraits-people',
    cards: [
      {
        slug: 'individual-portrait',
        title: 'Individual Portrait',
        image: '/assets/img/pricing/individual-portrait.jpg',
        tagline:
          'Studio portraits built around you. Lighting, direction and retouching that make a single frame do the work of a hundred.',
        prices: [
          { amount: '£170', label: '1 look · 4 edited pictures' },
          { amount: '£300', label: '2 looks · 8 edited pictures' },
        ],
        bullets: [
          "Guided posing — you don't need to know what to do with your hands",
          'Private online gallery to choose your favourites',
          'Further discount considered on multiple looks',
          'Low-resolution unedited images available on request',
        ],
      },
      {
        slug: 'corporate-headshots',
        title: 'Professional Corporate Headshots',
        image: '/assets/img/pricing/corporate-headshots.jpg',
        tagline:
          'Headshots that hold up on LinkedIn, a company website and a conference banner. Clean, consistent, and shot to a brief — so an entire team matches.',
        prices: [
          { amount: '£150', label: '1 look · 4 retouched pictures' },
          { amount: '£300', label: '2 looks · 8 retouched pictures' },
        ],
        bullets: [
          'Wardrobe and background guidance before the session',
          'Natural retouching — polished, still recognisably you',
          'Delivered in web and print-ready crops',
          'Ideal for founders, consultants, estate agents, legal and medical practices',
        ],
      },
      {
        slug: 'maternity',
        title: 'Maternity Shoot',
        image: '/assets/img/pricing/maternity.jpg',
        tagline: 'A quiet, beautifully lit record of the weeks before everything changes.',
        prices: [
          { amount: '£170', label: 'single · 1 look · 4 edited images' },
          { amount: '£200', label: 'couple · 1 look · 6 edited images' },
        ],
        bullets: [
          "Relaxed pace — we work around how you're feeling on the day",
          'Low-resolution unedited images available on request',
        ],
      },
      {
        slug: 'baby-shoot',
        title: 'Baby Shoot · Ages 1–10',
        image: '/assets/img/pricing/baby-shoot.jpg',
        tagline: "Patient, playful sessions for little ones. We work at their pace, not the clock's.",
        prices: [
          { amount: '£150', label: '1 look · 4 edited images' },
          { amount: '£250', label: '2 looks · 8 edited images' },
        ],
        bullets: [
          "Bring snacks and a spare outfit — we'll handle the rest",
          'Discount on multiple looks',
          'Low-resolution unedited images available on request',
        ],
      },
      {
        slug: 'family-shoot',
        title: 'Family Shoot',
        image: '/assets/img/pricing/family.jpg',
        tagline: 'Everyone in one frame, properly lit. The picture that actually ends up on the wall.',
        prices: [
          { amount: '£250', label: 'per look · family of 4 · 8 pictures per look' },
          { amount: '+£20', label: 'per additional person' },
        ],
        bullets: [
          'Coordinated group and individual frames in the same session',
          'Works for milestone birthdays, anniversaries and reunions',
          'Discount considered on multiple looks',
        ],
      },
    ],
  },
  {
    label: 'Weddings & Events',
    id: 'weddings-events',
    cards: [
      {
        slug: 'pre-wedding-engagement',
        title: 'Pre-Wedding & Engagement',
        image: '/assets/img/pricing/pre-wedding-engagement.jpg',
        tagline: 'Your story before the day itself — styled, directed, and shot in studio or on location.',
        prices: [
          { amount: '£200', label: '1 look · 7 images per look' },
          { amount: '£400', label: '2 looks' },
          { amount: '£500', label: '3 looks' },
        ],
        bullets: [
          'Location scouting and outfit guidance included in planning',
          'Low-resolution unedited images available on request',
        ],
      },
      {
        slug: 'civil-wedding',
        title: 'Civil Wedding',
        image: '/assets/img/pricing/civil-wedding.jpg',
        tagline: 'Full coverage of the ceremony and the moments either side of it.',
        prices: [{ amount: 'From £300', label: '1 hour · within London' }],
        bullets: [
          '10 retouched portraits of the couple, plus all edited images',
          'Ceremony, signing, confetti and group frames',
          'Additional hours available — arranged in advance',
          'Off-site and outside-London coverage quoted on request',
        ],
      },
      {
        slug: 'event-shoot',
        title: 'Event Shoot',
        image: '/assets/img/pricing/events.jpg',
        tagline: 'Naming ceremonies, birthdays, corporate events — covered end to end, delivered fast.',
        prices: [{ amount: 'From £300', label: '2 hours · within London' }],
        bullets: [
          'Includes but not limited to naming ceremonies, birthday parties and corporate events',
          'Candid coverage plus set-piece group portraits',
          'Delivered via a custom web gallery — shareable with every guest',
          'Frames and USB delivery available',
          'Further discount considered on multiple hours',
        ],
      },
    ],
  },
  {
    label: 'Studio & Production',
    id: 'studio-production',
    cards: [
      {
        slug: 'studio-hire',
        title: 'Studio Hire',
        image: '/assets/img/pricing/studio-hire.jpg',
        tagline: 'Our Leicester studio, yours by the hour. Lighting and backdrops set up and ready to shoot.',
        prices: [
          { amount: '£35', label: '1 hour' },
          { amount: '£60', label: '2 hours' },
        ],
        bullets: [
          'Professional lighting, backdrops and shooting space',
          'Suitable for photographers, content creators and brands',
          '5 Pocklingtons Walk, Leicester LE1 6BT',
          'Longer bookings and regular-user rates available on request',
        ],
      },
      {
        slug: 'podcast',
        title: 'Podcast & Live Broadcast Production',
        image: '/assets/img/pricing/podcast-live-broadcast.jpg',
        tagline:
          'Multi-cam podcast and live broadcast production in a room built for it. Turn up, talk, walk out with the episode.',
        prices: [
          { amount: '£200', label: '1-hour session · 1–3 speakers' },
          { amount: '£150', label: 'per episode · continuous/recurring package' },
        ],
        bullets: [
          'Multi-camera capture and professional microphones',
          'Multi-track audio recorded and mixed',
          'Live streaming setup available',
          'Recurring package keeps your release schedule consistent',
          'Please note: we are not responsible for designing your assets such as intro cards and display graphics',
        ],
      },
      {
        slug: 'fashion-brand',
        title: 'Fashion & Brand Campaigns',
        image: '/assets/img/pricing/fashion-brand.jpg',
        tagline: 'Campaign work, priced around your brief.',
        prices: [{ amount: 'POA', label: 'price on request' }],
        bullets: [
          'Arranged on timing, number of outfits, models and creative direction',
          'Lookbooks, product campaigns, brand launches and editorial',
          'Studio or location, crew scaled to the shoot',
        ],
        enquiryOnly: true,
        ctaLabel: 'Discuss your campaign',
        ctaHref: `mailto:${EMAIL}?subject=Campaign%20enquiry`,
      },
    ],
  },
];

export const ALL_CARDS: PackageCard[] = GROUPS.flatMap((g) => g.cards);

export function getCard(slug: string): PackageCard | undefined {
  return ALL_CARDS.find((c) => c.slug === slug);
}

export const INCLUDED = [
  'Private online gallery to select your images',
  'Professional retouching on every selected image',
  'Digital delivery via Google Drive or WhatsApp (events: custom web gallery, frames or USB)',
  'Edits delivered within 4–6 working days of your selection',
  'Full delivery 7–10 days after selection',
  'Photobooks available on request',
];

export const ADDONS = [
  'Express delivery — 24-hour turnaround £50 · 48-hour £35',
  'Extra edited image — £20 each',
  'Additional person in frame — £40 (includes one extra edited image)',
  'Outdoor / location shoots — £45 logistics fee',
  'Midnight sessions (from 10:00 PM) — £35',
  'Low-resolution unedited images available on request',
  'Booking: full payment secures a single-outfit session; multi-outfit bookings need an 80% deposit, balance due immediately after the shoot',
  'All appointments run to time slots — lateness may attract extra charges. Extra hours are payable immediately.',
  'Studio rental fees are payable by the client · No refunds',
];
