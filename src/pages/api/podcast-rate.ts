import type { APIRoute } from 'astro';
import { getPackage } from '../../config/booking';
import { isReturningPodcastClient } from '../../lib/returning';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/**
 * Advisory rate lookup for the booking form. The authoritative check runs
 * again inside /api/checkout, so a tampered response here cannot change
 * what is actually charged.
 */
export const GET: APIRoute = async ({ url }) => {
  const pkg = getPackage('podcast');
  if (!pkg) return json({ error: 'Unknown package' }, 400);

  const standard = pkg.tiers[0].pricePence;
  const returningPrice = pkg.returningPricePence ?? standard;

  try {
    const returning = await isReturningPodcastClient(
      url.searchParams.get('email'),
      url.searchParams.get('phone')
    );
    return json({
      returning,
      pricePence: returning ? returningPrice : standard,
      message: returning
        ? 'Welcome back. Your returning rate of £150 per episode has been applied.'
        : 'First session £200. Every episode after this one is £150.',
    });
  } catch (err) {
    console.error('podcast-rate error:', err);
    // Fail closed to the standard rate rather than blocking the form.
    return json({ returning: false, pricePence: standard, message: 'First session £200. Every episode after this one is £150.' });
  }
};
