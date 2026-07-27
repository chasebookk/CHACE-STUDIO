-- Single source of truth for the booking schema.
-- Idempotent: safe to run repeatedly against any environment.
-- Used by scripts/setup-db.mjs (local) and /api/admin/migrate (deployed).

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

-- Migrations (idempotent; safe on databases created before these columns).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS studio_id TEXT;
