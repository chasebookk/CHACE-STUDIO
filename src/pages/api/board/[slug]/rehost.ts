import type { APIRoute } from 'astro';
import { put } from '@vercel/blob';
import { getBoard } from '../../../../lib/boards';
import { env } from '../../../../lib/env';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const ALLOWED_HOSTS = ['images.unsplash.com', 'images.pexels.com', 'pixabay.com', 'cdn.pixabay.com'];

/**
 * Copy an external stock image into our own Blob store.
 *
 * A board that pointed at someone else's CDN would break the day that URL
 * rotated, so anything dragged in from a stock provider is re-hosted before
 * it becomes a board item.
 */
export const POST: APIRoute = async ({ params, request }) => {
  const board = await getBoard(String(params.slug ?? ''));
  if (!board) return json({ error: 'Board not found' }, 404);
  if (!env('BLOB_READ_WRITE_TOKEN')) return json({ error: 'Uploads are not configured' }, 503);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  let source: URL;
  try {
    source = new URL(String(body.url ?? ''));
  } catch {
    return json({ error: 'Invalid url' }, 400);
  }
  // Only fetch from providers we actually offer, so this cannot be used as an
  // open proxy for arbitrary URLs.
  if (source.protocol !== 'https:' || !ALLOWED_HOSTS.includes(source.hostname)) {
    return json({ error: 'Unsupported image host' }, 400);
  }

  try {
    const res = await fetch(source, { headers: { Accept: 'image/*' } });
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const type = res.headers.get('content-type') ?? 'image/jpeg';
    if (!type.startsWith('image/')) throw new Error('not an image');

    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > 15 * 1024 * 1024) return json({ error: 'Image is too large' }, 413);

    const blob = await put(`boards/${board.slug}/stock-${Date.now()}.jpg`, bytes, {
      access: 'public',
      contentType: type,
      addRandomSuffix: true,
      token: env('BLOB_READ_WRITE_TOKEN'),
    });

    return json({ url: blob.url });
  } catch (err) {
    console.error('[rehost] failed:', err);
    return json({ error: 'Could not save that image' }, 502);
  }
};
