import type { APIRoute } from 'astro';
import { query } from '../../../lib/db';
import { checkAdminAuth, unauthorized, isSameOrigin, forbidden } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) return unauthorized();
  if (!isSameOrigin(request)) return forbidden();

  const form = await request.formData();
  const date = String(form.get('date') ?? '');
  const start = String(form.get('start_time') ?? '').trim();
  const end = String(form.get('end_time') ?? '').trim();
  const reason = String(form.get('reason') ?? '').trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return new Response('Invalid date', { status: 400 });
  // Both times or neither (NULL times = whole day blocked).
  if ((start && !end) || (!start && end)) {
    return new Response('Provide both start and end time, or neither for a whole day', { status: 400 });
  }

  await query(
    `INSERT INTO blocked_slots (date, start_time, end_time, reason) VALUES ($1, $2, $3, $4)`,
    [date, start || null, end || null, reason || null]
  );

  return new Response(null, { status: 303, headers: { Location: '/admin' } });
};
