import type { APIRoute } from 'astro';
// Bundled at build time so the deployed function carries the same SQL that
// scripts/setup-db.mjs runs locally.
import schema from '../../../../db/schema.sql?raw';
import { query } from '../../../lib/db';
import { checkAdminAuth, unauthorized, isSameOrigin, forbidden } from '../../../lib/auth';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * Applies db/schema.sql to whichever database this deployment is configured
 * with. Idempotent — every statement is CREATE/ALTER ... IF NOT EXISTS — so
 * it is safe to re-run, and it never drops or rewrites existing data.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) return unauthorized();
  if (!isSameOrigin(request)) return forbidden();

  try {
    await query(schema);

    const tables = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`
    );
    const columns = await query<{ column_name: string }>(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'bookings' ORDER BY ordinal_position`
    );
    const counts = await query<{ bookings: number; blocked: number }>(
      `SELECT (SELECT count(*) FROM bookings)::int AS bookings,
              (SELECT count(*) FROM blocked_slots)::int AS blocked`
    );

    const indexes = await query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' ORDER BY indexname`
    );

    return json({
      ok: true,
      tables: tables.rows.map((r) => r.table_name),
      uniqueGuards: indexes.rows
        .map((r) => r.indexname)
        .filter((n) => n.includes('stripe_session') || n.includes('processed_events_session')),
      bookingColumns: columns.rows.map((r) => r.column_name),
      hasStudioId: columns.rows.some((r) => r.column_name === 'studio_id'),
      rowCounts: counts.rows[0],
    });
  } catch (err) {
    console.error('[migrate] failed:', err);
    return json({ ok: false, error: err instanceof Error ? err.message : String(err) }, 500);
  }
};
