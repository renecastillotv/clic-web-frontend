# Análisis Completo de Schemas de Contenido

## 📊 Resumen Ejecutivo

Se han analizado **9 funciones handler** en [edge/content-backend/](../../edge/content-backend/) que devuelven respuestas JSON estructuradas para:
- **Articles** (artículos): 3 vistas
- **Videos**: 3 vistas
- **Testimonials** (testimonios): 3 vistas

## 🗂️ Handlers Identificados

| # | Handler | Vista | Ruta Ejemplo | Código Fuente |
|---|---------|-------|--------------|---------------|
| 1 | Articles | Main | `/articulos` | [articles-handler.ts:299](../../edge/content-backend/articles-handler.ts#L299) |
| 2 | Articles | Category | `/articulos/guias-compra` | [articles-handler.ts:471](../../edge/content-backend/articles-handler.ts#L471) |
| 3 | Articles | Single | `/articulos/guias-compra/como-comprar` | [articles-handler.ts:680](../../edge/content-backend/articles-handler.ts#L680) |
| 4 | Videos | Main | `/videos` | [videos-handler.ts:135](../../edge/content-backend/videos-handler.ts#L135) |
| 5 | Videos | Category | `/videos/tours-virtuales` | [videos-handler.ts:326](../../edge/content-backend/videos-handler.ts#L326) |
| 6 | Videos | Single | `/videos/tours-virtuales/penthouse` | [videos-handler.ts:462](../../edge/content-backend/videos-handler.ts#L462) |
| 7 | Testimonials | Main | `/testimonios` | [testimonials-handler.ts:6](../../edge/content-backend/testimonials-handler.ts#L6) |
| 8 | Testimonials | Category | `/testimonios/compradores` | [testimonials-handler.ts:78](../../edge/content-backend/testimonials-handler.ts#L78) |
| 9 | Testimonials | Single | `/testimonios/compradores/juan` | [testimonials-handler.ts:151](../../edge/content-backend/testimonials-handler.ts#L151) |

---

## 🔍 Schemas Generados (9 archivos + 4 shared)

### Estructura de archivos:

```
schemas/content/
├── README.md
├── ANALYSIS.md (este archivo)
├── index.ts (barrel exports)
├── canonical.ts (schema unificado)
├── shared/
│   ├── seo.ts
│   ├── pagination.ts
│   ├── author.ts
│   └── cross-content.ts
├── articles/
│   ├── main.ts (ArticlesMainSchema)
│   ├── category.ts (ArticlesCategorySchema)
│   └── single.ts (ArticlesSingleSchema)
├── videos/
│   ├── main.ts (VideosMainSchema)
│   ├── category.ts (VideosCategorySchema)
│   └── single.ts (VideosSingleSchema)
└── testimonials/
    ├── main.ts (TestimonialsMainSchema)
    ├── category.ts (TestimonialsCategorySchema)
    └── single.ts (TestimonialsSingleSchema)
```

---

## 📋 Diferencias Entre Familias

### 1. **Campos Comunes a TODAS las respuestas:**

Todos los handlers devuelven:
- `type` / `pageType` (discriminadores)
- `seo` (SEO metadata)
- `debug` (información de debugging)

### 2. **Vista MAIN (lista principal):**

| Campo | Articles | Videos | Testimonials |
|-------|----------|--------|--------------|
| **Featured items** | `featuredArticles[]` | `featuredVideos[]` | `featuredTestimonials[]` |
| **Recent items** | `recentArticles[]` | `recentVideos[]` | `recentTestimonials[]` |
| **Categories** | ✅ `categories[]` | ✅ `categories[]` | ✅ `categories[]` |
| **Stats** | ✅ 7 campos | ✅ 3 campos | ✅ 5 campos |
| **CrossContent** | ✅ Sí | ❌ No | ❌ No |
| **Pagination** | ❌ No | ❌ No | ❌ No |

**Stats por familia:**
- **Articles**: `totalArticles`, `totalCategories`, `totalViews`, `averageReadTime`, `publishedThisMonth`, `featuredCount`, `categoriesWithContent`
- **Videos**: `totalVideos`, `totalCategories`, `totalViews`
- **Testimonials**: `totalTestimonials`, `averageRating`, `totalCategories`, `totalViews`, `verifiedClients`

### 3. **Vista CATEGORY (filtrado por categoría):**

| Campo | Articles | Videos | Testimonials |
|-------|----------|--------|--------------|
| **Category** | ✅ `category{}` | ✅ `category{}` | ✅ `category{}` |
| **Items array** | `articles[]` | `videos[]` | `testimonials[]` |
| **Pagination** | ✅ Sí | ✅ Sí | ✅ Sí |
| **CrossContent** | ✅ Sí | ❌ No | ❌ No |
| **Stats** | ❌ No | ❌ No | ✅ Sí |

### 4. **Vista SINGLE (detalle individual):**

| Campo | Articles | Videos | Testimonials |
|-------|----------|--------|--------------|
| **Main item** | `article{}` | `video{}` | `testimonial{}` |
| **Related items** | `relatedArticles[]` | `relatedVideos[]` | `relatedTestimonials[]` |
| **Category** | ✅ `category{}` | ✅ `category{}` | ✅ `category{}` |
| **CrossContent** | ✅ videos, properties | ❌ No (usa relatedX) | ✅ videos, properties, articles |
| **SEO Type** | `SEOSchema` | `ExtendedSEOSchema` | `SEOSchema` |
| **Unique Fields** | - | `areaAdvisors[]`, `photoGallery[]`, `videoTags[]`, `videoId`, `platform` | `tags[]`, `rating`, `clientName`, `clientAvatar`, `clientVerified` |

**Diferencias clave en Single:**
- **Articles**: `crossContent{videos, properties}` (solo 2 tipos)
- **Videos**: NO usa crossContent, tiene `relatedVideos[]`, `relatedProperties[]`, `relatedArticles[]`, `areaAdvisors[]`, `photoGallery[]`, `videoTags[]`
- **Testimonials**: `crossContent{videos, properties, articles}` + `tags[]`

### 5. **SEO Metadata:**

| Vista | Articles | Videos | Testimonials |
|-------|----------|--------|--------------|
| **Main** | `SEOSchema` | `SEOSchema` | `SEOSchema` |
| **Category** | `SEOSchema` | `SEOSchema` | `SEOSchema` |
| **Single** | `SEOSchema` | `ExtendedSEOSchema` | `SEOSchema` |

**ExtendedSEOSchema** (solo Videos Single) incluye:
- `structured_data` (Schema.org VideoObject)
- `open_graph` (Open Graph metadata)
- `twitter_card` (Twitter Card metadata)

### 6. **Paginación:**

| Vista | Tiene Paginación |
|-------|------------------|
| **Main** | ❌ No (todas las familias) |
| **Category** | ✅ Sí (todas las familias) |
| **Single** | ❌ No (todas las familias) |

**Schema de Pagination:**
```typescript
{
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

---

## 🎯 Schema Canónico Propuesto

### Opción 1: Discriminated Union por `type`

```typescript
const ContentPageSchema = z.discriminatedUnion('type', [
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

export type ContentPage = z.infer<typeof ContentPageSchema>;
```

**Ventajas:**
- TypeScript infiere automáticamente el tipo basado en `type`
- Validación en runtime con Zod
- Exhaustividad garantizada en switch/if

**Uso:**
```typescript
import { ContentPageSchema, type ContentPage } from './canonical';

const response = await fetch('/api/articulos');
const data = await response.json();
const validated = ContentPageSchema.parse(data);

// TypeScript sabe el tipo exacto
if (validated.type === 'articles-main') {
  console.log(validated.featuredArticles); // ✅ OK
  // console.log(validated.videos); // ❌ Error de tipo
}
```

### Opción 2: Doble Discriminador (kind + view)

**Propuesta alternativa más semántica:**

```typescript
type ContentKind = 'article' | 'video' | 'testimonial';
type ContentView = 'main' | 'category' | 'single';

type ContentPageAlt =
  | { kind: 'article'; view: 'main'; data: ArticlesMainResponse }
  | { kind: 'article'; view: 'category'; data: ArticlesCategoryResponse }
  | { kind: 'article'; view: 'single'; data: ArticlesSingleResponse }
  | { kind: 'video'; view: 'main'; data: VideosMainResponse }
  | { kind: 'video'; view: 'category'; data: VideosCategoryResponse }
  | { kind: 'video'; view: 'single'; data: VideosSingleResponse }
  | { kind: 'testimonial'; view: 'main'; data: TestimonialsMainResponse }
  | { kind: 'testimonial'; view: 'category'; data: TestimonialsCategoryResponse }
  | { kind: 'testimonial'; view: 'single'; data: TestimonialsSingleResponse };
```

**Ventajas:**
- Más semántico y legible
- Permite agrupar por `kind` o por `view`

**Desventajas:**
- Requiere restructurar las respuestas de los handlers
- Rompe compatibilidad con el código existente

---

## 💡 Recomendaciones

1. **Usar el schema canónico discriminado** ([canonical.ts](./canonical.ts)) para validar respuestas de cualquier handler
2. **Importar schemas específicos** cuando se sepa el tipo exacto de respuesta
3. **Considerar agregar `kind` y `view`** como campos adicionales en futuras versiones para mejor semántica
4. **Normalizar crossContent** entre familias:
   - **Actual**: Articles/Testimonials usan `crossContent`, Videos usa `relatedX` separados
   - **Propuesta**: Unificar en un solo formato `crossContent`

5. **Agregar validación de runtime** en los handlers usando los schemas generados

---

## 📝 Uso de los Schemas

### Importación Específica:

```typescript
import { ArticlesMainSchema, type ArticlesMainResponse } from '@/schemas/content/articles/main';

// Validar respuesta
const data = await fetch('/api/articulos').then(r => r.json());
const validated: ArticlesMainResponse = ArticlesMainSchema.parse(data);
```

### Importación desde Barrel:

```typescript
import { ArticlesMainSchema, VideosSingleSchema } from '@/schemas/content';
```

### Validación con Schema Canónico:

```typescript
import { ContentPageSchema, type ContentPage } from '@/schemas/content/canonical';

const response = await fetch('/api/content');
const data = await response.json();

// Valida y devuelve el tipo correcto
const page: ContentPage = ContentPageSchema.parse(data);

// TypeScript infiere el tipo basado en el discriminador
switch (page.type) {
  case 'articles-main':
    console.log(page.featuredArticles); // ✅ Tipado correcto
    break;
  case 'videos-single':
    console.log(page.video.videoId); // ✅ Tipado correcto
    break;
  // ... etc
}
```

---

## 🔧 Próximos Pasos

1. ✅ **Schemas generados** (completado)
2. ⏳ **Agregar validación en handlers** (pendiente)
3. ⏳ **Pruebas unitarias de schemas** (pendiente)
4. ⏳ **Documentación de API** generada desde schemas (pendiente)
5. ⏳ **Normalizar estructura de crossContent** (opcional)

---

**Fecha de generación:** 2025-10-24
**Archivos analizados:**
- [edge/content-backend/articles-handler.ts](../../edge/content-backend/articles-handler.ts)
- [edge/content-backend/videos-handler.ts](../../edge/content-backend/videos-handler.ts)
- [edge/content-backend/testimonials-handler.ts](../../edge/content-backend/testimonials-handler.ts)
