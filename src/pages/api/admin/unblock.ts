import type { APIRoute } from 'astro';
import { query } from '../../../lib/db';
import { checkAdminAuth, unauthorized, isSameOrigin, forbidden } from '../../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) return unauthorized();
  if (!isSameOrigin(request)) return forbidden();

  const form = await request.formData();
  const id = Number(form.get('id'));
  if (!id) return new Response('Missing id', { status: 400 });

  await query(`DELETE FROM blocked_slots WHERE id = $1`, [id]);
  return new Response(null, { status: 303, headers: { Location: '/admin' } });
};
