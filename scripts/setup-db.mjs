// One-time database setup / migration. Run: node scripts/setup-db.mjs
// Reads DATABASE_URL from .env (or the environment). Safe to re-run.
// The SQL lives in db/schema.sql so the deployed migration endpoint
// (/api/admin/migrate) applies exactly the same statements.
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

const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');

const pool = new pg.Pool({
  connectionString: url,
  ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false },
});

try {
  await pool.query(schema);
  const { rows } = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name IN ('bookings', 'blocked_slots')`
  );
  const { rows: cols } = await pool.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_name = 'bookings' AND column_name = 'studio_id'`
  );
  console.log('✓ Database ready. Tables:', rows.map((r) => r.table_name).join(', '));
  console.log('  studio_id column:', cols.length ? 'present' : 'MISSING');
} catch (err) {
  console.error('Database setup failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}
