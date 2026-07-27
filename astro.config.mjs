import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // With an adapter present, 'static' prerenders every page unless a route
  // opts out with `export const prerender = false` (API routes, /admin,
  // /booking/success). Astro 5 replaced the old 'hybrid' mode with this.
  output: 'static',
  adapter: vercel(),
});
