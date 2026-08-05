import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { DEPOSIT_RATE } from '../../config/booking';
import { query, type BookingRow } from '../../lib/db';
import { getStripe } from '../../lib/stripe';
import { toMin, slotIsFree } from '../../lib/availability';
import { env } from '../../lib/env';
import { sendEmail } from '../../lib/email';
import { sendBookingNotifications } from '../../lib/notify';
import { getContract, CONTRACT_PACKAGE_SLUG } from '../../config/contracts';
import { sendContractEmails, type ContractRow } from '../../lib/contract-notify';
import { generateRef } from '../../lib/availability';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();

  // A missing secret is a server misconfiguration, not a bad request — keep it
  // distinct from signature failures so monitoring can tell them apart.
  const webhookSecret = env('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured — cannot verify events');
    return new Response('Webhook not configured', { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response('ok', { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  // Idempotency gate, before anything else touches the database, Stripe or
  // email. Stripe retries on any non-2xx or timeout, so a slow send would
  // otherwise replay the whole handler. Claiming the event id first means a
  // repeat delivery stops here, which is what prevents the balance branch
  // double-counting and duplicate confirmation emails.
  const claim = await query(
    `INSERT INTO processed_events (event_id, session_id, booking_id, kind, amount_pence)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT DO NOTHING
     RETURNING event_id`,
    [
      event.id,
      session.id,
      Number(session.metadata?.booking_id) || null,
      session.metadata?.kind ?? null,
      session.amount_total ?? 0,
    ]
  );
  if (claim.rowCount === 0) {
    console.log(`[webhook] event ${event.id} already processed, skipping`);
    return new Response('ok (duplicate)', { status: 200 });
  }

  const kind = session.metadata?.kind;

  // A signed contract pays a deposit that secures whole days rather than a
  // single slot, so it takes its own path: create one booking per contracted
  // day (which is what blocks the calendar), then send the four emails.
  if (kind === 'contract') {
    await handleContractPayment(session);
    return new Response('ok', { status: 200 });
  }

  const bookingId = Number(session.metadata?.booking_id);
  const amountTotal = session.amount_total ?? 0;
  const paymentIntent =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;

  if (!bookingId || !kind) {
    console.error('Webhook session missing metadata', session.id);
    return new Response('ok', { status: 200 });
  }

  const found = await query<BookingRow>(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
  const booking = found.rows[0];
  if (!booking) {
    console.error('Webhook for unknown booking', bookingId);
    return new Response('ok', { status: 200 });
  }

  // Promo code (if any) for the record.
  let promoCode: string | null = null;
  try {
    const full = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ['total_details.breakdown'],
    });
    const breakdown: any = full.total_details?.breakdown;
    if (breakdown?.discounts?.length) {
      const discount = breakdown.discounts[0].discount;
      promoCode = discount?.promotion_code
        ? typeof discount.promotion_code === 'string'
          ? discount.promotion_code
          : discount.promotion_code.code ?? null
        : discount?.coupon?.name ?? discount?.coupon?.id ?? null;
    }
  } catch (err) {
    console.error('Could not read promo breakdown (non-fatal):', err);
  }

  if (kind === 'deposit' || kind === 'full') {
    // Double-booking backstop: if the slot was taken while this customer paid
    // (hold expired mid-checkout), refund automatically and flag for admin.
    const stillFree = await slotIsFree(
      booking.date,
      toMin(booking.start_time),
      toMin(booking.end_time) - toMin(booking.start_time),
      booking.id
    );
    if (!stillFree) {
      console.error(`CONFLICT on ${booking.ref}: slot taken during payment — refunding`);
      if (paymentIntent) {
        try {
          await stripe.refunds.create({ payment_intent: paymentIntent });
        } catch (err) {
          console.error('Auto-refund failed — refund manually in Stripe Dashboard:', err);
        }
      }
      await query(
        `UPDATE bookings SET status = 'cancelled',
           notes = COALESCE(notes || E'\n', '') || '[CONFLICT: slot double-booked during payment, auto-refunded. Contact customer to rebook.]',
           stripe_payment_intent = COALESCE($2, stripe_payment_intent),
           promo_code = COALESCE($3, promo_code)
         WHERE id = $1`,
        [booking.id, paymentIntent ?? null, promoCode]
      );
      await safeSend(
        booking.email,
        `CHACE STUDIOS booking ${booking.ref}: slot no longer available`,
        `<p>Hi ${booking.name},</p><p>Unfortunately the slot you booked was taken moments before your payment completed. Your payment has been refunded in full automatically.</p><p>Please rebook at a new time, we'd love to see you: <a href="https://chace.studio/packages">chace.studio/packages</a>.</p><p>CHACE STUDIOS</p>`
      );
      return new Response('ok', { status: 200 });
    }
  }

  if (kind === 'deposit') {
    // A % promo on the deposit scales the total: total = amount / 0.8.
    const total = Math.round(amountTotal / DEPOSIT_RATE);
    const balance = total - amountTotal;
    await query(
      `UPDATE bookings SET status = 'deposit_paid',
         paid_pence = $2, total_pence = $3, balance_pence = $4,
         stripe_payment_intent = COALESCE($5, stripe_payment_intent),
         promo_code = COALESCE($6, promo_code),
         expires_at = NULL
       WHERE id = $1`,
      [booking.id, amountTotal, total, balance, paymentIntent ?? null, promoCode]
    );
    await notifyFromDb(booking.id);
  } else if (kind === 'full') {
    await query(
      `UPDATE bookings SET status = 'paid_in_full',
         paid_pence = $2, total_pence = $2, balance_pence = 0,
         stripe_payment_intent = COALESCE($3, stripe_payment_intent),
         promo_code = COALESCE($4, promo_code),
         expires_at = NULL
       WHERE id = $1`,
      [booking.id, amountTotal, paymentIntent ?? null, promoCode]
    );
    await notifyFromDb(booking.id);
  } else if (kind === 'balance') {
    // Absolute, not additive: sum every payment Stripe has actually confirmed
    // for this booking. Re-running this yields the same figure rather than
    // adding the amount a second time.
    const paid = await query<{ total: string | null }>(
      `SELECT SUM(amount_pence)::bigint AS total FROM processed_events
        WHERE booking_id = $1 AND kind IN ('deposit', 'full', 'balance')`,
      [booking.id]
    );
    const newPaid = Math.min(booking.total_pence, Number(paid.rows[0]?.total ?? 0));
    const newBalance = Math.max(0, booking.total_pence - newPaid);
    await query(
      `UPDATE bookings SET paid_pence = $2, balance_pence = $3,
         status = CASE WHEN $3 = 0 THEN 'paid_in_full' ELSE status END
       WHERE id = $1`,
      [booking.id, newPaid, newBalance]
    );
    await safeSend(
      booking.email,
      `CHACE STUDIOS balance received for ${booking.ref}`,
      `<p>Hi ${booking.name},</p><p>We've received your balance payment of £${(amountTotal / 100).toFixed(2)} for booking <strong>${booking.ref}</strong>. ${newBalance === 0 ? 'Your booking is now paid in full. See you at the studio.' : `Remaining balance: £${(newBalance / 100).toFixed(2)}.`}</p><p>CHACE STUDIOS</p>`
    );
  }

  return new Response('ok', { status: 200 });
};

/**
 * Re-read the booking so the emails quote the post-payment figures
 * (paid/total/balance/promo) rather than the pre-payment hold.
 */
async function notifyFromDb(bookingId: number): Promise<void> {
  try {
    const { rows } = await query<BookingRow>(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
    if (!rows[0]) {
      console.error(`[notify] booking ${bookingId} vanished before notification`);
      return;
    }
    await sendBookingNotifications(rows[0]);
  } catch (err) {
    // Swallow deliberately. Returning non-2xx here would make Stripe retry
    // the whole event, and the retry is the thing that causes double
    // processing. The payment is already recorded; only the email is lost.
    console.error(`[notify] notification failed for booking ${bookingId}, not retrying:`, err);
  }
}

/** Same reasoning: an email problem must never fail the webhook response. */
async function safeSend(...args: Parameters<typeof sendEmail>): Promise<void> {
  try {
    await sendEmail(...args);
  } catch (err) {
    console.error('[email] send threw, not retrying:', err);
  }
}

/**
 * A signed contract has been paid.
 *
 * Creates one confirmed booking per contracted day, which is what makes both
 * dates unavailable to everyone else, then sends the four emails. Written to
 * be safe on a Stripe retry: the bookings are only created if the contract is
 * not already marked paid.
 */
async function handleContractPayment(session: Stripe.Checkout.Session): Promise<void> {
  const contractId = Number(session.metadata?.contract_id);
  if (!contractId) {
    console.error('[contract] session has no contract_id', session.id);
    return;
  }

  const paymentIntent =
    typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const amountTotal = session.amount_total ?? 0;

  const found = await query<ContractRow>(`SELECT * FROM contracts WHERE id = $1`, [contractId]);
  const row = found.rows[0];
  if (!row) {
    console.error('[contract] payment for unknown contract', contractId);
    return;
  }
  if (row.status === 'paid') {
    console.log(`[contract] ${row.ref} already marked paid, skipping`);
    return;
  }

  const contract = getContract(row.slug);
  if (!contract) {
    console.error(`[contract] unknown slug ${row.slug} on contract ${row.ref}`);
    return;
  }

  // The two days were already held as pending_payment when the contract was
  // signed. Payment turns those holds into confirmed bookings; it does not
  // create them. Confirming by ref means a hold that expired mid-checkout is
  // revived rather than lost, which is the right outcome once money has
  // actually been taken.
  const bookingIds: number[] = [];
  try {
    for (const [i, day] of contract.days.entries()) {
      const dayRef = `${row.ref}-D${i + 1}`;
      const { rows } = await query<{ id: number }>(
        `UPDATE bookings
            SET status = 'paid_in_full',
                paid_pence = $2,
                total_pence = GREATEST(total_pence, $2),
                balance_pence = 0,
                expires_at = NULL,
                stripe_session_id = COALESCE(stripe_session_id, $3),
                stripe_payment_intent = COALESCE($4, stripe_payment_intent)
          WHERE ref = $1
          RETURNING id`,
        // Only day one carries the session id and the money, so the books add
        // up once. bookings_stripe_session_idx is unique, so day two must not
        // reuse it.
        [dayRef, i === 0 ? amountTotal : 0, i === 0 ? session.id : null, paymentIntent ?? null]
      );
      if (rows[0]) {
        bookingIds.push(rows[0].id);
        continue;
      }

      // No hold to confirm: recreate it, because the payment is real and the
      // date must be blocked whatever happened to the hold.
      console.error(`[contract] hold ${dayRef} missing at payment, recreating`);
      const recreated = await query<{ id: number }>(
        `INSERT INTO bookings
           (ref, package_slug, tier_label, total_pence, paid_pence, balance_pence,
            name, email, phone, location_type, address, notes,
            date, start_time, end_time, status, stripe_session_id, stripe_payment_intent)
         VALUES ($1,$2,$3,$4,$5,0,$6,$7,$8,'on_location',$9,$10,$11,$12,$13,
                 'paid_in_full',$14,$15)
         ON CONFLICT (ref) DO NOTHING
         RETURNING id`,
        [
          dayRef,
          CONTRACT_PACKAGE_SLUG,
          `${contract.title}, day ${i + 1} of ${contract.days.length}, ${day.heading}`,
          i === 0 ? amountTotal : 0,
          i === 0 ? amountTotal : 0,
          `${row.signer_name}${row.partner_name ? ` & ${row.partner_name}` : ''}`,
          row.email,
          row.phone,
          i === 0 ? row.venue_day1 : row.venue_day2,
          `Contract ${row.ref}. Hold had expired; recreated on payment.`,
          day.date,
          day.blockFrom,
          day.blockTo,
          i === 0 ? session.id : null,
          paymentIntent ?? null,
        ]
      );
      if (recreated.rows[0]) bookingIds.push(recreated.rows[0].id);
    }
  } catch (err) {
    console.error(`[contract] CALENDAR WRITE FAILED for ${row.ref}, block 17/18 Aug manually:`, err);
  }

  const updated = await query<ContractRow>(
    `UPDATE contracts
        SET status = 'paid', paid_at = now(),
            balance_pence = 0,
            stripe_payment_intent = COALESCE($2, stripe_payment_intent),
            booking_ids = $3
      WHERE id = $1
      RETURNING *`,
    [contractId, paymentIntent ?? null, bookingIds.length ? bookingIds : null]
  );

  const fresh = updated.rows[0] ?? row;
  try {
    const { sent, total } = await sendContractEmails(fresh);
    console.log(`[contract] ${row.ref}: ${sent}/${total} emails sent, bookings ${bookingIds.join(', ') || 'none'}`);
  } catch (err) {
    console.error(`[contract] emails threw for ${row.ref}, not retrying:`, err);
  }
}
