// Regenerates the favicon / app icons from the master emblem.
// Run with: node scripts/make-icons.mjs
import sharp from 'sharp';

const SRC = 'public/assets/og/emblem.png';
const INK = { r: 10, g: 10, b: 10, alpha: 1 }; // --ink, the same plate the site header sits on

/**
 * The emblem is a white mark on transparency, so it needs a dark plate or it
 * vanishes against light browser chrome and iOS' black home-screen composite.
 * `inset` leaves room for the rounded corners iOS applies; `passes` re-composites
 * the mark to stop hairline strokes anti-aliasing away to grey at small sizes.
 */
async function icon(size, out, inset, passes = 1) {
  const mark = await sharp(SRC)
    .trim()
    .resize(Math.round(size * inset), Math.round(size * inset), {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({ create: { width: size, height: size, channels: 4, background: INK } })
    .composite(Array.from({ length: passes }, () => ({ input: mark, gravity: 'centre' })))
    .png({ compressionLevel: 9 })
    .toFile(out);

  const buf = await sharp(out).toBuffer();
  console.log(`  ${out.padEnd(30)} ${size}x${size}  ${(buf.length / 1024).toFixed(1)} KB`);
}

await icon(32, 'public/icon-32.png', 0.94, 2);
await icon(192, 'public/icon-192.png', 0.9);
await icon(512, 'public/icon-512.png', 0.86);
await icon(180, 'public/apple-touch-icon.png', 0.78);
