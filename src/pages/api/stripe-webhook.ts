import type { APIRoute } from 'astro';
import type Stripe from 'stripe';
import { DEPOSIT_RATE } from '../../config/booking';
import { query, type BookingRow } from '../../lib/db';
import { getStripe } from '../../lib/stripe';
import { toMin, slotIsFree } from '../../lib/availability';
import { env } from '../../lib/env';
import { sendEmail } from '../../lib/email';

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
  const bookingId = Number(session.metadata?.booking_id);
  const kind = session.metadata?.kind;
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
           notes = COALESCE(notes || E'\n', '') || '[CONFLICT — slot double-booked during payment; auto-refunded. Contact customer to rebook.]',
           stripe_payment_intent = COALESCE($2, stripe_payment_intent),
           promo_code = COALESCE($3, promo_code)
         WHERE id = $1`,
        [booking.id, paymentIntent ?? null, promoCode]
      );
      await sendEmail(
        booking.email,
        `CHACE STUDIOS — booking ${booking.ref}: slot no longer available`,
        `<p>Hi ${booking.name},</p><p>Unfortunately the slot you booked was taken moments before your payment completed. Your payment has been refunded in full automatically.</p><p>Please rebook at a new time — we'd love to see you: <a href="https://chace.studio/packages">chace.studio/packages</a>.</p><p>— CHACE STUDIOS</p>`
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
    await sendConfirmation(booking, amountTotal, balance, promoCode);
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
    await sendConfirmation(booking, amountTotal, 0, promoCode);
  } else if (kind === 'balance') {
    const newPaid = booking.paid_pence + amountTotal;
    const newBalance = Math.max(0, booking.total_pence - newPaid);
    await query(
      `UPDATE bookings SET paid_pence = $2, balance_pence = $3,
         status = CASE WHEN $3 = 0 THEN 'paid_in_full' ELSE status END
       WHERE id = $1`,
      [booking.id, newPaid, newBalance]
    );
    await sendEmail(
      booking.email,
      `CHACE STUDIOS — balance received for ${booking.ref}`,
      `<p>Hi ${booking.name},</p><p>We've received your balance payment of £${(amountTotal / 100).toFixed(2)} for booking <strong>${booking.ref}</strong>. ${newBalance === 0 ? 'Your booking is now paid in full — see you at the studio!' : `Remaining balance: £${(newBalance / 100).toFixed(2)}.`}</p><p>— CHACE STUDIOS</p>`
    );
  }

  return new Response('ok', { status: 200 });
};

async function sendConfirmation(
  booking: BookingRow,
  paidPence: number,
  balancePence: number,
  promoCode: string | null
): Promise<void> {
  await sendEmail(
    booking.email,
    `CHACE STUDIOS — booking confirmed: ${booking.ref}`,
    `<p>Hi ${booking.name},</p>
     <p>Your booking is confirmed.</p>
     <ul>
       <li><strong>Reference:</strong> ${booking.ref}</li>
       <li><strong>Date:</strong> ${booking.date} at ${String(booking.start_time).slice(0, 5)}</li>
       <li><strong>Paid:</strong> £${(paidPence / 100).toFixed(2)}${promoCode ? ` (promo ${promoCode})` : ''}</li>
       ${balancePence > 0 ? `<li><strong>Balance due on/after session:</strong> £${(balancePence / 100).toFixed(2)}</li>` : ''}
       <li><strong>Studio:</strong> 5 Pocklingtons Walk, Leicester LE1 6BT</li>
     </ul>
     <p>— CHACE STUDIOS</p>`
  );
}
