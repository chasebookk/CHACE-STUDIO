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

-- ---- Shared moodboards ----
-- One board per client, reached only by its unguessable slug.
CREATE TABLE IF NOT EXISTS boards (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Everything on a board: photos, notes, text, ink. Position is free form,
-- nothing snaps, so x/y/rotation/scale are stored exactly as dropped.
CREATE TABLE IF NOT EXISTS board_items (
  id SERIAL PRIMARY KEY,
  board_id INT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  x REAL NOT NULL, y REAL NOT NULL,
  rotation REAL DEFAULT 0,
  scale REAL DEFAULT 1,
  z INT DEFAULT 0,
  url TEXT,
  caption TEXT,
  colour TEXT,
  path TEXT,
  author TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS board_items_board_idx ON board_items (board_id);

-- ---- Youth Training Programme, parental consent ----
-- Both students are minors, so this doubles as the safeguarding record.
-- Treat as append-only: never delete a row, never rewrite a signature.
-- Each optional consent is its own column so a parent can agree to one and
-- decline another, and so "who has consented to travel" is a simple query.
CREATE TABLE IF NOT EXISTS training_consents (
  id SERIAL PRIMARY KEY,

  student_name TEXT NOT NULL,
  student_dob DATE NOT NULL,
  student_school TEXT,
  medical_notes TEXT,

  parent_name TEXT NOT NULL,
  parent_relationship TEXT NOT NULL,
  parent_phone TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  parent_address TEXT NOT NULL,

  emergency_name TEXT NOT NULL,
  emergency_relationship TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,

  travel_arrangement TEXT NOT NULL,
  travel_other TEXT,

  -- Required declarations. The API refuses the submission unless all are true.
  consent_guardian BOOLEAN NOT NULL DEFAULT false,
  consent_participation BOOLEAN NOT NULL DEFAULT false,
  consent_unpaid BOOLEAN NOT NULL DEFAULT false,
  consent_equipment BOOLEAN NOT NULL DEFAULT false,
  consent_details_accurate BOOLEAN NOT NULL DEFAULT false,
  consent_withdraw BOOLEAN NOT NULL DEFAULT false,

  -- Optional, independently recorded.
  consent_travel BOOLEAN NOT NULL DEFAULT false,
  consent_filming BOOLEAN NOT NULL DEFAULT false,
  consent_sharing BOOLEAN NOT NULL DEFAULT false,

  signature_name TEXT NOT NULL,
  signed_date DATE NOT NULL,
  ip TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS training_consents_created_idx ON training_consents (created_at DESC);

-- ---- Private client contracts ----
-- A signed agreement, saved before payment is attempted so a signature is
-- never lost to a Stripe or network failure. Append-only: never rewrite a
-- signed row. `booking_ids` links to the bookings created once paid.
CREATE TABLE IF NOT EXISTS contracts (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL,
  ref TEXT UNIQUE NOT NULL,

  signer_name TEXT NOT NULL,
  partner_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  venue_day1 TEXT NOT NULL,
  venue_day2 TEXT NOT NULL,
  notes TEXT,

  -- Every acknowledgement box, stored as given rather than as one flag, so
  -- the signed record shows exactly what was agreed to.
  acknowledgements JSONB NOT NULL,

  signature_name TEXT NOT NULL,
  signed_date DATE NOT NULL,
  ip TEXT,

  total_pence INT NOT NULL,
  -- This contract is paid in full in one payment, so deposit_pence carries the
  -- whole amount and balance_pence is 0. The columns are kept general in case a
  -- future contract does split its payment.
  deposit_pence INT NOT NULL,
  balance_pence INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'signed',
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  booking_ids INT[],
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS contracts_slug_idx ON contracts (slug);
CREATE UNIQUE INDEX IF NOT EXISTS contracts_stripe_session_idx
  ON contracts (stripe_session_id) WHERE stripe_session_id IS NOT NULL;
