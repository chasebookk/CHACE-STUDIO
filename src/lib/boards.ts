import { query } from './db';

export interface BoardRow {
  id: number;
  slug: string;
  client_name: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface BoardItemRow {
  id: number;
  board_id: number;
  kind: 'photo' | 'note' | 'ink' | 'text';
  x: number;
  y: number;
  rotation: number;
  scale: number;
  z: number;
  url: string | null;
  caption: string | null;
  colour: string | null;
  path: string | null;
  author: string | null;
  created_at: string;
  updated_at: string;
}

/** Unguessable board slug, e.g. divine-7f3a9c. The link is the security. */
export function boardSlug(clientName: string): string {
  const base =
    clientName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24) || 'board';
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${base}-${suffix}`;
}

export async function getBoard(slug: string): Promise<BoardRow | undefined> {
  const { rows } = await query<BoardRow>(`SELECT * FROM boards WHERE slug = $1`, [slug]);
  return rows[0];
}

export async function getBoardItems(boardId: number): Promise<BoardItemRow[]> {
  const { rows } = await query<BoardItemRow>(
    `SELECT * FROM board_items WHERE board_id = $1 ORDER BY z ASC, id ASC`,
    [boardId]
  );
  return rows;
}

export async function touchBoard(boardId: number): Promise<void> {
  await query(`UPDATE boards SET updated_at = now() WHERE id = $1`, [boardId]);
}
