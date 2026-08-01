import type { APIRoute } from 'astro';
import { query } from '../../../lib/db';
import { checkAdminAuth, unauthorized, isSameOrigin, forbidden } from '../../../lib/auth';
import { boardSlug, type BoardRow } from '../../../lib/boards';
import { siteUrl } from '../../../lib/env';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/** Boards with item counts and last activity. The full UI arrives in step 8. */
export const GET: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) return unauthorized();

  const { rows } = await query<BoardRow & { items: number }>(
    `SELECT b.*, (SELECT count(*)::int FROM board_items i WHERE i.board_id = b.id) AS items
       FROM boards b ORDER BY b.updated_at DESC LIMIT 100`
  );
  return json({
    boards: rows.map((b) => ({ ...b, link: `${siteUrl()}/board/${b.slug}` })),
  });
};

/** Create a board for a client and return its secret link. */
export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) return unauthorized();
  if (!isSameOrigin(request)) return forbidden();

  const form = await request.formData();
  const clientName = String(form.get('client_name') ?? '').trim();
  const title = String(form.get('title') ?? '').trim();
  if (!clientName) return json({ error: 'client_name is required' }, 400);

  const { rows } = await query<BoardRow>(
    `INSERT INTO boards (slug, client_name, title) VALUES ($1, $2, $3) RETURNING *`,
    [boardSlug(clientName), clientName.slice(0, 200), title ? title.slice(0, 300) : null]
  );

  return json({ board: rows[0], link: `${siteUrl()}/board/${rows[0].slug}` }, 201);
};
