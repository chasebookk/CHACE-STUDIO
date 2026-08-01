import type { APIRoute } from 'astro';
import { query } from '../../../../lib/db';
import { checkAdminAuth, unauthorized, isSameOrigin, forbidden } from '../../../../lib/auth';
import { boardSlug, type BoardRow } from '../../../../lib/boards';

export const prerender = false;

/**
 * Create a board and go straight back to the list. Optionally pre-titled from
 * a booking, which is what the Moodboard button on a booking row uses.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) return unauthorized();
  if (!isSameOrigin(request)) return forbidden();

  const form = await request.formData();
  const clientName = String(form.get('client_name') ?? '').trim();
  const title = String(form.get('title') ?? '').trim();
  if (!clientName) return new Response('client_name is required', { status: 400 });

  const { rows } = await query<BoardRow>(
    `INSERT INTO boards (slug, client_name, title) VALUES ($1, $2, $3) RETURNING *`,
    [boardSlug(clientName), clientName.slice(0, 200), title ? title.slice(0, 300) : null]
  );

  // Land on the list with this board flagged, so its link can be copied.
  return new Response(null, {
    status: 303,
    headers: { Location: `/admin/boards?new=${encodeURIComponent(rows[0].slug)}` },
  });
};
