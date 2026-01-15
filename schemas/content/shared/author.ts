// schemas/content/shared/author.ts
// Schemas de autor/agente común a Articles, Videos y Testimonials
// Generado desde: edge/content-backend/{articles,videos,testimonials}-handler.ts

import { z } from 'zod';

/**
 * Schema de autor/agente básico
 *
 * Usado en:
 * - Articles (author)
 * - Videos (author)
 * - Testimonials (agent)
 * - CrossContent items (author)
 */
export const AuthorSchema = z.object({
  name: z.string(),
  avatar: z.string(),
  slug: z.string().nullable(),
  position: z.string().nullable().optional(),
  country: z.string().optional(),
  bio: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
});

export type Author = z.infer<typeof AuthorSchema>;

/**
 * Schema de asesor de área (usado solo en Videos Single)
 */
export const AreaAdvisorSchema = z.object({
  id: z.union([z.string(), z.number()]),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  position: z.string().nullable().optional(),
  avatar: z.string(),
  yearsExperience: z.number().default(0),
  specialtyDescription: z.string().nullable().optional(),
  role: z.string().optional(),
  order: z.number().default(1),
  weight: z.number().default(1),
  email: z.string().nullable().optional(),
  slug: z.string(),
  url: z.string().nullable(),
});

export type AreaAdvisor = z.infer<typeof AreaAdvisorSchema>;
