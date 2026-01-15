// schemas/content/shared/cross-content.ts
// Schemas de contenido relacionado (cross-content)
// Generado desde: edge/content-backend/{articles,videos,testimonials}-handler.ts

import { z } from 'zod';
import { AuthorSchema } from './author';

/**
 * Schema de categoría (usado en items de cross-content)
 */
export const CategorySchema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string(),
  slug: z.string(),
  url: z.string().optional(),
  description: z.string().optional(),
  articleCount: z.number().optional(),
  videoCount: z.number().optional(),
});

export type Category = z.infer<typeof CategorySchema>;

/**
 * Schema de video en cross-content
 * Usado en Articles Single y Testimonials Single
 */
export const CrossContentVideoSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  description: z.string().optional(),
  thumbnail: z.string(),
  videoId: z.string().optional(),
  platform: z.string().optional(),
  duration: z.string().optional(),
  views: z.number().default(0),
  featured: z.boolean().optional(),
  publishedAt: z.string().optional(),
  url: z.string(),
  slug: z.string(),
  author: AuthorSchema.optional(),
  category: z.string().optional(),
});

export type CrossContentVideo = z.infer<typeof CrossContentVideoSchema>;

/**
 * Schema de propiedad en cross-content
 * Usado en Articles, Videos y Testimonials Single
 */
export const CrossContentPropertySchema = z.object({
  id: z.union([z.string(), z.number()]),
  code: z.string().optional(),
  name: z.string(),
  description: z.string().optional(),
  price: z.string(),
  image: z.string(),
  images: z.array(z.string()).optional(),
  bedrooms: z.number().default(0),
  bathrooms: z.number().default(0),
  area: z.number().default(0),
  location: z.string().optional(),
  category: z.string().optional(),
  is_project: z.boolean().default(false),
  url: z.string(),
  slug: z.string(),
  // Campos adicionales en español (para compatibilidad)
  titulo: z.string().optional(),
  precio: z.string().optional(),
  imagen: z.string().optional(),
  imagenes: z.array(z.string()).optional(),
  habitaciones: z.number().optional(),
  banos: z.number().optional(),
  metros: z.number().optional(),
  metros_terreno: z.number().optional(),
  sector: z.string().optional(),
  ciudad: z.string().optional(),
  tipo: z.string().optional(),
});

export type CrossContentProperty = z.infer<typeof CrossContentPropertySchema>;

/**
 * Schema de artículo en cross-content
 * Usado en Videos Single y Testimonials Single
 */
export const CrossContentArticleSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  excerpt: z.string(),
  featuredImage: z.string().optional(),
  image: z.string().optional(),
  publishedAt: z.string().optional(),
  published_at: z.string().optional(),
  views: z.number().default(0),
  readTime: z.string().optional(),
  readTimeMinutes: z.number().optional(),
  url: z.string(),
  slug: z.string(),
  author: AuthorSchema.optional(),
  category: z.string().optional(),
});

export type CrossContentArticle = z.infer<typeof CrossContentArticleSchema>;

/**
 * Schema de testimonio en cross-content
 */
export const CrossContentTestimonialSchema = z.object({
  id: z.union([z.string(), z.number()]),
  title: z.string(),
  excerpt: z.string(),
  rating: z.number().min(1).max(5).default(5),
  clientName: z.string(),
  clientAvatar: z.string(),
  clientLocation: z.string().optional(),
  featured: z.boolean().optional(),
  publishedAt: z.string(),
  url: z.string(),
  slug: z.string(),
});

export type CrossContentTestimonial = z.infer<typeof CrossContentTestimonialSchema>;

/**
 * Schema de FAQ en cross-content
 */
export const CrossContentFAQSchema = z.object({
  id: z.union([z.string(), z.number()]),
  question: z.string(),
  answer: z.string(),
});

export type CrossContentFAQ = z.infer<typeof CrossContentFAQSchema>;

/**
 * Schema de CrossContent completo
 * Usado en Articles Main/Category/Single
 */
export const CrossContentSchema = z.object({
  videos: z.array(CrossContentVideoSchema).default([]),
  properties: z.array(CrossContentPropertySchema).default([]),
  articles: z.array(CrossContentArticleSchema).default([]),
  testimonials: z.array(CrossContentTestimonialSchema).default([]),
  faqs: z.array(CrossContentFAQSchema).default([]),
});

export type CrossContent = z.infer<typeof CrossContentSchema>;

/**
 * Schema de CrossContent parcial
 * Usado en Articles/Videos/Testimonials Single (solo algunos tipos)
 */
export const PartialCrossContentSchema = z.object({
  videos: z.array(CrossContentVideoSchema).optional(),
  properties: z.array(CrossContentPropertySchema).optional(),
  articles: z.array(CrossContentArticleSchema).optional(),
  testimonials: z.array(CrossContentTestimonialSchema).optional(),
  faqs: z.array(CrossContentFAQSchema).optional(),
});

export type PartialCrossContent = z.infer<typeof PartialCrossContentSchema>;
