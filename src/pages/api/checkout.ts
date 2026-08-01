import type { APIRoute } from 'astro';
import {
  getPackage,
  getTier,
  chargeNowPence,
  getStudio,
  DEFAULT_STUDIO,
  HOLD_MINUTES,
} from '../../config/booking';
import { getPool } from '../../lib/db';
import { getStripe } from '../../lib/stripe';
import { toMin, toHHMM, slotIsFree, generateRef } from '../../lib/availability';
import { isReturningPodcastClient } from '../../lib/returning';
import { siteUrl } from '../../lib/env';
import { checkRateLimit, clientIp } from '../../lib/rate-limit';
import { getAgreedQuote } from '../../config/quotes';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const POST: APIRoute = async ({ request }) => {
  // Throttle before doing any work: every accepted request holds a slot.
  const limit = await checkRateLimit(clientIp(request));
  if (!limit.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many booking attempts. Please wait a few minutes and try again.',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(limit.retryAfterSeconds),
        },
      }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const {
    package: slug,
    tier: tierId,
    date,
    time,
    name,
    email,
    phone,
    locationType,
    studioId,
    address,
    notes,
    quote: quoteId,
  } = body ?? {};

  const pkg = getPackage(String(slug ?? ''));
  const tier = pkg && getTier(pkg.slug, String(tierId ?? ''));
  if (!pkg || !tier) return json({ error: 'Unknown package or tier' }, 400);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date ?? ''))) return json({ error: 'Invalid date' }, 400);
  if (!/^\d{2}:\d{2}$/.test(String(time ?? ''))) return json({ error: 'Invalid time' }, 400);
  if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    return json({ error: 'Name and a valid email are required' }, 400);
  }
  // Studio-only packages can never be on location, whatever the client sends.
  const locType = !pkg.studioOnly && locationType === 'on_location' ? 'on_location' : 'studio';
  const studio = locType === 'studio' ? (getStudio(studioId) ?? DEFAULT_STUDIO) : undefined;
  if (locType === 'on_location' && !String(address ?? '').trim()) {
    return json({ error: 'Please give the address for an on-location shoot.' }, 400);
  }

  const startMin = toMin(String(time));
  const endMin = startMin + tier.durationMin;

  // Price comes from config, never from the client. A privately agreed quote
  // rate is looked up server side and only honoured when the package and tier
  // match the quote, so pointing a quote id at a different tier does nothing.
  let totalPence = tier.pricePence;
  let tierLabel = tier.label;

  const agreed = getAgreedQuote(typeof quoteId === 'string' ? quoteId : null);
  if (agreed && agreed.packageSlug === pkg.slug && agreed.tierId === tier.id) {
    totalPence = agreed.totalPence;
    tierLabel = `${tier.label}, agreed rate`;
  }
  if (pkg.returningPricePence && (await isReturningPodcastClient(String(email), phone ? String(phone) : null))) {
    totalPence = pkg.returningPricePence;
    tierLabel = `${tier.label}, returning client rate`;
  }

  const amountPence = chargeNowPence(tier, totalPence);
  const kind = tier.charge === 'deposit' ? 'deposit' : 'full';

  const pool = getPool();
  const client = await pool.connect();
  let bookingId: number;
  let ref: string;

  try {
    await client.query('BEGIN');
    // Serialize checkouts per date so two parallel requests can't both pass
    // the free-slot check and double-book.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [String(date)]);

    if (!(await slotIsFree(String(date), startMin, tier.durationMin))) {
      await client.query('ROLLBACK');
      return json({ error: 'slot_taken', message: 'That slot has just been taken. Please pick another time.' }, 409);
    }

    ref = generateRef();
    const inserted = await client.query(
      `INSERT INTO bookings
         (ref, package_slug, tier_label, total_pence, paid_pence, balance_pence,
          name, email, phone, location_type, studio_id, address, notes,
          date, start_time, end_time, status, expires_at)
       VALUES ($1,$2,$3,$4,0,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'pending_payment',
               now() + ($16 || ' minutes')::interval)
       RETURNING id`,
      [
        ref,
        pkg.slug,
        tierLabel,
        totalPence,
        tier.charge === 'deposit' ? totalPence - amountPence : 0,
        String(name).slice(0, 200),
        String(email).slice(0, 200),
        phone ? String(phone).slice(0, 50) : null,
        locType,
        studio?.id ?? null,
        // A studio shoot's address is the studio's — never a stale free-text one.
        locType === 'on_location' && address ? String(address).slice(0, 500) : null,
        notes ? String(notes).slice(0, 2000) : null,
        date,
        toHHMM(startMin),
        toHHMM(endMin),
        String(HOLD_MINUTES),
      ]
    );
    bookingId = inserted.rows[0].id;
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('checkout insert error:', err);
    return json({ error: 'Could not create booking' }, 500);
  } finally {
    client.release();
  }

  try {
    const stripe = getStripe();
    const site = siteUrl();
    const chargeLabel = kind === 'deposit' ? '80% deposit' : 'full payment';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      currency: 'gbp',
      // In-person studio services: Stripe's merchant-of-record mode
      // (Managed Payments, default-on for new accounts) doesn't apply.
      ...({ managed_payments: { enabled: false } } as any),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'gbp',
            unit_amount: amountPence,
            product_data: {
              name: `${pkg.title}, ${tierLabel}, ${chargeLabel}`,
              description: `${date} at ${toHHMM(startMin)} · ref ${ref}`,
            },
          },
        },
      ],
      allow_promotion_codes: true,
      customer_email: String(email),
      metadata: { booking_id: String(bookingId), ref, kind },
      // Stripe requires >= 30 min; small buffer keeps us safely above it.
      expires_at: Math.floor(Date.now() / 1000) + HOLD_MINUTES * 60 + 120,
      success_url: `${site}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/packages#book`,
    });

    await pool.query(`UPDATE bookings SET stripe_session_id = $1 WHERE id = $2`, [
      session.id,
      bookingId,
    ]);

    return json({ url: session.url, ref });
  } catch (err) {
    console.error('stripe session error:', err);
    // Free the hold if Stripe failed.
    await pool
      .query(`UPDATE bookings SET status = 'expired' WHERE id = $1`, [bookingId])
      .catch(() => {});
    return json({ error: 'Payment provider error. Please try again.' }, 502);
  }
};
