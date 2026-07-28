import type { APIRoute } from 'astro';

export const prerender = true;

/**
 * Public pages only. /admin is private, /quote/* are private client links and
 * /book/* are shareable proposal pages we do not want competing with
 * /packages in search results, so none of them are listed here.
 */
const PUBLIC_PATHS = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/packages', priority: '0.9', changefreq: 'weekly' },
  { path: '/portfolio', priority: '0.8', changefreq: 'weekly' },
];

export const GET: APIRoute = () => {
  const base = (import.meta.env.PUBLIC_SITE_URL ?? 'https://chace.studio').replace(/\/$/, '');
  const lastmod = new Date().toISOString().slice(0, 10);

  const urls = PUBLIC_PATHS.map(
    ({ path, priority, changefreq }) => `  <url>
    <loc>${base}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  ).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
