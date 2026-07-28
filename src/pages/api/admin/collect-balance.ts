import type { APIRoute } from 'astro';
import { query, type BookingRow } from '../../../lib/db';
import { getStripe } from '../../../lib/stripe';
import { checkAdminAuth, unauthorized, isSameOrigin, forbidden } from '../../../lib/auth';
import { siteUrl } from '../../../lib/env';
import { sendEmail } from '../../../lib/email';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) return unauthorized();
  if (!isSameOrigin(request)) return forbidden();

  const form = await request.formData();
  const bookingId = Number(form.get('booking_id'));
  if (!bookingId) return new Response('Missing booking_id', { status: 400 });

  const found = await query<BookingRow>(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
  const booking = found.rows[0];
  if (!booking) return new Response('Booking not found', { status: 404 });
  if (booking.status !== 'deposit_paid' || booking.balance_pence <= 0) {
    return new Response('No balance outstanding on this booking', { status: 400 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    currency: 'gbp',
    ...({ managed_payments: { enabled: false } } as any),
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'gbp',
          unit_amount: booking.balance_pence,
          product_data: {
            name: `CHACE STUDIOS balance for ${booking.ref}`,
            description: `${booking.tier_label} · ${booking.date} ${String(booking.start_time).slice(0, 5)}`,
          },
        },
      },
    ],
    allow_promotion_codes: false, // balances are charged exactly — no promos
    customer_email: booking.email,
    metadata: { booking_id: String(booking.id), ref: booking.ref, kind: 'balance' },
    success_url: `${siteUrl()}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/packages`,
  });

  await query(`UPDATE bookings SET balance_session_url = $1 WHERE id = $2`, [
    session.url,
    booking.id,
  ]);

  await sendEmail(
    booking.email,
    `CHACE STUDIOS balance payment link for ${booking.ref}`,
    `<p>Hi ${booking.name},</p><p>Here's the secure link to pay the remaining £${(booking.balance_pence / 100).toFixed(2)} balance on your booking <strong>${booking.ref}</strong>:</p><p><a href="${session.url}">Pay balance</a></p><p>CHACE STUDIOS</p>`
  );

  return new Response(null, { status: 303, headers: { Location: '/admin' } });
};
