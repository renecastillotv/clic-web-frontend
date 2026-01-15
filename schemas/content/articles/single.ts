// schemas/content/articles/single.ts
// Schema para Articles Single (/articulos/{category}/{slug})
// Generado desde: edge/content-backend/articles-handler.ts:680 (handleSingleArticle)

import { z } from 'zod';
import { SEOSchema } from '../shared/seo';
import { CategorySchema, PartialCrossContentSchema } from '../shared/cross-content';
import { ArticleItemSchema, DebugInfoSchema } from './main';

/**
 * Schema completo de Articles Single Response
 *
 * Retornado por: handleSingleArticle() en articles-handler.ts:1148
 */
export const ArticlesSingleSchema = z.object({
  type: z.literal('articles-single'),
  pageType: z.literal('articles-single'),
  contentType: z.literal('articles'),
  found: z.literal(true),
  seo: SEOSchema,
  article: ArticleItemSchema,
  relatedArticles: z.array(ArticleItemSchema),
  category: CategorySchema,
  // crossContent solo contiene videos y properties (no articles/testimonials/faqs)
  crossContent: z.object({
    videos: z.array(z.any()).default([]),
    properties: z.array(z.any()).default([]),
  }),
  debug: DebugInfoSchema.optional(),
});

export type ArticlesSingleResponse = z.infer<typeof ArticlesSingleSchema>;

/**
 * Schema de respuesta 404 para artículo no encontrado
 */
export const ArticlesSingle404Schema = z.object({
  type: z.literal('articles-single-404'),
  found: z.literal(false).optional(),
  // Puede contener artículos sugeridos
});

export type ArticlesSingle404Response = z.infer<typeof ArticlesSingle404Schema>;
