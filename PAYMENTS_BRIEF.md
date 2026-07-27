# CHACE STUDIOS — Booking Calendar + Payments Architecture
*Authoritative spec for the booking/payment build. Read fully before coding. Works with PACKAGES.md (prices/copy) and REDESIGN_BRIEF.md (design). Where they conflict on booking/payment behaviour, THIS file wins.*

## What we're building (the customer's experience)
1. Client picks a package → picks an **available date & time** from a real calendar (unavailable slots not shown).
2. Enters name, email, phone, location details → clicks **Confirm & Pay**. Their slot is **held for 30 minutes**.
3. They land on **one Stripe Checkout page** offering: card, **Apple Pay, Google Pay, Klarna, PayPal, Pay by Bank** (UK open-banking transfer), Revolut Pay + Link. Stripe shows each customer the most relevant methods automatically. A **promo code box** is on this page.
4. On payment: booking confirmed, slot locked, confirmation screen with booking reference + what happens next, Stripe emails a receipt.
5. Deposit bookings: the **20% balance** is collected later via a payment link generated from the admin page (same payment methods).

## Payment rules (from CHACE T&Cs — encode exactly)
| Booking | Charged at booking | Balance |
|---|---|---|
| Any **1-look** session (Individual Portrait £170, Corporate Headshots £150, Maternity single £170 / couple £200, Baby 1 look £150, Family £250/look) | **100%** | none |
| Any **multi-look** tier (Portrait 2 looks £300, Headshots 2 looks £300, Baby 2 looks £250, Pre-Wedding & Engagement £400/£500) | **80% deposit** | 20% due on/after session |
| **Event Shoot** (from £300 / 2hrs) and **Civil Wedding** (from £300 / 1hr) | **80% deposit** | 20% due on/after session |
| **Studio Hire** (£35/1hr, £60/2hrs) and **Podcast single session** (£200) | **100%** | none |
| Podcast continuous package (£150/ep) and **Fashion & Brand Campaigns** | No online checkout — "Enquire" → bookings@chace.studio | — |

Session durations for the calendar: portraits/headshots/maternity/baby/family = 60 min · pre-wedding = 90 min · civil wedding = 60 min · events = 120 min · studio hire = 60 or 120 by tier · podcast = 60 min. Put these plus opening hours in ONE config file (`src/config/booking.ts`) — placeholder hours **Mon–Sat 10:00–19:00, Sunday closed** until Hadley confirms real hours.

## Stack
- **Astro SSR on Vercel** — add `@astrojs/vercel` adapter; pages stay static where possible (`export const prerender = true`), API routes + booking page dynamic.
- **Database: Postgres (Neon via Vercel Marketplace, free tier)** — tables below. Use `pg` or drizzle; keep it simple.
- **Stripe Node SDK** for Checkout Sessions + webhook.
- **Emails (optional v1):** if `RESEND_API_KEY` is set, send booking-confirmation email from bookings@chace.studio via Resend; otherwise rely on Stripe's receipt + success page. Never block the flow on email failure.

## Database schema
```sql
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  ref TEXT UNIQUE NOT NULL,            -- e.g. CHACE-4F7K2Q
  package_slug TEXT NOT NULL,
  tier_label TEXT NOT NULL,            -- e.g. "2 looks"
  total_pence INT NOT NULL,            -- discounted total actually agreed
  paid_pence INT NOT NULL DEFAULT 0,
  balance_pence INT NOT NULL DEFAULT 0,
  promo_code TEXT,
  name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT,
  location_type TEXT NOT NULL,         -- studio | on_location
  address TEXT, notes TEXT,
  date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
  status TEXT NOT NULL,                -- pending_payment | deposit_paid | paid_in_full | cancelled | expired
  stripe_session_id TEXT, stripe_payment_intent TEXT,
  balance_session_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ               -- hold expiry for pending_payment
);
CREATE TABLE blocked_slots (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL, start_time TIME, end_time TIME,  -- NULL times = whole day
  reason TEXT
);
```

## API routes
- `GET /api/availability?package=SLUG&date=YYYY-MM-DD` → list of free start times. Free = within opening hours, not overlapping (a) bookings with status deposit_paid/paid_in_full, (b) pending_payment bookings whose `expires_at > now()`, (c) blocked_slots. Also expose `GET /api/availability-month?package&year&month` returning which days have any free slot (for greying out calendar days).
- `POST /api/checkout` → validates slot still free → inserts booking (`pending_payment`, `expires_at = now()+30min`, ref generated) → creates Stripe Checkout Session:
  - `mode: 'payment'`, currency GBP, one line item: "{Package} — {tier} — {deposit|full payment}" with the computed amount
  - `allow_promotion_codes: true`
  - Do NOT pass `payment_method_types` — leave automatic so the Dashboard controls methods (cards, Apple/Google Pay, Klarna, PayPal, Pay by Bank, Revolut Pay appear when enabled & eligible)
  - `customer_email`, `metadata: { booking_id, ref, kind: 'deposit'|'full' }`
  - `success_url: {SITE}/booking/success?session_id={CHECKOUT_SESSION_ID}`, `cancel_url` back to the booking page
  - Return the session URL → client redirects.
- `POST /api/stripe-webhook` → verify signature with `STRIPE_WEBHOOK_SECRET`. On `checkout.session.completed`:
  - `kind=deposit`: status→`deposit_paid`; `paid_pence = amount_total`; `total_pence = round(amount_total/0.8)`; `balance_pence = total - paid`. (Promo % applied to the deposit scales the total correctly — see promo rules below.)
  - `kind=full`: status→`paid_in_full`; totals from amount_total.
  - `kind=balance`: add to paid_pence; if balance cleared → `paid_in_full`.
  - Fire confirmation email if Resend configured.
- `GET /booking/success` → look up session server-side, show branded confirmation: ref, package, date/time, amount paid, balance due (if any), studio address, "what to prepare".

## Admin (`/admin`)
Protect with HTTP Basic Auth against `ADMIN_PASSWORD` env (no user system needed). Features:
1. Upcoming bookings table (ref, name, package, date/time, paid, balance, status).
2. **"Collect balance" button** on deposit bookings → creates a new Checkout Session for `balance_pence` (`kind: 'balance'`, promo codes NOT allowed) → shows the URL with a copy button (Hadley sends it via WhatsApp/email) + auto-emails it if Resend is configured.
3. Block/unblock dates or time ranges (writes `blocked_slots`).
4. Manual "mark cancelled".

## Discount codes (no code to write — Stripe Dashboard does this)
Set `allow_promotion_codes: true` (done above). Hadley creates codes in **Stripe Dashboard → Product catalogue → Coupons**:
- Create coupon → **Percentage off** → then "Create promotion code" on it.
- **One-person code:** set "Limit to 1 redemption" (or "first-time customers only").
- **General promo code:** no redemption limit, optional expiry date (e.g. `CHACE10`).
- **RULE: percentage coupons only.** (A % off the 80% deposit scales the total correctly; fixed-£ coupons would corrupt the 80/20 maths. Enforce by convention; optionally validate in webhook.)

## Env vars (`.env` locally, same names in Vercel → Settings → Environment Variables)
```
STRIPE_SECRET_KEY=sk_test_...        # live key only at go-live
STRIPE_WEBHOOK_SECRET=whsec_...      # from webhook endpoint / stripe CLI
DATABASE_URL=postgres://...          # from Neon/Vercel
ADMIN_PASSWORD=change-me
PUBLIC_SITE_URL=http://localhost:4321
RESEND_API_KEY=                      # optional
```
Never commit `.env` (ensure it's gitignored). Hadley pastes his own keys.

## Local testing
1. `npm i stripe @astrojs/vercel pg` (+ `resend` optional). Configure the Vercel adapter.
2. Stripe CLI: `stripe listen --forward-to localhost:4321/api/stripe-webhook` → copies `whsec_` into `.env`.
3. Test cards: `4242 4242 4242 4242` (success). Test Klarna/PayPal flows appear in test mode; Apple Pay shows only on Safari with a card in Wallet (hosted Checkout handles it — nothing to configure).
4. Full test: book 2-look portrait with a 10% test promo code → pay deposit → webhook fires → admin shows £84 balance ((£300×0.9)×0.2=£54?? NO — verify maths in code with integer pence: total 27000, deposit 21600, balance 5400) → collect balance via admin link → status paid_in_full.

## Acceptance checklist
- [ ] Calendar never offers a taken/held/blocked slot; two parallel checkouts can't double-book (re-validate slot inside `/api/checkout` and again in webhook; on conflict refund automatically and flag in admin)
- [ ] 1-look tiers charge 100%; multi-look/events/civil charge exactly 80%; balances tracked in pence with no rounding drift
- [ ] Promo code box visible on Checkout; % code on deposit produces correct discounted total and balance
- [ ] Webhook signature verified; unpaid holds expire after 30 min and slots free up
- [ ] Admin balance link charges exactly the outstanding balance
- [ ] `npm run build` clean; site still fully works locally with `npm run dev`
- [ ] No secret keys anywhere in the repo (grep for `sk_live`, `sk_test` before finishing)

## Go-live (later, with Hadley)
1. Activate the live Stripe account (business details + bank). Fix the account name typo: currently "CHACE STUDDIOS" → **CHACE STUDIOS**.
2. Dashboard → Settings → Payment methods (LIVE): enable **Klarna, PayPal, Pay by Bank, Revolut Pay** (cards/wallets on by default). PayPal requires clicking "Activate" (Stripe-side approval).
3. Statement descriptor `CHACE STUDIOS`; branding logo/colour.
4. Deploy to Vercel; create the production webhook endpoint (`https://chace.studio/api/stripe-webhook`) in the Dashboard; put live `sk_live_` + `whsec_` in Vercel env vars.
5. £1 real test booking end-to-end, then refund it from the Dashboard.
