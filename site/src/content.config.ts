import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    // One line under the page title. Says what the page is for, plainly.
    summary: z.string(),
    // Controls both sidebar order and prev/next.
    order: z.number(),
  }),
});

export const collections = { docs };
