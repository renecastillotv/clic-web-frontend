// schemas/content/shared/pagination.ts
// Schema de paginación común a las vistas Category
// Generado desde: edge/content-backend/{articles,videos,testimonials}-handler.ts

import { z } from 'zod';

/**
 * Schema de paginación
 *
 * Presente en:
 * - ArticlesCategoryResponse
 * - VideosCategoryResponse
 * - TestimonialsCategoryResponse
 *
 * NO presente en:
 * - Vistas Main (solo muestran los primeros N items)
 * - Vistas Single (no tienen paginación)
 */
export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type Pagination = z.infer<typeof PaginationSchema>;
