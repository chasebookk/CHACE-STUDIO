import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * Private client quotes rendered at /quote/[client].
 *
 * To add a quote: drop a markdown file in src/content/quotes/ and an image
 * folder in public/assets/img/quotes/<name>/. The filename becomes the URL.
 * Pricing always comes from src/config/booking.ts via packageSlug/tierId, so
 * a quote can never state a price the booking form disagrees with.
 */
const quotes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/quotes' }),
  schema: z.object({
    /** Page <title>. */
    title: z.string(),
    eyebrow: z.string(),
    heading: z.string(),
    sub: z.string(),

    /** Locked booking tier, looked up in the shared booking config. */
    packageSlug: z.string(),
    tierId: z.string(),

    /** Rotating reference panel. */
    imagesDir: z.string(),
    imageCount: z.number().int().positive(),
    imageCaption: z.string().default('Reference direction for your session'),

    /** Highlighted note under the price. */
    priceNote: z.string().optional(),

    timeline: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
    timelineFooter: z.string().optional(),
    needs: z.array(z.object({ title: z.string(), body: z.string() })).default([]),
    included: z.array(z.string()).default([]),
    /** Reference the client should quote when contacting us. */
    quoteRef: z.string().optional(),
  }),
});

export const collections = { quotes };
