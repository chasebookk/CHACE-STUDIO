/**
 * Which Open Graph image belongs to a given page.
 *
 * Vite resolves this glob at build time, so the list of available images is
 * baked into the bundle as a plain array of paths. Nothing touches the
 * filesystem at request time, which matters because public/ is served by the
 * CDN and does not exist on the serverless function's disk.
 */
const AVAILABLE = new Set(
  Object.keys(import.meta.glob('/public/assets/og/*.jpg')).map((p) =>
    p.slice(p.lastIndexOf('/') + 1, -'.jpg'.length)
  )
);

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/**
 * Names are only ever emitted after an allowlist check, so a hand-crafted
 * slug like `../../secret` can never escape the directory.
 */
function named(name: string): string {
  return `/assets/og/${AVAILABLE.has(name) ? name : 'default'}.jpg`;
}

/**
 * A new package needs no wiring: add /assets/og/<slug>.jpg and its booking
 * page picks the image up. Until that file exists it shows default.jpg.
 */
export function ogImageFor(pathname: string): string {
  const [section, rest] = pathname.replace(/^\/+|\/+$/g, '').split('/');

  if (section === 'book' && rest) return named(decodeURIComponent(rest));
  if (section === 'board') return named('moodboard');
  if (section === 'quote') return named('quote');
  return named('default');
}

/** Every og image is a .jpg today, but the prop lets a page pass anything. */
export function mimeFor(path: string): string {
  return path.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
}
