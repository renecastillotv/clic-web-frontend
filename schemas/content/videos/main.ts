// schemas/content/videos/main.ts
// Schema para Videos Main (/videos)
// Generado desde: edge/content-backend/videos-handler.ts:135 (handleVideosMain)

import { z } from 'zod';
import { SEOSchema } from '../shared/seo';
import { CategorySchema } from '../shared/cross-content';
import { AuthorSchema } from '../shared/author';
import { DebugInfoSchema } from '../articles/main';

/**
 * Schema de un video individual (item en featuredVideos/recentVideos)
 */
export const VideoItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  description: z.string().optional(),
  thumbnail: z.string(),
  videoSlug: z.string(),
  slug: z.string(),
  slug_en: z.string().optional(),
  slug_fr: z.string().optional(),
  duration: z.string().default('10:00'),
  publishedAt: z.string().optional(),
  views: z.number().default(0),
  featured: z.boolean().default(false),
  url: z.string(),
  author: AuthorSchema,
  // Campos adicionales para videos single
  subtitle: z.string().optional(),
  location: z.string().nullable().optional(),
  propertyType: z.string().nullable().optional(),
  videoId: z.string().optional(),
  platform: z.string().optional(),
  language: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  canonicalUrl: z.string().nullable().optional(),
  photoGallery: z.array(z.any()).optional(),
});

export type VideoItem = z.infer<typeof VideoItemSchema>;

/**
 * Schema de estadísticas de Videos Main
 */
export const VideosStatsSchema = z.object({
  totalVideos: z.number().default(0),
  totalCategories: z.number().default(0),
  totalViews: z.number().default(0),
});

export type VideosStats = z.infer<typeof VideosStatsSchema>;

/**
 * Schema completo de Videos Main Response
 *
 * Retornado por: handleVideosMain() en videos-handler.ts:299
 *
 * NOTA: NO tiene crossContent (a diferencia de Articles)
 */
export const VideosMainSchema = z.object({
  type: z.literal('videos-main'),
  pageType: z.literal('videos-main'),
  seo: SEOSchema,
  featuredVideos: z.array(VideoItemSchema),
  recentVideos: z.array(VideoItemSchema),
  categories: z.array(CategorySchema),
  stats: VideosStatsSchema,
  debug: DebugInfoSchema.optional(),
  // Fallback error (solo si hay error)
  error: z.object({
    message: z.string(),
    details: z.string().optional(),
    fallback: z.boolean(),
  }).optional(),
});

export type VideosMainResponse = z.infer<typeof VideosMainSchema>;
