import type { APIRoute } from 'astro';
import { query } from '../../../../../lib/db';
import { getBoard, touchBoard, type BoardItemRow } from '../../../../../lib/boards';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/** Move, rotate, restack, recolour or recaption an item. */
export const PATCH: APIRoute = async ({ params, request }) => {
  const board = await getBoard(String(params.slug ?? ''));
  if (!board) return json({ error: 'Board not found' }, 404);
  const id = Number(params.id);
  if (!id) return json({ error: 'Invalid id' }, 400);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  // Only these may be changed, and only on an item belonging to this board.
  const numeric = ['x', 'y', 'rotation', 'scale', 'z'];
  const textual = ['caption', 'colour', 'path', 'url'];
  const sets: string[] = [];
  const values: unknown[] = [board.id, id];

  for (const key of numeric) {
    if (body[key] !== undefined && Number.isFinite(Number(body[key]))) {
      values.push(Number(body[key]));
      sets.push(`${key} = $${values.length}`);
    }
  }
  for (const key of textual) {
    if (body[key] !== undefined) {
      values.push(body[key] === null ? null : String(body[key]).slice(0, 100000));
      sets.push(`${key} = $${values.length}`);
    }
  }
  if (sets.length === 0) return json({ error: 'Nothing to update' }, 400);

  const { rows } = await query<BoardItemRow>(
    `UPDATE board_items SET ${sets.join(', ')}, updated_at = now()
      WHERE board_id = $1 AND id = $2 RETURNING *`,
    values
  );
  if (!rows[0]) return json({ error: 'Item not found' }, 404);

  await touchBoard(board.id);
  return json({ item: rows[0] });
};

export const DELETE: APIRoute = async ({ params }) => {
  const board = await getBoard(String(params.slug ?? ''));
  if (!board) return json({ error: 'Board not found' }, 404);
  const id = Number(params.id);
  if (!id) return json({ error: 'Invalid id' }, 400);

  const { rowCount } = await query(`DELETE FROM board_items WHERE board_id = $1 AND id = $2`, [
    board.id,
    id,
  ]);
  if (!rowCount) return json({ error: 'Item not found' }, 404);

  await touchBoard(board.id);
  return json({ ok: true });
};
