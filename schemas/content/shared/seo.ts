// schemas/content/shared/seo.ts
// Schema SEO común a todas las respuestas de contenido
// Generado desde: edge/content-backend/{articles,videos,testimonials}-handler.ts

import { z } from 'zod';

/**
 * Breadcrumb individual del schema SEO
 */
export const BreadcrumbSchema = z.object({
  name: z.string(),
  url: z.string(),
});

export type Breadcrumb = z.infer<typeof BreadcrumbSchema>;

/**
 * Schema SEO básico (usado en Articles, Videos, Testimonials)
 *
 * Presente en todas las respuestas (main, category, single)
 */
export const SEOSchema = z.object({
  title: z.string(),
  description: z.string(),
  h1: z.string(),
  h2: z.string().optional(),
  canonical_url: z.string(),
  breadcrumbs: z.array(BreadcrumbSchema),
});

export type SEO = z.infer<typeof SEOSchema>;

/**
 * Schema SEO extendido para Videos Single
 *
 * Incluye datos estructurados para Schema.org, Open Graph y Twitter Card
 */
export const ExtendedSEOSchema = SEOSchema.extend({
  structured_data: z.object({
    '@context': z.string(),
    '@type': z.string(),
    name: z.string(),
    description: z.string(),
    thumbnailUrl: z.string(),
    uploadDate: z.string(),
    duration: z.string().optional(),
    contentUrl: z.string().nullable(),
    embedUrl: z.string().nullable(),
    interactionStatistic: z.object({
      '@type': z.string(),
      interactionType: z.string(),
      userInteractionCount: z.number(),
    }),
  }).optional(),

  open_graph: z.object({
    title: z.string(),
    description: z.string(),
    url: z.string(),
    type: z.string(),
    image: z.string(),
    video: z.string().nullable(),
    site_name: z.string(),
  }).optional(),

  twitter_card: z.object({
    card: z.string(),
    site: z.string(),
    title: z.string(),
    description: z.string(),
    image: z.string(),
  }).optional(),
});

export type ExtendedSEO = z.infer<typeof ExtendedSEOSchema>;
