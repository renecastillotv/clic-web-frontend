// schemas/content/testimonials/category.ts
// Schema para Testimonials Category (/testimonios/{category})
// Generado desde: edge/content-backend/testimonials-handler.ts:78 (handleTestimonialsCategory)

import { z } from 'zod';
import { SEOSchema } from '../shared/seo';
import { PaginationSchema } from '../shared/pagination';
import { TestimonialItemSchema, TestimonialsStatsSchema } from './main';

/**
 * Schema completo de Testimonials Category Response
 *
 * Retornado por: handleTestimonialsCategory() en testimonials-handler.ts:134
 *
 * NOTA: NO tiene crossContent (a diferencia de Articles Category)
 */
export const TestimonialsCategorySchema = z.object({
  type: z.literal('testimonials-category'),
  pageType: z.literal('testimonials-category'),
  seo: SEOSchema,
  category: z.object({
    name: z.string(),
    slug: z.string(),
  }),
  testimonials: z.array(TestimonialItemSchema),
  pagination: PaginationSchema,
  stats: TestimonialsStatsSchema,
});

export type TestimonialsCategoryResponse = z.infer<typeof TestimonialsCategorySchema>;
