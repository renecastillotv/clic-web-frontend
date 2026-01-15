// schemas/content/articles/category.ts
// Schema para Articles Category (/articulos/{category})
// Generado desde: edge/content-backend/articles-handler.ts:471 (handleArticlesCategory)

import { z } from 'zod';
import { SEOSchema } from '../shared/seo';
import { PaginationSchema } from '../shared/pagination';
import { CrossContentSchema, CategorySchema } from '../shared/cross-content';
import { ArticleItemSchema, DebugInfoSchema } from './main';

/**
 * Schema completo de Articles Category Response
 *
 * Retornado por: handleArticlesCategory() en articles-handler.ts:622
 */
export const ArticlesCategorySchema = z.object({
  type: z.literal('articles-category'),
  pageType: z.literal('articles-category'),
  contentType: z.literal('articles'),
  seo: SEOSchema,
  category: CategorySchema,
  articles: z.array(ArticleItemSchema),
  crossContent: CrossContentSchema,
  pagination: PaginationSchema,
  debug: DebugInfoSchema.optional(),
});

export type ArticlesCategoryResponse = z.infer<typeof ArticlesCategorySchema>;
