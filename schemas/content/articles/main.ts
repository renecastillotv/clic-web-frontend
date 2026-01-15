// schemas/content/articles/main.ts
// Schema para Articles Main (/articulos)
// Generado desde: edge/content-backend/articles-handler.ts:299 (handleArticlesMain)

import { z } from 'zod';
import { SEOSchema } from '../shared/seo';
import { CrossContentSchema, CategorySchema } from '../shared/cross-content';
import { AuthorSchema } from '../shared/author';

/**
 * Schema de un artículo individual (item en featuredArticles/recentArticles)
 */
export const ArticleItemSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  excerpt: z.string(),
  subtitle: z.string().optional(),
  content: z.string().optional(),
  featuredImage: z.string(),
  publishedAt: z.string(),
  views: z.number().default(0),
  readTime: z.string(),
  readTimeMinutes: z.number().default(5),
  featured: z.boolean().default(false),
  url: z.string(),
  slug: z.string(),
  slug_en: z.string().optional(),
  slug_fr: z.string().optional(),
  author: AuthorSchema,
  tags: z.array(z.object({
    id: z.union([z.string(), z.number()]),
    name: z.string(),
    slug: z.string(),
    color: z.string().optional(),
    category: z.string().optional(),
  })).default([]),
  category: z.string().optional(),
  language: z.string().optional(),
});

export type ArticleItem = z.infer<typeof ArticleItemSchema>;

/**
 * Schema de estadísticas de Articles Main
 */
export const ArticlesStatsSchema = z.object({
  totalArticles: z.number().default(0),
  totalCategories: z.number().default(0),
  totalViews: z.number().default(0),
  averageReadTime: z.number().default(0),
  publishedThisMonth: z.number().default(0),
  featuredCount: z.number().default(0),
  categoriesWithContent: z.number().default(0),
});

export type ArticlesStats = z.infer<typeof ArticlesStatsSchema>;

/**
 * Schema de debug info (presente en todas las respuestas)
 */
export const DebugInfoSchema = z.object({
  handlerVersion: z.string(),
  authorsLoaded: z.number().optional(),
  originalArticlesCount: z.number().optional(),
  crossContentTypes: z.array(z.string()).optional(),
  countryTagId: z.union([z.string(), z.number()]).optional(),
  popularTagsUsed: z.number().optional(),
  securityLevel: z.string().optional(),
  // Campos opcionales adicionales
  categoryId: z.union([z.string(), z.number()]).optional(),
  countryArticleIds: z.number().optional(),
  totalArticlesInCategory: z.number().optional(),
  articleId: z.union([z.string(), z.number()]).optional(),
  articleTagsUsed: z.number().optional(),
  hasAuthor: z.boolean().optional(),
  relatedArticlesCount: z.number().optional(),
  relatedVideosCount: z.number().optional(),
  relatedPropertiesCount: z.number().optional(),
  uniqueContentCounts: z.object({
    uniquePropertiesCount: z.number().optional(),
    uniqueVideosCount: z.number().optional(),
    uniqueArticlesCount: z.number().optional(),
  }).optional(),
});

export type DebugInfo = z.infer<typeof DebugInfoSchema>;

/**
 * Schema completo de Articles Main Response
 *
 * Retornado por: handleArticlesMain() en articles-handler.ts:446
 */
export const ArticlesMainSchema = z.object({
  type: z.literal('articles-main'),
  pageType: z.literal('articles-main'),
  contentType: z.literal('articles'),
  seo: SEOSchema,
  featuredArticles: z.array(ArticleItemSchema),
  recentArticles: z.array(ArticleItemSchema),
  categories: z.array(CategorySchema),
  stats: ArticlesStatsSchema,
  crossContent: CrossContentSchema,
  debug: DebugInfoSchema.optional(),
  // Fallback error (solo si hay error)
  error: z.object({
    message: z.string(),
    details: z.string().optional(),
    fallback: z.boolean(),
  }).optional(),
});

export type ArticlesMainResponse = z.infer<typeof ArticlesMainSchema>;
