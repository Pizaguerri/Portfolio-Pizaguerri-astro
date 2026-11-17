import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const portfolioSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  tags: z.array(z.string()).optional().default([]),
  summary: z.string().optional(),
  draft: z.boolean().optional().default(false),
});

// Projects
const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects', generateId: ({ entry }) => entry.replace(/\/index\.([a-z]{2})\.md$/, '.$1') }),
  schema: portfolioSchema.extend({
    expo: z.array(z.string()).optional().default([]),
  }),
});

// Blog (donde has movido Eclipse y Storm)
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog', generateId: ({ entry }) => entry.replace(/\/index\.([a-z]{2})\.md$/, '.$1') }),
  schema: portfolioSchema,
});

// Selected
const selected = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/selected', generateId: ({ entry }) => entry.replace(/\/index\.([a-z]{2})\.md$/, '.$1') }),
  schema: portfolioSchema,
});

// About
const about = defineCollection({
  loader: glob({ 
    pattern: '*.md', 
    base: './src/content/about',
    generateId: ({ entry }) => entry.replace(/\.([a-z]{2})\.md$/, '.$1') // Convierte "index.es.md" en "index.es"
  }),
  schema: z.object({
    title: z.string().optional(),
  }).passthrough(),
});

export const collections = { projects, blog, selected, about };