// Image manifest for public/assets/img/portfolio/{category}/{category}-NN.jpg
// Counts match the processed folders on disk — update when images are added.

const COUNTS: Record<string, number> = {
  portraits: 25,
  headshots: 16,
  events: 20,
  'bridal-shower': 9,
  weddings: 6,
  'pre-wedding': 3,
  family: 5,
  'baby-shoots': 6,
  graduation: 22,
  fashion: 9,
};

export function images(category: string, limit?: number): string[] {
  const count = COUNTS[category];
  if (!count) throw new Error(`Unknown portfolio category: ${category}`);
  const n = limit ? Math.min(limit, count) : count;
  return Array.from(
    { length: n },
    (_, i) => `/assets/img/portfolio/${category}/${category}-${String(i + 1).padStart(2, '0')}.jpg`
  );
}

export const EMAIL = 'bookings@chace.studio';
export const INSTAGRAM = 'https://instagram.com/chacestudios';
export const ADDRESS = '5 Pocklingtons Walk, Leicester LE1 6BT, UK';
export const MAPS_URL =
  'https://www.google.com/maps/search/?api=1&query=5+Pocklingtons+Walk+Leicester+LE1+6BT';
