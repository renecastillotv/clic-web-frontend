// schemas/content/videos/single.ts
// Schema para Videos Single (/videos/{category}/{slug})
// Generado desde: edge/content-backend/videos-handler.ts:462 (handleSingleVideo)

import { z } from 'zod';
import { ExtendedSEOSchema } from '../shared/seo';
import { CategorySchema, CrossContentVideoSchema, CrossContentPropertySchema, CrossContentArticleSchema } from '../shared/cross-content';
import { AreaAdvisorSchema } from '../shared/author';
import { VideoItemSchema } from './main';
import { DebugInfoSchema } from '../articles/main';

/**
 * Schema de foto de galería (photoGallery)
 */
export const PhotoGalleryItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  url: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  order: z.number().default(0),
});

export type PhotoGalleryItem = z.infer<typeof PhotoGalleryItemSchema>;

/**
 * Schema de tag de video
 */
export const VideoTagSchema = z.object({
  id: z.union([z.string(), z.number()]),
  name: z.string(),
  category: z.string().optional(),
  display_name: z.string().optional(),
  display_name_en: z.string().optional(),
  display_name_fr: z.string().optional(),
  slug: z.string(),
  slug_en: z.string().optional(),
  slug_fr: z.string().optional(),
});

export type VideoTag = z.infer<typeof VideoTagSchema>;

/**
 * Schema completo de Videos Single Response
 *
 * Retornado por: handleSingleVideo() en videos-handler.ts:1052
 *
 * DIFERENCIAS con Articles/Testimonials Single:
 * - Usa ExtendedSEOSchema (con structured_data, open_graph, twitter_card)
 * - Tiene relatedVideos, relatedProperties, relatedArticles (NO usa crossContent)
 * - Tiene areaAdvisors[], photoGallery[], videoTags[]
 */
export const VideosSingleSchema = z.object({
  type: z.literal('videos-single'),
  pageType: z.literal('videos-single'),
  found: z.literal(true),
  seo: ExtendedSEOSchema,
  video: VideoItemSchema,
  relatedVideos: z.array(CrossContentVideoSchema),
  relatedProperties: z.array(CrossContentPropertySchema),
  relatedArticles: z.array(CrossContentArticleSchema),
  areaAdvisors: z.array(AreaAdvisorSchema).default([]),
  photoGallery: z.array(PhotoGalleryItemSchema).default([]),
  videoTags: z.array(VideoTagSchema).default([]),
  category: CategorySchema.extend({
    description: z.string().optional(),
  }),
  debug: DebugInfoSchema.extend({
    videoId: z.union([z.string(), z.number()]).optional(),
    countryTagId: z.union([z.string(), z.number()]).optional(),
    tagsCount: z.number().optional(),
    areaAdvisorsCount: z.number().optional(),
    photoGalleryCount: z.number().optional(),
    videoTagsCount: z.number().optional(),
    preloadedData: z.object({
      hasPhotoGallery: z.boolean().optional(),
      hasRelatedVideos: z.boolean().optional(),
      hasRelatedArticles: z.boolean().optional(),
      hasAreaAdvisors: z.boolean().optional(),
      hasSimilarProperties: z.boolean().optional(),
    }).optional(),
  }).optional(),
});

export type VideosSingleResponse = z.infer<typeof VideosSingleSchema>;

/**
 * Schema de respuesta 404 para video no encontrado
 */
export const VideosSingle404Schema = z.object({
  type: z.literal('videos-single-404'),
  pageType: z.literal('videos-single-404'),
  found: z.literal(false),
  requestedPath: z.string(),
  seo: z.any(),
  suggestedVideos: z.array(VideoItemSchema).default([]),
  category: z.object({
    name: z.string(),
    slug: z.string(),
  }),
});

export type VideosSingle404Response = z.infer<typeof VideosSingle404Schema>;
