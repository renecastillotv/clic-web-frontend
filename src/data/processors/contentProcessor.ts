// src/data/processors/contentProcessor.ts
// =====================================================
// PROCESAMIENTO DE CONTENIDO (FAQs, VIDEOS, BREADCRUMBS)
// =====================================================

import type { ProcessedFAQs, ProcessedVideos, Breadcrumb, PropertyData } from '../types/interfaces.js';
import { sanitizeText, cleanDescription, createSlug } from './utilityProcessors.js';

// =====================================================
// PROCESAMIENTO DE FAQs
// =====================================================

export function processFAQsForDisplay(relatedContent: any, property: any, isProject: boolean): ProcessedFAQs {
  console.log('❓ === PROCESANDO FAQs PARA MOSTRAR ===');
  
  function cleanFAQText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/<b>(.*?)<\/b>/gi, '$1')
      .replace(/<strong>(.*?)<\/strong>/gi, '$1')
      .replace(/<i>(.*?)<\/i>/gi, '$1')
      .replace(/<em>(.*?)<\/em>/gi, '$1')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<p>(.*?)<\/p>/gi, '$1 ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  const allFaqs = [];
  
  // Procesar FAQs de la API con prioridades
  if (relatedContent?.faqs) {
    relatedContent.faqs.forEach((faq: any) => {
      allFaqs.push({
        question: cleanFAQText(faq.question),
        answer: cleanFAQText(faq.answer),
        source: faq.content_priority || 'api',
        priority: faq.content_priority === 'specific' ? 1 : 
                 faq.content_priority === 'tag_related' ? 2 : 3,
        isSpecific: faq.content_priority === 'specific' || faq.is_property_specific,
        isTagRelated: faq.content_priority === 'tag_related' || faq.is_tag_related
      });
    });
  }

  // Procesar SEO content tipo FAQ
  if (relatedContent?.seo_content) {
    relatedContent.seo_content
      .filter((item: any) => item.content_type === 'faq')
      .forEach((seoItem: any) => {
        allFaqs.push({
          question: cleanFAQText(seoItem.title),
          answer: cleanFAQText(seoItem.description || seoItem.content),
          source: 'seo_content',
          priority: 4,
          isSpecific: false,
          isTagRelated: true
        });
      });
  }

  // FAQs de fallback contextualizados
  const fallbackFaqs = [
    {
      question: "¿Cómo funciona el proceso de compra?",
      answer: "El proceso incluye: 1) Selección de propiedad, 2) Verificación legal, 3) Negociación, 4) Financiamiento, 5) Firma y entrega de llaves. Te acompañamos en cada paso para garantizar una transacción segura y transparente.",
      source: 'fallback',
      priority: 5,
      isSpecific: false,
      isTagRelated: false
    },
    {
      question: isProject ? "¿Cuándo es la entrega del proyecto?" : "¿La propiedad está lista para habitar?",
      answer: isProject 
        ? "La entrega está programada según el cronograma del desarrollador. El proyecto cuenta con garantías de construcción y seguimiento durante toda la edificación."
        : "Esta propiedad está lista para mudarse inmediatamente. Cuenta con todos los servicios básicos conectados y documentación legal al día.",
      source: 'fallback',
      priority: 5,
      isSpecific: false,
      isTagRelated: false
    },
    {
      question: "¿Qué incluye el Bono Primera Vivienda?",
      answer: "El Bono Primera Vivienda puede cubrir hasta RD$300,000 del valor de la propiedad. Incluye subsidio del gobierno y beneficios fiscales para compradores elegibles.",
      source: 'fallback',
      priority: 5,
      isSpecific: false,
      isTagRelated: false
    },
    {
      question: "¿Ofrecen opciones de financiamiento?",
      answer: "Trabajamos con los principales bancos del país para ofrecerte las mejores opciones de financiamiento. Disponible hasta 80% del valor con tasas preferenciales.",
      source: 'fallback',
      priority: 5,
      isSpecific: false,
      isTagRelated: false
    },
    {
      question: `¿Por qué invertir en ${property?.sector || property?.location || 'esta zona'}?`,
      answer: `${property?.sector || property?.location || 'Esta zona'} es una zona de alta valorización con excelente conectividad, servicios cercanos y crecimiento sostenido. Ideal para inversión y residencia.`,
      source: 'fallback',
      priority: 5,
      isSpecific: false,
      isTagRelated: false
    }
  ];

  // Si no hay FAQs de la API, usar fallback
  if (allFaqs.length === 0) {
    allFaqs.push(...fallbackFaqs);
  }

  // Ordenar por prioridad y retornar máximo 6
  const sortedFaqs = allFaqs
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6);

  console.log('✅ FAQs procesados:', {
    total: sortedFaqs.length,
    specific: sortedFaqs.filter(f => f.isSpecific).length,
    tagRelated: sortedFaqs.filter(f => f.isTagRelated).length,
    fallback: sortedFaqs.filter(f => f.source === 'fallback').length
  });

  return {
    faqs: sortedFaqs,
    hasSpecificFaqs: sortedFaqs.some(f => f.isSpecific),
    hasTagRelatedFaqs: sortedFaqs.some(f => f.isTagRelated),
    totalCount: sortedFaqs.length,
    sources: [...new Set(sortedFaqs.map(f => f.source))]
  };
}

// =====================================================
// PROCESAMIENTO DE VIDEOS
// =====================================================

export function processVideosForDisplay(videoSource: any, property: any): ProcessedVideos {
  console.log('🎥 === PROCESANDO VIDEOS PARA MOSTRAR ===');
  console.log('📊 Fuente recibida:', {
    hasVideos: !!videoSource?.videos,
    videosCount: videoSource?.videos?.length || 0,
    hasSeoContent: !!videoSource?.seo_content,
    seoContentCount: videoSource?.seo_content?.length || 0,
    sourceType: videoSource === null ? 'null' : typeof videoSource
  });
  
  // Si no hay fuente válida, usar fallback inmediatamente
  if (!videoSource || (!videoSource.videos?.length && !videoSource.seo_content?.length)) {
    console.log('⚠️ No hay fuente válida de videos, usando fallback...');
    const fallbackVideo = {
      id: 'psoIb7wi5_4',
      title: `Recorrido Virtual - ${property?.title || 'Propiedad'}`,
      description: 'Descubre cada detalle de esta increíble propiedad en un recorrido virtual completo.',
      duration: '5:23',
      thumbnail: 'https://img.youtube.com/vi/psoIb7wi5_4/maxresdefault.jpg',
      url: 'https://www.youtube.com/watch?v=psoIb7wi5_4',
      embedUrl: 'https://www.youtube.com/embed/psoIb7wi5_4?rel=0&modestbranding=1&showinfo=0&color=white&iv_load_policy=3',
      source: 'fallback',
      priority: 10,
      isSpecific: false,
      isTagRelated: false,
      platform: 'youtube',
      isValid: true
    };
    
    return {
      mainVideo: fallbackVideo,
      additionalVideos: [],
      allVideos: [fallbackVideo],
      hasSpecificVideos: false,
      hasTagRelatedVideos: false,
      totalCount: 1,
      sources: ['fallback']
    };
  }
  
  function cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractYouTubeId(url: string): string {
    if (!url) return '';
    const regex = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    const match = url.match(regex);
    return match && match[1] && match[1].length === 11 ? match[1] : '';
  }

  const videoMap = new Map();

  // Procesar videos de la fuente con prioridades
  if (videoSource?.videos) {
    console.log('🔄 Procesando videos de videoSource.videos...');
    videoSource.videos.forEach((video: any, index: number) => {
      const videoId = video.video_id || extractYouTubeId(video.url || video.video_url);
      
      if (videoId && !videoMap.has(videoId)) {
        const processedVideo = {
          id: videoId,
          title: cleanText(video.title) || `Video - ${property?.title || 'Propiedad'}`,
          description: cleanText(video.description) || 'Video relacionado con esta propiedad',
          duration: video.duration,
          thumbnail: video.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&color=white&iv_load_policy=3`,
          source: video.content_priority || 'api',
          priority: video.content_priority === 'specific' ? 1 : 
                   video.content_priority === 'tag_related' ? 2 : 3,
          isSpecific: video.content_priority === 'specific' || video.is_property_specific,
          isTagRelated: video.content_priority === 'tag_related' || video.is_tag_related,
          platform: 'youtube',
          isValid: true
        };
        
        videoMap.set(videoId, processedVideo);
      }
    });
  }

  // Procesar videos de SEO content
  const seoVideos = videoSource?.seo_content?.filter((item: any) => item.content_type === 'video') || [];
  if (seoVideos.length > 0) {
    console.log('🔄 Procesando videos de seo_content...');
    seoVideos.forEach((seoItem: any) => {
      const videoId = seoItem.video_id || extractYouTubeId(seoItem.video_url || seoItem.url);
      
      if (videoId && !videoMap.has(videoId)) {
        const processedVideo = {
          id: videoId,
          title: cleanText(seoItem.title) || `Video SEO - ${property?.title || 'Propiedad'}`,
          description: cleanText(seoItem.description) || 'Video relacionado con esta zona',
          duration: seoItem.duration,
          thumbnail: seoItem.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&color=white&iv_load_policy=3`,
          source: 'seo_content',
          priority: 4,
          isSpecific: false,
          isTagRelated: true,
          platform: 'youtube',
          isValid: true
        };
        
        videoMap.set(videoId, processedVideo);
      }
    });
  }

  // Convertir a array y ordenar por prioridad
  const allVideos = Array.from(videoMap.values())
    .filter((video: any) => video.isValid && video.id && video.id.length === 11)
    .sort((a: any, b: any) => a.priority - b.priority);

  // Fallback: Si no hay videos, usar uno de demostración
  if (allVideos.length === 0) {
    console.log('⚠️ No hay videos válidos, usando fallback...');
    allVideos.push({
      id: 'psoIb7wi5_4',
      title: `Recorrido Virtual - ${property?.title || 'Propiedad'}`,
      description: 'Descubre cada detalle de esta increíble propiedad en un recorrido virtual completo.',
      duration: '5:23',
      thumbnail: 'https://img.youtube.com/vi/psoIb7wi5_4/maxresdefault.jpg',
      url: 'https://www.youtube.com/watch?v=psoIb7wi5_4',
      embedUrl: 'https://www.youtube.com/embed/psoIb7wi5_4?rel=0&modestbranding=1&showinfo=0&color=white&iv_load_policy=3',
      source: 'fallback',
      priority: 10,
      isSpecific: false,
      isTagRelated: false,
      platform: 'youtube',
      isValid: true
    });
  }

  const mainVideo = allVideos[0];
  const additionalVideos = allVideos.slice(1, 4); // Máximo 3 adicionales

  console.log('📊 Videos finales:', {
    total: allVideos.length,
    mainVideo: mainVideo?.title,
    additional: additionalVideos.length,
    specific: allVideos.filter(v => v.isSpecific).length,
    tagRelated: allVideos.filter(v => v.isTagRelated).length
  });

  return {
    mainVideo,
    additionalVideos,
    allVideos: allVideos.slice(0, 4), // Máximo 4 videos total
    hasSpecificVideos: allVideos.some(v => v.isSpecific),
    hasTagRelatedVideos: allVideos.some(v => v.isTagRelated),
    totalCount: allVideos.length,
    sources: [...new Set(allVideos.map(v => v.source))]
  };
}

// =====================================================
// PROCESAMIENTO DE BREADCRUMBS
// =====================================================

export function processBreadcrumbs(
  apiBreadcrumbs: Breadcrumb[] | undefined, 
  property: PropertyData | null, 
  type: 'property' | 'list', 
  tags?: any[]
): Breadcrumb[] {
  console.log('🍞 === PROCESANDO BREADCRUMBS ===');
  console.log('📊 API breadcrumbs recibidos:', apiBreadcrumbs?.length || 0);
  console.log('📊 Context:', type);

  if (apiBreadcrumbs && apiBreadcrumbs.length > 0) {
    console.log('✅ Usando breadcrumbs de la API como base');
    
    const processedBreadcrumbs = apiBreadcrumbs.map((breadcrumb, index) => ({
      name: sanitizeText(breadcrumb.name || ''),
      url: breadcrumb.url || '/',
      current: breadcrumb.is_active || breadcrumb.is_current_page || false,
      slug: breadcrumb.slug,
      category: breadcrumb.category,
      position: breadcrumb.position || index,
      tag_id: breadcrumb.tag_id,
      description: breadcrumb.description,
      icon: breadcrumb.icon
    }));

    console.log('✅ Breadcrumbs de API procesados:', processedBreadcrumbs.length);
    return processedBreadcrumbs;
  }

  console.log('⚠️ No hay breadcrumbs de la API, usando fallback');
  return generateFallbackBreadcrumbs(property, type, tags);
}

function generateFallbackBreadcrumbs(property: PropertyData | null, type: 'property' | 'list', tags?: any[]): Breadcrumb[] {
  console.log('🔄 Generando breadcrumbs de fallback');
  
  const breadcrumbs: Breadcrumb[] = [
    { name: 'Inicio', url: '/', current: false, position: 0 },
    { name: 'Propiedades', url: '/propiedades', current: false, position: 1 }
  ];
  
  if (type === 'property' && property) {
    breadcrumbs.push({ 
      name: 'Comprar', 
      url: '/comprar', 
      current: false, 
      position: 2,
      category: 'operacion'
    });
    
    if (property.property_categories?.name) {
      const categorySlug = createSlug(property.property_categories.name);
      breadcrumbs.push({ 
        name: sanitizeText(property.property_categories.name), 
        url: `/comprar/${categorySlug}`, 
        current: false,
        position: 3,
        category: 'categoria'
      });
    }
    
    if (property.cities?.name) {
      const citySlug = createSlug(property.cities.name);
      const categorySlug = createSlug(property.property_categories?.name || 'apartamento');
      breadcrumbs.push({ 
        name: sanitizeText(property.cities.name), 
        url: `/comprar/${categorySlug}/${citySlug}`, 
        current: false,
        position: 4,
        category: 'ciudad'
      });
    }
    
    if (property.sectors?.name) {
      const sectorSlug = createSlug(property.sectors.name);
      const citySlug = createSlug(property.cities?.name || 'distrito-nacional');
      const categorySlug = createSlug(property.property_categories?.name || 'apartamento');
      breadcrumbs.push({ 
        name: sanitizeText(property.sectors.name), 
        url: `/comprar/${categorySlug}/${citySlug}/${sectorSlug}`, 
        current: false,
        position: 5,
        category: 'sector'
      });
    }
    
    breadcrumbs.push({ 
      name: sanitizeText(property.name || 'Propiedad'), 
      url: property.slug_url || '#', 
      current: true,
      position: breadcrumbs.length,
      category: 'property'
    });
  } else if (type === 'list' && tags && tags.length > 0) {
    let currentPath = '';
    let position = 2;

    const hierarchyOrder = ['operacion', 'categoria', 'ciudad', 'sector'];
    
    for (const categoryKey of hierarchyOrder) {
      const categoryTags = tags.filter((t: any) => t.category === categoryKey);
      
      if (categoryTags.length > 0) {
        const tag = categoryTags[0];
        currentPath = currentPath ? `${currentPath}/${tag.slug}` : tag.slug;
        
        breadcrumbs.push({
          name: tag.display_name || tag.name,
          url: `/${currentPath}`,
          current: false,
          position: position,
          category: tag.category,
          tag_id: tag.id,
          slug: tag.slug
        });
        
        position++;
      }
    }

    if (breadcrumbs.length > 2) {
      breadcrumbs[breadcrumbs.length - 1].current = true;
    } else {
      breadcrumbs[breadcrumbs.length - 1].current = true;
    }
  }
  
  console.log('✅ Breadcrumbs de fallback generados:', breadcrumbs.length);
  return breadcrumbs;
}

// =====================================================
// PROCESAMIENTO DE PROPIEDADES SIMILARES
// =====================================================

export function processSimilarProperties(apiSimilarProperties: any[] | undefined): any[] {
  console.log('🏠 === PROCESANDO PROPIEDADES SIMILARES ===');
  console.log('📊 API similar properties recibidas:', apiSimilarProperties?.length || 0);

  if (!apiSimilarProperties || apiSimilarProperties.length === 0) {
    console.log('⚠️ No hay propiedades similares de la API');
    return [];
  }

  const processedSimilarProperties = apiSimilarProperties.map((property, index) => ({
    id: property.id,
    slug: property.url || `/propiedad/${property.id}`,
    titulo: property.title || 'Propiedad sin nombre',
    precio: property.price || 'Precio a consultar',
    imagen: property.image || '/images/placeholder-property.jpg',
    imagenes: [property.image || '/images/placeholder-property.jpg'],
    sector: sanitizeText(property.location || ''),
    habitaciones: property.bedrooms || 0,
    banos: property.bathrooms || 0,
    metros: property.area || 0,
    tipo: sanitizeText(property.type || 'Apartamento'),
    url: property.url || `/propiedad/${property.id}`,
    code: `SIM-${property.id}`,
    isFormattedByProvider: true,
    is_project: property.is_project || false,
    parking_spots: property.parking_spots || 0,
    similarity_rank: index + 1,
    is_similar_property: true,
    coordinates: property.location?.coordinates || null,
    hasCoordinates: !!(property.location?.coordinates)
  }));

  console.log('✅ Propiedades similares procesadas:', processedSimilarProperties.length);
  return processedSimilarProperties;
}

export function generateSimilarPropertiesInfo(apiSimilarPropertiesDebug: any, similarProperties: any[]): any {
  return {
    total_found: similarProperties.length,
    method: apiSimilarPropertiesDebug?.search_method || 'fallback',
    tags_used: apiSimilarPropertiesDebug?.tags_used || 0,
    has_similar_properties: similarProperties.length > 0,
    similarity_score: apiSimilarPropertiesDebug?.total_found || 0,
    purpose: apiSimilarPropertiesDebug?.purpose || 'alternatives',
    provider_processed: true
  };
}