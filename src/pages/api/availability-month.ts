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
  const year = Number(url.searchParams.get('year'));
  const month = Number(url.searchParams.get('month')); // 1–12

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return json({ error: 'Invalid year/month' }, 400);
  }
  const pkg = getPackage(slug);
  if (!pkg) return json({ error: 'Unknown package' }, 400);
  const tier = tierId ? getTier(slug, tierId) : pkg.tiers[0];
  if (!tier) return json({ error: 'Unknown tier' }, 400);

  try {
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const available: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (new Date(`${date}T23:59:59`) < today) continue;
      const slots = await freeSlots(date, tier);
      if (slots.length > 0) available.push(date);
    }
    return json({ year, month, available });
  } catch (err) {
    console.error('availability-month error:', err);
    return json({ error: 'Availability unavailable' }, 500);
  }
};
