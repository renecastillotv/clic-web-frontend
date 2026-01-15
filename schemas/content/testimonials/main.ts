// schemas/content/testimonials/main.ts
// Schema para Testimonials Main (/testimonios)
// Generado desde: edge/content-backend/testimonials-handler.ts:6 (handleTestimonialsMain)

import { z } from 'zod';
import { SEOSchema } from '../shared/seo';
import { CategorySchema } from '../shared/cross-content';
import { AuthorSchema } from '../shared/author';

/**
 * Schema de un testimonio individual (item en featuredTestimonials/recentTestimonials)
 */
export const TestimonialItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  excerpt: z.string(),
  subtitle: z.string().optional(),
  rating: z.number().min(1).max(5).default(5),
  clientName: z.string(),
  clientAvatar: z.string(),
  clientLocation: z.string().optional(),
  clientVerified: z.boolean().default(false),
  clientProfession: z.string().optional(),
  transactionLocation: z.string().optional(),
  category: z.string().optional(),
  featured: z.boolean().default(false),
  publishedAt: z.string(),
  views: z.number().default(0),
  readTime: z.string(),
  url: z.string(),
  slug: z.string(),
  slug_en: z.string().optional(),
  slug_fr: z.string().optional(),
  agent: AuthorSchema,
  // Campos adicionales para testimonials single
  fullTestimonial: z.string().optional(),
  rawData: z.object({
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  }).optional(),
});

export type TestimonialItem = z.infer<typeof TestimonialItemSchema>;

/**
 * Schema de estadísticas de Testimonials Main
 */
export const TestimonialsStatsSchema = z.object({
  totalTestimonials: z.number().default(0),
  averageRating: z.number().default(5.0),
  totalCategories: z.number().default(0),
  totalViews: z.number().default(0),
  verifiedClients: z.number().default(0),
});

export type TestimonialsStats = z.infer<typeof TestimonialsStatsSchema>;

/**
 * Schema completo de Testimonials Main Response
 *
 * Retornado por: handleTestimonialsMain() en testimonials-handler.ts:62
 *
 * NOTA: NO tiene crossContent (a diferencia de Articles)
 */
export const TestimonialsMainSchema = z.object({
  type: z.literal('testimonials-main'),
  pageType: z.literal('testimonials-main'),
  seo: SEOSchema,
  featuredTestimonials: z.array(TestimonialItemSchema),
  recentTestimonials: z.array(TestimonialItemSchema),
  categories: z.array(CategorySchema.extend({
    count: z.number().optional(),
  })),
  stats: TestimonialsStatsSchema,
});

export type TestimonialsMainResponse = z.infer<typeof TestimonialsMainSchema>;
