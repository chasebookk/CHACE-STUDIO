import type { APIRoute } from 'astro';
import { query, type BookingRow } from '../../../lib/db';
import { checkAdminAuth, unauthorized, isSameOrigin, forbidden } from '../../../lib/auth';
import { sendBookingNotifications } from '../../../lib/notify';

export const prerender = false;

/**
 * Re-send the confirmation emails for a booking: the owner notification and
 * the client's copy with its calendar invite. Useful when a client says the
 * confirmation never arrived, and it changes no booking data.
 */
export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) return unauthorized();
  if (!isSameOrigin(request)) return forbidden();

  const form = await request.formData();
  const bookingId = Number(form.get('booking_id'));
  if (!bookingId) return new Response('Missing booking_id', { status: 400 });

  const { rows } = await query<BookingRow>(`SELECT * FROM bookings WHERE id = $1`, [bookingId]);
  const booking = rows[0];
  if (!booking) return new Response('Booking not found', { status: 404 });

  await sendBookingNotifications(booking);
  return new Response(null, { status: 303, headers: { Location: '/admin' } });
};
