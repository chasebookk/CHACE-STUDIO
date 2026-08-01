import type { APIRoute } from 'astro';
import { del } from '@vercel/blob';
import { query } from '../../../../lib/db';
import { checkAdminAuth, unauthorized, isSameOrigin, forbidden } from '../../../../lib/auth';
import { env } from '../../../../lib/env';

export const prerender = false;

/**
 * Delete a board. Items go with it through the foreign key, and any images
 * we uploaded for it are removed from Blob so nothing is left paid for and
 * orphaned. Portfolio frames are referenced by path, not stored per board,
 * so they are left alone.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) return unauthorized();
  if (!isSameOrigin(request)) return forbidden();

  const form = await request.formData();
  const id = Number(form.get('id'));
  if (!id) return new Response('Missing id', { status: 400 });

  const { rows } = await query<{ url: string | null }>(
    `SELECT url FROM board_items WHERE board_id = $1 AND url LIKE 'https://%blob.vercel-storage.com/%'`,
    [id]
  );

  if (rows.length && env('BLOB_READ_WRITE_TOKEN')) {
    try {
      await del(
        rows.map((r) => r.url!),
        { token: env('BLOB_READ_WRITE_TOKEN') }
      );
    } catch (err) {
      // A stale blob is untidy, not a reason to keep a board the studio
      // has asked to remove.
      console.error('[boards] blob cleanup failed, deleting board anyway:', err);
    }
  }

  await query(`DELETE FROM boards WHERE id = $1`, [id]);
  return new Response(null, { status: 303, headers: { Location: '/admin/boards' } });
};
