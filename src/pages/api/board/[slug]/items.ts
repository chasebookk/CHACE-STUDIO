import type { APIRoute } from 'astro';
import { query } from '../../../../lib/db';
import { getBoard, getBoardItems, touchBoard, type BoardItemRow } from '../../../../lib/boards';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const KINDS = ['photo', 'note', 'ink', 'text'];

/** Everything currently on the board. Used on load and, later, for polling. */
export const GET: APIRoute = async ({ params }) => {
  const board = await getBoard(String(params.slug ?? ''));
  if (!board) return json({ error: 'Board not found' }, 404);
  return json({ items: await getBoardItems(board.id), updatedAt: board.updated_at });
};

/** Add an item where it was dropped. Nothing is snapped or normalised. */
export const POST: APIRoute = async ({ params, request }) => {
  const board = await getBoard(String(params.slug ?? ''));
  if (!board) return json({ error: 'Board not found' }, 404);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const kind = String(body.kind ?? '');
  if (!KINDS.includes(kind)) return json({ error: 'Unknown item kind' }, 400);

  const num = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);

  const { rows } = await query<BoardItemRow>(
    `INSERT INTO board_items (board_id, kind, x, y, rotation, scale, z, url, caption, colour, path, author)
     VALUES ($1,$2,$3,$4,$5,$6,
             COALESCE((SELECT max(z) + 1 FROM board_items WHERE board_id = $1), 1),
             $7,$8,$9,$10,$11)
     RETURNING *`,
    [
      board.id,
      kind,
      num(body.x),
      num(body.y),
      num(body.rotation),
      num(body.scale, 1),
      body.url ? String(body.url).slice(0, 2000) : null,
      body.caption != null ? String(body.caption).slice(0, 2000) : null,
      body.colour ? String(body.colour).slice(0, 32) : null,
      body.path ? String(body.path).slice(0, 100000) : null,
      body.author === 'studio' ? 'studio' : 'client',
    ]
  );

  await touchBoard(board.id);
  return json({ item: rows[0] }, 201);
};
