import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

// https://astro.build/config
export default defineConfig({
  // Hybrid: every page is prerendered static unless it opts out with
  // `export const prerender = false` (API routes, /admin, /booking/success).
  output: 'hybrid',
  adapter: vercel(),
});
