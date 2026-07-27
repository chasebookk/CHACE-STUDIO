import type { APIRoute } from 'astro';
import { getTier, getPackage } from '../../config/booking';
import { freeSlots } from '../../lib/availability';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const GET: APIRoute = async ({ url }) => {
  const slug = url.searchParams.get('package') ?? '';
  const tierId = url.searchParams.get('tier') ?? '';
  const date = url.searchParams.get('date') ?? '';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json({ error: 'Invalid date' }, 400);

  const pkg = getPackage(slug);
  if (!pkg) return json({ error: 'Unknown package' }, 400);
  // Tier optional: default to the first tier's duration.
  const tier = tierId ? getTier(slug, tierId) : pkg.tiers[0];
  if (!tier) return json({ error: 'Unknown tier' }, 400);

  try {
    const slots = await freeSlots(date, tier);
    return json({ date, slots });
  } catch (err) {
    console.error('availability error:', err);
    return json({ error: 'Availability unavailable' }, 500);
  }
};
