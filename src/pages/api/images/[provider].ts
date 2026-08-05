import type { APIRoute } from 'astro';
import { env } from '../../../lib/env';

export const prerender = false;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export interface StockImage {
  id: string;
  thumb: string;
  full: string;
  author: string;
  sourceUrl: string;
  source: string;
}

// These APIs are rate limited, and clients tap the same preset chips, so a
// short in-memory cache saves most of the traffic. Per instance is fine.
const cache = new Map<string, { at: number; results: StockImage[] }>();
const TTL = 5 * 60 * 1000;

async function unsplash(q: string, page: number): Promise<StockImage[]> {
  const key = env('UNSPLASH_ACCESS_KEY');
  if (!key) throw new Error('missing key');

  const url = new URL('https://api.unsplash.com/search/photos');
  url.searchParams.set('query', q);
  url.searchParams.set('per_page', '24');
  url.searchParams.set('page', String(page));
  url.searchParams.set('content_filter', 'high');

  const res = await fetch(url, {
    headers: { Authorization: `Client-ID ${key}`, 'Accept-Version': 'v1' },
  });
  if (!res.ok) throw new Error(`unsplash ${res.status}`);
  const data = await res.json();

  return (data.results ?? []).map((r: any) => ({
    id: String(r.id),
    thumb: r.urls?.small,
    full: r.urls?.regular,
    author: r.user?.name ?? 'Unknown',
    // Unsplash's licence requires crediting the photographer and linking back.
    sourceUrl: r.links?.html ?? 'https://unsplash.com',
    source: 'unsplash',
  }));
}

async function pexels(q: string, page: number): Promise<StockImage[]> {
  const key = env('PEXELS_API_KEY');
  if (!key) throw new Error('missing key');

  const url = new URL('https://api.pexels.com/v1/search');
  url.searchParams.set('query', q);
  url.searchParams.set('per_page', '24');
  url.searchParams.set('page', String(page));

  // Pexels takes the key raw in Authorization, with no scheme prefix.
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) throw new Error(`pexels ${res.status}`);
  const data = await res.json();

  return (data.photos ?? []).map((p: any) => ({
    id: String(p.id),
    thumb: p.src?.medium,
    full: p.src?.large,
    author: p.photographer ?? 'Unknown',
    // Pexels' licence asks for the photographer to be credited and linked.
    sourceUrl: p.url ?? 'https://www.pexels.com',
    source: 'pexels',
  }));
}

const PROVIDERS: Record<string, { envKey: string; search: (q: string, page: number) => Promise<StockImage[]> }> = {
  unsplash: { envKey: 'UNSPLASH_ACCESS_KEY', search: unsplash },
  pexels: { envKey: 'PEXELS_API_KEY', search: pexels },
};

export const GET: APIRoute = async ({ params, url }) => {
  const name = String(params.provider ?? '');
  const provider = PROVIDERS[name];
  if (!provider) return json({ error: 'Unknown provider' }, 404);
  if (!env(provider.envKey)) {
    // The drawer hides a tab whose key is absent rather than showing an error.
    return json({ error: 'not_configured', results: [] }, 503);
  }

  const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
  const page = Math.max(1, Math.min(20, Number(url.searchParams.get('page')) || 1));
  if (!q) return json({ results: [] });

  const cacheKey = `${name}:${q}:${page}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < TTL) return json({ results: hit.results, cached: true });

  try {
    const results = await provider.search(q, page);
    cache.set(cacheKey, { at: Date.now(), results });
    return json({ results });
  } catch (err) {
    console.error(`[images] ${name} search failed:`, err);
    return json({ error: 'search_failed', results: [] }, 502);
  }
};

/** Which providers are usable, so the drawer can hide the rest. */
export function configuredProviders(): string[] {
  return Object.entries(PROVIDERS)
    .filter(([, p]) => !!env(p.envKey))
    .map(([name]) => name);
}
