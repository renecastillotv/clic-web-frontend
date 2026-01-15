# Content Schemas

Este directorio contiene los **schemas Zod** para validar las respuestas JSON de las edge functions de contenido.

## Estructura

```
schemas/content/
├── README.md (este archivo)
├── shared/
│   ├── seo.ts           # Schema de SEO común a todas las páginas
│   ├── pagination.ts    # Schema de paginación
│   ├── cross-content.ts # Contenido relacionado (videos, properties, articles, etc.)
│   └── author.ts        # Esquema de autor/agente
├── articles/
│   ├── main.ts          # Schema de /articulos (lista principal)
│   ├── category.ts      # Schema de /articulos/{category}
│   └── single.ts        # Schema de /articulos/{category}/{slug}
├── videos/
│   ├── main.ts          # Schema de /videos (lista principal)
│   ├── category.ts      # Schema de /videos/{category}
│   └── single.ts        # Schema de /videos/{category}/{slug}
├── testimonials/
│   ├── main.ts          # Schema de /testimonios (lista principal)
│   ├── category.ts      # Schema de /testimonios/{category}
│   └── single.ts        # Schema de /testimonios/{category}/{slug}
└── canonical.ts         # Schema unificado con discriminador
```

## Uso

```typescript
import { ArticlesMainSchema, type ArticlesMainResponse } from './articles/main';
import { ContentPageSchema, type ContentPage } from './canonical';

// Validar una respuesta específica
const response = await fetch('/api/articulos');
const data = await response.json();
const validated = ArticlesMainSchema.parse(data);

// Validar cualquier tipo de respuesta de contenido
const anyResponse = await fetch('/api/content');
const anyData = await anyResponse.json();
const validatedAny = ContentPageSchema.parse(anyData);
```

## Diferencias entre Familias

### Main (lista principal)
- **Articles**: `featuredArticles[]`, `recentArticles[]`, `crossContent`
- **Videos**: `featuredVideos[]`, `recentVideos[]`, NO tiene crossContent
- **Testimonials**: `featuredTestimonials[]`, `recentTestimonials[]`, NO tiene crossContent

### Category (filtrado por categoría)
- Todos tienen: `category`, `{items}[]`, `pagination`
- Solo Articles tiene `crossContent`

### Single (detalle individual)
- **Articles**: `crossContent{videos, properties}`
- **Videos**: `relatedVideos`, `relatedProperties`, `relatedArticles`, `areaAdvisors[]`, `photoGallery[]`, `videoTags[]`
- **Testimonials**: `crossContent{videos, properties, articles}`, `tags[]`

## Schemas Generados a partir de

- [edge/content-backend/articles-handler.ts](../../edge/content-backend/articles-handler.ts)
- [edge/content-backend/videos-handler.ts](../../edge/content-backend/videos-handler.ts)
- [edge/content-backend/testimonials-handler.ts](../../edge/content-backend/testimonials-handler.ts)

Fecha de generación: 2025-10-24
