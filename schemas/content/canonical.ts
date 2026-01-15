// schemas/content/canonical.ts
// Schema canónico unificado para todas las respuestas de contenido
// Usa discriminated union de Zod para validar cualquiera de las 9 respuestas

import { z } from 'zod';

// Articles
import { ArticlesMainSchema } from './articles/main';
import { ArticlesCategorySchema } from './articles/category';
import { ArticlesSingleSchema, ArticlesSingle404Schema } from './articles/single';

// Videos
import { VideosMainSchema } from './videos/main';
import { VideosCategorySchema } from './videos/category';
import { VideosSingleSchema, VideosSingle404Schema } from './videos/single';

// Testimonials
import { TestimonialsMainSchema } from './testimonials/main';
import { TestimonialsCategorySchema } from './testimonials/category';
import { TestimonialsSingleSchema } from './testimonials/single';

/**
 * Schema Canónico Unificado con Discriminador
 *
 * Valida cualquiera de las 9 respuestas de contenido usando el campo `type` como discriminador.
 *
 * Familias:
 * - Articles: 3 vistas (main, category, single)
 * - Videos: 3 vistas (main, category, single)
 * - Testimonials: 3 vistas (main, category, single)
 *
 * Uso:
 * ```typescript
 * import { ContentPageSchema, type ContentPage } from './canonical';
 *
 * const response = await fetch('/api/content');
 * const data = await response.json();
 * const validated = ContentPageSchema.parse(data);
 *
 * // TypeScript sabe el tipo exacto basado en el discriminador
 * if (validated.type === 'articles-main') {
 *   // validated es ArticlesMainResponse
 *   console.log(validated.featuredArticles);
 * }
 * ```
 */
export const ContentPageSchema = z.discriminatedUnion('type', [
  // Articles (3)
  ArticlesMainSchema,
  ArticlesCategorySchema,
  ArticlesSingleSchema,
  ArticlesSingle404Schema,

  // Videos (3 + 404)
  VideosMainSchema,
  VideosCategorySchema,
  VideosSingleSchema,
  VideosSingle404Schema,

  // Testimonials (3)
  TestimonialsMainSchema,
  TestimonialsCategorySchema,
  TestimonialsSingleSchema,
]);

/**
 * Type inference del schema canónico
 *
 * Unión discriminada de todos los tipos de respuesta
 */
export type ContentPage = z.infer<typeof ContentPageSchema>;

/**
 * Type guards para cada familia de contenido
 */
export const isArticlesResponse = (page: ContentPage): page is
  | z.infer<typeof ArticlesMainSchema>
  | z.infer<typeof ArticlesCategorySchema>
  | z.infer<typeof ArticlesSingleSchema> => {
  return page.type.startsWith('articles-');
};

export const isVideosResponse = (page: ContentPage): page is
  | z.infer<typeof VideosMainSchema>
  | z.infer<typeof VideosCategorySchema>
  | z.infer<typeof VideosSingleSchema> => {
  return page.type.startsWith('videos-');
};

export const isTestimonialsResponse = (page: ContentPage): page is
  | z.infer<typeof TestimonialsMainSchema>
  | z.infer<typeof TestimonialsCategorySchema>
  | z.infer<typeof TestimonialsSingleSchema> => {
  return page.type.startsWith('testimonials-');
};

/**
 * Alternativa: Schema con discriminador por `pageType` en vez de `type`
 *
 * (ambos campos existen y tienen el mismo valor en todas las respuestas)
 */
export const ContentPageByPageTypeSchema = z.discriminatedUnion('pageType', [
  ArticlesMainSchema,
  ArticlesCategorySchema,
  ArticlesSingleSchema,
  VideosMainSchema,
  VideosCategorySchema,
  VideosSingleSchema,
  TestimonialsMainSchema,
  TestimonialsCategorySchema,
  TestimonialsSingleSchema,
]);

/**
 * Schema con doble discriminador: kind (article|video|testimonial) + view (main|category|single)
 *
 * Propuesta de estructura alternativa más semántica:
 */
export const ContentKind = z.enum(['article', 'video', 'testimonial']);
export const ContentView = z.enum(['main', 'category', 'single']);

/**
 * Mapa de tipos para facilitar el acceso tipado
 */
export type ContentPageMap = {
  'articles-main': z.infer<typeof ArticlesMainSchema>;
  'articles-category': z.infer<typeof ArticlesCategorySchema>;
  'articles-single': z.infer<typeof ArticlesSingleSchema>;
  'articles-single-404': z.infer<typeof ArticlesSingle404Schema>;
  'videos-main': z.infer<typeof VideosMainSchema>;
  'videos-category': z.infer<typeof VideosCategorySchema>;
  'videos-single': z.infer<typeof VideosSingleSchema>;
  'videos-single-404': z.infer<typeof VideosSingle404Schema>;
  'testimonials-main': z.infer<typeof TestimonialsMainSchema>;
  'testimonials-category': z.infer<typeof TestimonialsCategorySchema>;
  'testimonials-single': z.infer<typeof TestimonialsSingleSchema>;
};

/**
 * Helper para obtener el tipo específico basado en el string literal
 */
export type GetContentPage<T extends keyof ContentPageMap> = ContentPageMap[T];
