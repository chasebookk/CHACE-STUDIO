import pg from 'pg';
import { requireEnv } from './env';

// Return DATE columns as plain 'YYYY-MM-DD' strings, not JS Date objects —
// avoids timezone drift and keeps availability maths string-based. (OID 1082)
pg.types.setTypeParser(1082, (v) => v);

let pool: pg.Pool | undefined;

export function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: requireEnv('DATABASE_URL'),
      max: 3, // serverless-friendly
      ssl: requireEnv('DATABASE_URL').includes('localhost') ? undefined : { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/** Lazily expire stale holds so their slots free up. */
export async function expireStaleHolds(): Promise<void> {
  await query(
    `UPDATE bookings SET status = 'expired'
     WHERE status = 'pending_payment' AND expires_at < now()`
  );
}

export interface BookingRow {
  id: number;
  ref: string;
  package_slug: string;
  tier_label: string;
  total_pence: number;
  paid_pence: number;
  balance_pence: number;
  promo_code: string | null;
  name: string;
  email: string;
  phone: string | null;
  location_type: string;
  address: string | null;
  notes: string | null;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  stripe_session_id: string | null;
  stripe_payment_intent: string | null;
  balance_session_url: string | null;
  created_at: string;
  expires_at: string | null;
}
