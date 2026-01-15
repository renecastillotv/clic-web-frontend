// schemas/content/EXAMPLES.ts
// Ejemplos de uso de los schemas de contenido

import {
  // Canonical
  ContentPageSchema,
  type ContentPage,
  isArticlesResponse,
  isVideosResponse,
  isTestimonialsResponse,

  // Articles
  ArticlesMainSchema,
  type ArticlesMainResponse,
  ArticlesCategorySchema,
  type ArticlesCategoryResponse,
  ArticlesSingleSchema,
  type ArticlesSingleResponse,

  // Videos
  VideosMainSchema,
  type VideosMainResponse,
  VideosCategorySchema,
  type VideosCategoryResponse,
  VideosSingleSchema,
  type VideosSingleResponse,

  // Testimonials
  TestimonialsMainSchema,
  type TestimonialsMainResponse,
  TestimonialsCategorySchema,
  type TestimonialsCategoryResponse,
  TestimonialsSingleSchema,
  type TestimonialsSingleResponse,
} from './index';

// ============================================================================
// EJEMPLO 1: Validar una respuesta específica (Articles Main)
// ============================================================================

async function example1_validateArticlesMain() {
  const response = await fetch('/api/articulos');
  const data = await response.json();

  // Opción A: Validar con schema específico
  const validated: ArticlesMainResponse = ArticlesMainSchema.parse(data);

  // Ahora 'validated' está completamente tipado
  console.log('Featured articles:', validated.featuredArticles.length);
  console.log('Recent articles:', validated.recentArticles.length);
  console.log('Categories:', validated.categories.length);
  console.log('Average read time:', validated.stats.averageReadTime);

  // Acceso a crossContent
  console.log('Cross-content videos:', validated.crossContent.videos.length);
  console.log('Cross-content properties:', validated.crossContent.properties.length);

  return validated;
}

// ============================================================================
// EJEMPLO 2: Validar cualquier tipo de respuesta con schema canónico
// ============================================================================

async function example2_validateAnyContentPage(url: string) {
  const response = await fetch(url);
  const data = await response.json();

  // Validar con schema canónico
  const page: ContentPage = ContentPageSchema.parse(data);

  // TypeScript infiere el tipo basado en el discriminador
  switch (page.type) {
    case 'articles-main':
      console.log('Articles Main:', page.featuredArticles.length, 'featured');
      break;

    case 'articles-category':
      console.log('Articles Category:', page.category.name, '-', page.articles.length, 'articles');
      console.log('Pagination:', page.pagination);
      break;

    case 'articles-single':
      console.log('Article:', page.article.title);
      console.log('Related articles:', page.relatedArticles.length);
      console.log('Cross-content:', {
        videos: page.crossContent.videos?.length || 0,
        properties: page.crossContent.properties?.length || 0,
      });
      break;

    case 'videos-main':
      console.log('Videos Main:', page.featuredVideos.length, 'featured');
      break;

    case 'videos-category':
      console.log('Videos Category:', page.category.name, '-', page.videos.length, 'videos');
      break;

    case 'videos-single':
      console.log('Video:', page.video.title);
      console.log('Video ID:', page.video.videoId);
      console.log('Platform:', page.video.platform);
      console.log('Related videos:', page.relatedVideos.length);
      console.log('Related properties:', page.relatedProperties.length);
      console.log('Area advisors:', page.areaAdvisors.length);
      console.log('Photo gallery:', page.photoGallery.length);
      console.log('Tags:', page.videoTags.length);
      // ExtendedSEO (solo Videos Single)
      console.log('Structured data:', page.seo.structured_data);
      console.log('Open Graph:', page.seo.open_graph);
      console.log('Twitter Card:', page.seo.twitter_card);
      break;

    case 'testimonials-main':
      console.log('Testimonials Main:', page.featuredTestimonials.length, 'featured');
      console.log('Average rating:', page.stats.averageRating);
      break;

    case 'testimonials-category':
      console.log('Testimonials Category:', page.category.name, '-', page.testimonials.length, 'testimonials');
      console.log('Average rating:', page.stats.averageRating);
      break;

    case 'testimonials-single':
      console.log('Testimonial:', page.testimonial.title);
      console.log('Client:', page.testimonial.clientName);
      console.log('Rating:', page.testimonial.rating);
      console.log('Cross-content:', {
        videos: page.crossContent.videos.length,
        properties: page.crossContent.properties.length,
        articles: page.crossContent.articles.length,
      });
      console.log('Tags:', page.tags.length);
      break;

    case 'articles-single-404':
    case 'videos-single-404':
      console.log('404 - Content not found');
      break;

    default:
      // TypeScript exhaustividad check
      const _exhaustive: never = page;
      return _exhaustive;
  }

  return page;
}

// ============================================================================
// EJEMPLO 3: Type Guards
// ============================================================================

async function example3_typeGuards(url: string) {
  const response = await fetch(url);
  const data = await response.json();

  const page: ContentPage = ContentPageSchema.parse(data);

  // Usar type guards
  if (isArticlesResponse(page)) {
    console.log('Es una respuesta de Articles');
    // page puede ser ArticlesMain | ArticlesCategory | ArticlesSingle
  }

  if (isVideosResponse(page)) {
    console.log('Es una respuesta de Videos');
    // page puede ser VideosMain | VideosCategory | VideosSingle
  }

  if (isTestimonialsResponse(page)) {
    console.log('Es una respuesta de Testimonials');
    // page puede ser TestimonialsMain | TestimonialsCategory | TestimonialsSingle
  }
}

// ============================================================================
// EJEMPLO 4: Validación con manejo de errores
// ============================================================================

async function example4_safeValidation(url: string) {
  const response = await fetch(url);
  const data = await response.json();

  // Opción A: parse (lanza error si falla)
  try {
    const page = ContentPageSchema.parse(data);
    console.log('Validación exitosa:', page.type);
    return { success: true, data: page };
  } catch (error) {
    console.error('Error de validación:', error);
    return { success: false, error };
  }
}

async function example4_safeValidation_v2(url: string) {
  const response = await fetch(url);
  const data = await response.json();

  // Opción B: safeParse (no lanza error)
  const result = ContentPageSchema.safeParse(data);

  if (result.success) {
    console.log('Validación exitosa:', result.data.type);
    return { success: true, data: result.data };
  } else {
    console.error('Error de validación:', result.error.errors);
    return { success: false, errors: result.error.errors };
  }
}

// ============================================================================
// EJEMPLO 5: Validación en un handler de Astro
// ============================================================================

// En un archivo .astro o API route de Astro:
/*
---
import { ContentPageSchema, type ContentPage } from '@/schemas/content';

const response = await fetch('https://your-edge-function.vercel.app/api/articulos');
const data = await response.json();

// Validar la respuesta
const validatedPage: ContentPage = ContentPageSchema.parse(data);

// Pasar los datos validados al componente
---

{validatedPage.type === 'articles-main' && (
  <div>
    <h1>{validatedPage.seo.h1}</h1>
    <p>{validatedPage.seo.description}</p>

    <section>
      <h2>Featured Articles</h2>
      {validatedPage.featuredArticles.map(article => (
        <article key={article.id}>
          <h3>{article.title}</h3>
          <p>{article.excerpt}</p>
          <a href={article.url}>Read more</a>
        </article>
      ))}
    </section>

    <section>
      <h2>Recent Articles</h2>
      {validatedPage.recentArticles.map(article => (
        <article key={article.id}>
          <h3>{article.title}</h3>
          <p>{article.excerpt}</p>
          <span>By {article.author.name}</span>
        </article>
      ))}
    </section>

    <aside>
      <h3>Cross-Content</h3>
      {validatedPage.crossContent.videos.length > 0 && (
        <div>
          <h4>Related Videos</h4>
          {validatedPage.crossContent.videos.map(video => (
            <div key={video.id}>
              <img src={video.thumbnail} alt={video.title} />
              <a href={video.url}>{video.title}</a>
            </div>
          ))}
        </div>
      )}
    </aside>
  </div>
)}
*/

// ============================================================================
// EJEMPLO 6: Composición de schemas para custom use cases
// ============================================================================

import { z } from 'zod';

// Crear un schema custom que solo extrae los items
const ArticleItemsOnlySchema = z.union([
  ArticlesMainSchema.transform(data => data.featuredArticles.concat(data.recentArticles)),
  ArticlesCategorySchema.transform(data => data.articles),
  ArticlesSingleSchema.transform(data => [data.article]),
]);

async function example6_extractArticles(url: string) {
  const response = await fetch(url);
  const data = await response.json();

  // Extraer solo los artículos, sin importar el tipo de vista
  const articles = ArticleItemsOnlySchema.parse(data);

  console.log('Total articles extracted:', articles.length);
  return articles;
}

// ============================================================================
// EJEMPLO 7: Validación parcial (solo campos necesarios)
// ============================================================================

// Schema parcial para solo validar SEO
const SEOOnlySchema = z.object({
  type: z.string(),
  seo: z.object({
    title: z.string(),
    description: z.string(),
    canonical_url: z.string(),
  }),
});

async function example7_validateOnlySEO(url: string) {
  const response = await fetch(url);
  const data = await response.json();

  // Solo validar campos SEO
  const { seo } = SEOOnlySchema.parse(data);

  console.log('SEO Title:', seo.title);
  console.log('SEO Description:', seo.description);
  console.log('Canonical URL:', seo.canonical_url);

  return seo;
}

// ============================================================================
// EXPORTS (opcional - para testing)
// ============================================================================

export {
  example1_validateArticlesMain,
  example2_validateAnyContentPage,
  example3_typeGuards,
  example4_safeValidation,
  example4_safeValidation_v2,
  example6_extractArticles,
  example7_validateOnlySEO,
};
