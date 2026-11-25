import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Categorías comunes del CV
const cvSchema = z.object({
  exposicions: z.array(z.string()).optional().default([]),
  publicacions_i_col·laboracions: z.array(z.string()).optional().default([]),
  premis: z.array(z.string()).optional().default([]),
});

// Campos comunes de proyectos y textos
const portfolioSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  date: z.coerce.date().optional(),
  type: z.enum(['project', 'gallery']).default('project'),
  cover: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  summary_en: z.string().optional(),
  draft: z.boolean().optional().default(false),
});

// Proyectos y textos con información curricular
const portfolioWithCvSchema = portfolioSchema.extend({
  cv: cvSchema.default({
    exposicions: [],
    publicacions_i_col·laboracions: [],
    premis: [],
  }),
});

// Work
const work = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/work',
    generateId: ({ entry }) =>
      entry.replace(/\/index\.md$/, ''),
  }),
  schema: portfolioWithCvSchema,
});

// Text
const text = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/text',
    generateId: ({ entry }) =>
      entry.replace(/\/index\.md$/, ''),
  }),
  schema: portfolioWithCvSchema,
});

// Bio y CV manual
const bio = defineCollection({
  loader: glob({
    pattern: '*.md',
    base: './src/content/bio',
    generateId: ({ entry }) =>
      entry.replace(/\.([a-z]{2})\.md$/, '.$1'),
  }),
  schema: z.object({
    title: z.string().optional(),
    exposicions: z.array(z.string()).optional().default([]),
    publicacions_i_col·laboracions: z.array(z.string()).optional().default([]),
    premis: z.array(z.string()).optional().default([]),
  }).passthrough(),
});

export const collections = {
  work,
  text,
  bio,
};