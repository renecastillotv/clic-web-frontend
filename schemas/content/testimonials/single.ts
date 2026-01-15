// schemas/content/testimonials/single.ts
// Schema para Testimonials Single (/testimonios/{category}/{slug})
// Generado desde: edge/content-backend/testimonials-handler.ts:151 (handleSingleTestimonial)

import { z } from 'zod';
import { SEOSchema } from '../shared/seo';
import { CrossContentVideoSchema, CrossContentPropertySchema, CrossContentArticleSchema } from '../shared/cross-content';
import { TestimonialItemSchema } from './main';
import { DebugInfoSchema } from '../articles/main';
import { VideoTagSchema } from '../videos/single';

/**
 * Schema completo de Testimonials Single Response
 *
 * Retornado por: handleSingleTestimonial() en testimonials-handler.ts:554
 *
 * DIFERENCIAS con Articles/Videos Single:
 * - Tiene crossContent (videos, properties, articles)
 * - Tiene tags[] (como Videos)
 * - NO tiene photoGallery ni areaAdvisors
 */
export const TestimonialsSingleSchema = z.object({
  type: z.literal('testimonials-single'),
  pageType: z.literal('testimonials-single'),
  found: z.literal(true),
  seo: SEOSchema,
  testimonial: TestimonialItemSchema,
  relatedTestimonials: z.array(TestimonialItemSchema),
  category: z.object({
    name: z.string(),
    slug: z.string(),
  }),
  // crossContent contiene videos, properties, articles (NO testimonials/faqs)
  crossContent: z.object({
    videos: z.array(CrossContentVideoSchema).default([]),
    properties: z.array(CrossContentPropertySchema).default([]),
    articles: z.array(CrossContentArticleSchema).default([]),
  }),
  tags: z.array(VideoTagSchema).default([]),
  debug: DebugInfoSchema.extend({
    testimonialId: z.union([z.string(), z.number()]).optional(),
    tagsCount: z.number().optional(),
    relatedTestimonialsCount: z.number().optional(),
  }).optional(),
});

export type TestimonialsSingleResponse = z.infer<typeof TestimonialsSingleSchema>;
