import type { APIRoute } from 'astro';
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { getBoard } from '../../../lib/boards';
import { env } from '../../../lib/env';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Issues a short-lived client token so the browser uploads straight to Vercel
 * Blob. The file never passes through this function, which keeps large photos
 * off the serverless request path.
 *
 * Holding the board link is what authorises an upload, exactly as it
 * authorises every other edit.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!env('BLOB_READ_WRITE_TOKEN')) {
    return json(
      { error: 'Uploads are not configured yet. BLOB_READ_WRITE_TOKEN is missing.' },
      503
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  try {
    const result = await handleUpload({
      body,
      request,
      token: env('BLOB_READ_WRITE_TOKEN'),
      onBeforeGenerateToken: async (_pathname, clientPayload) => {
        const slug = typeof clientPayload === 'string' ? clientPayload : '';
        const board = await getBoard(slug);
        if (!board) throw new Error('Unknown board');
        return {
          allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
          maximumSizeInBytes: 15 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ boardId: board.id }),
        };
      },
      onUploadCompleted: async () => {
        // The item row is created by the client once it has the blob URL.
      },
    });
    return json(result);
  } catch (err) {
    console.error('[blob] upload token failed:', err);
    return json({ error: err instanceof Error ? err.message : 'Upload failed' }, 400);
  }
};
