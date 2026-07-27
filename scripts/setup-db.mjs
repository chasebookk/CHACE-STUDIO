// One-time database setup. Run: node scripts/setup-db.mjs
// Reads DATABASE_URL from .env (or the environment). Safe to re-run.
import { readFileSync } from 'node:fs';
import pg from 'pg';

function loadDotEnv() {
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch {
    /* no .env — rely on environment */
  }
}

loadDotEnv();

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Put it in .env first (see .env.example).');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false },
});

const schema = `
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  ref TEXT UNIQUE NOT NULL,
  package_slug TEXT NOT NULL,
  tier_label TEXT NOT NULL,
  total_pence INT NOT NULL,
  paid_pence INT NOT NULL DEFAULT 0,
  balance_pence INT NOT NULL DEFAULT 0,
  promo_code TEXT,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
  location_type TEXT NOT NULL,
  address TEXT, notes TEXT,
  date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
  status TEXT NOT NULL,
  stripe_session_id TEXT, stripe_payment_intent TEXT,
  balance_session_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS blocked_slots (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL, start_time TIME, end_time TIME,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS bookings_date_idx ON bookings (date);
CREATE INDEX IF NOT EXISTS bookings_status_idx ON bookings (status);
CREATE INDEX IF NOT EXISTS blocked_slots_date_idx ON blocked_slots (date);
`;

try {
  await pool.query(schema);
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('bookings', 'blocked_slots')`
  );
  console.log('✓ Database ready. Tables:', rows.map((r) => r.table_name).join(', '));
} catch (err) {
  console.error('Database setup failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
