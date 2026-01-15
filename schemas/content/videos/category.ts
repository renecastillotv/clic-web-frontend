// schemas/content/videos/category.ts
// Schema para Videos Category (/videos/{category})
// Generado desde: edge/content-backend/videos-handler.ts:326 (handleVideosCategory)

import { z } from 'zod';
import { SEOSchema } from '../shared/seo';
import { PaginationSchema } from '../shared/pagination';
import { CategorySchema } from '../shared/cross-content';
import { VideoItemSchema } from './main';
import { DebugInfoSchema } from '../articles/main';

/**
 * Schema completo de Videos Category Response
 *
 * Retornado por: handleVideosCategory() en videos-handler.ts:440
 *
 * NOTA: NO tiene crossContent (a diferencia de Articles Category)
 */
export const VideosCategorySchema = z.object({
  type: z.literal('videos-category'),
  pageType: z.literal('videos-category'),
  seo: SEOSchema,
  category: CategorySchema.extend({
    description: z.string().optional(),
  }),
  videos: z.array(VideoItemSchema),
  pagination: PaginationSchema,
  debug: DebugInfoSchema.optional(),
});

export type VideosCategoryResponse = z.infer<typeof VideosCategorySchema>;
