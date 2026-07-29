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

-- Webhook idempotency: one row per Stripe event we have already handled.
-- The webhook inserts here first with ON CONFLICT DO NOTHING, so a retried
-- or replayed event is recognised and skipped before any money is touched.
CREATE TABLE IF NOT EXISTS processed_events (
  event_id TEXT PRIMARY KEY,
  session_id TEXT,
  booking_id INT,
  kind TEXT,
  amount_pence INT NOT NULL DEFAULT 0,
  processed_at TIMESTAMPTZ DEFAULT now()
);

-- Rename for databases created before processed_at was settled on.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'processed_events' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE processed_events RENAME COLUMN created_at TO processed_at;
  END IF;
END $$;

-- A checkout session can only ever be completed once, so guard on it too in
-- case Stripe ever delivers the same completion under a new event id.
CREATE UNIQUE INDEX IF NOT EXISTS processed_events_session_idx
  ON processed_events (session_id) WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS processed_events_booking_idx ON processed_events (booking_id);

-- One booking per Stripe checkout session.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_stripe_session_idx
  ON bookings (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Per-IP checkout throttling. Rows are pruned as they are checked.
CREATE TABLE IF NOT EXISTS checkout_attempts (
  id SERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkout_attempts_ip_idx ON checkout_attempts (ip, created_at);
