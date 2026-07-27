import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // With an adapter present, 'static' prerenders every page unless a route
  // opts out with `export const prerender = false` (API routes, /admin,
  // /booking/success). Astro 5 replaced the old 'hybrid' mode with this.
  // Astro derives request origin from the deployment host on Vercel, so its
  // built-in check rejects form posts made through the public alias. Admin
  // routes enforce their own origin check against PUBLIC_SITE_URL instead.
  security: { checkOrigin: false },
  output: 'static',
  adapter: vercel(),
});
