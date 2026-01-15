// src/data/formatters/propertyFormatter.ts
// =====================================================
// FORMATEO DE SINGLE PROPERTY
// =====================================================

import type { APIResponse } from '../types/interfaces.js';
import { processLocationFromAPI } from '../processors/locationProcessor.js';
import { formatAgent, processAgentProperties, generateAgentPropertiesInfo } from '../processors/agentProcessor.js';
import { processFAQsForDisplay, processVideosForDisplay, processBreadcrumbs, processSimilarProperties, generateSimilarPropertiesInfo } from '../processors/contentProcessor.js';
import { formatImagesArray, getMainImage, formatAmenities, generateSubtitle, formatTitle, cleanDescription, sanitizeText } from '../processors/utilityProcessors.js';
import { extractGooglePlacesData, formatLocation } from '../processors/locationProcessor.js';
import { formatProjectDetails } from './projectFormatter.js';

export function formatSinglePropertyResponse(apiData: APIResponse) {
  const property = apiData.property!;
  const pricing = property.pricing_unified || {};
  const images = property.images_unified || [];
  const isProject = apiData.type === 'single-property-project';
  
  // 🔍 LOGGING TEMPORAL PARA DEBUG
  console.log('🚨 === DEBUG COORDENADAS EN formatSinglePropertyResponse ===');
  console.log('📊 apiData.location:', apiData.location);
  console.log('📊 property.cities:', property.cities);
  console.log('📊 property.cities.coordinates:', property.cities?.coordinates);
  console.log('📊 property.sectors:', property.sectors);
  
  const locationResult = processLocationFromAPI(apiData.location, property);
  console.log('🎯 processLocationFromAPI result:', locationResult);
  console.log('🚨 === FIN DEBUG ===');
  
  const basicInfo = {
    id: property.id,
    title: formatTitle(property.name || property.title || 'Propiedad sin nombre'),
    subtitle: generateSubtitle(property),
    description: cleanDescription(property.description || ''),
    reference: property.code || `REF-${property.id}`,
    location: formatLocation(property),
    sector: sanitizeText(property.sectors?.name || ''),
    city: sanitizeText(property.cities?.name || ''),
    province: sanitizeText(property.cities?.provinces?.name || ''),
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    built_area: property.built_area || 0,
    parking_spots: property.parking_spots || 0,
    price: pricing.display_price?.formatted || 'Precio a consultar',
    reservation: 'US$1,000',
    property_status: property.property_status,
    is_project: property.is_project || false,
    category: sanitizeText(property.property_categories?.name || 'Apartamento'),
    slug_url: property.slug_url
  };

  const similarProperties = processSimilarProperties(apiData.similarProperties);
  const similarPropertiesInfo = generateSimilarPropertiesInfo(
    apiData.similarPropertiesDebug, 
    similarProperties
  );

  const agentProperties = processAgentProperties(apiData.agentProperties);
  const agentPropertiesInfo = generateAgentPropertiesInfo(
    apiData.agentPropertiesInfo, 
    agentProperties
  );

  // Procesar contenido para mostrar
  const processedFaqs = processFAQsForDisplay(apiData.relatedContent, basicInfo, isProject);
  
  // Verificación temporal: Buscar videos en AMBAS fuentes
  console.log('🔍 === VERIFICACIÓN DE FUENTES DE VIDEOS ===');
  console.log('📊 apiData.relatedContent?.videos:', apiData.relatedContent?.videos?.length || 0);
  console.log('📊 apiData.content?.videos:', apiData.content?.videos?.length || 0);
  console.log('📊 relatedContent existe:', !!apiData.relatedContent);
  console.log('📊 content existe:', !!apiData.content);
  
  // Usar la fuente que tenga videos
  let videoSource = null;
  if (apiData.relatedContent?.videos?.length > 0) {
    videoSource = apiData.relatedContent;
    console.log('✅ Usando relatedContent como fuente (tiene videos)');
  } else if (apiData.content?.videos?.length > 0) {
    videoSource = apiData.content;
    console.log('✅ Usando content como fuente (tiene videos)');
  } else {
    console.log('⚠️ No se encontraron videos en ninguna fuente');
  }
  
  const processedVideos = processVideosForDisplay(videoSource, basicInfo);

  return {
    type: 'property',
    isProject,
    available: apiData.available !== false,
    property: basicInfo,
    images: formatImagesArray(images),
    mainImage: getMainImage(images),
    pricing: {
      main: pricing.display_price,
      sale: pricing.sale,
      rental: pricing.rental,
      temp_rental: pricing.temp_rental,
      furnished_rental: pricing.furnished_rental,
      operation_type: pricing.operation_type || 'sale'
    },
    // Asesor mejorado
    agent: formatAgent(apiData.agent || apiData.referralAgent),
    project: isProject && apiData.projectDetails ? formatProjectDetails(apiData.projectDetails) : null,
    hasProject: isProject && !!apiData.projectDetails,
    location: {
      // Corregido: Pasar tanto apiData.location como property
      ...locationResult,
      googlePlaces: extractGooglePlacesData(apiData.seo)
    },
    amenities: formatAmenities(property.property_amenities || []),
    
    // Mantener contenido original para backward compatibility
    content: {
      articles: apiData.relatedContent?.articles || [],
      videos: apiData.relatedContent?.videos || [],
      testimonials: apiData.relatedContent?.testimonials || [],
      faqs: apiData.relatedContent?.faqs || [],
      seo_content: apiData.relatedContent?.seo_content || [],
      hasSpecificContent: apiData.relatedContent?.content_source?.includes('specific'),
      hasTagRelatedContent: apiData.relatedContent?.content_source?.includes('tag_related'),
      contentHierarchy: apiData.relatedContent?.hierarchy_info || {
        specific_count: 0,
        tag_related_count: 0,
        default_count: 0
      },
      contentSource: apiData.relatedContent?.content_source || 'general_only'
    },
    
    // Nueva sección: Contenido listo para mostrar
    displayContent: {
      faqs: processedFaqs,
      videos: processedVideos,
      articles: {
        all: apiData.relatedContent?.articles || [],
        specific: apiData.relatedContent?.articles?.filter(a => a.content_priority === 'specific') || [],
        tagRelated: apiData.relatedContent?.articles?.filter(a => a.content_priority === 'tag_related') || [],
        default: apiData.relatedContent?.articles?.filter(a => a.content_priority === 'default') || [],
        hasSpecific: apiData.relatedContent?.articles?.some(a => a.content_priority === 'specific') || false
      },
      testimonials: {
        all: apiData.relatedContent?.testimonials || [],
        specific: apiData.relatedContent?.testimonials?.filter(t => t.content_priority === 'specific') || [],
        tagRelated: apiData.relatedContent?.testimonials?.filter(t => t.content_priority === 'tag_related') || [],
        hasSpecific: apiData.relatedContent?.testimonials?.some(t => t.content_priority === 'specific') || false
      }
    },

    similarProperties: similarProperties,
    similarPropertiesInfo: similarPropertiesInfo,
    hasSimilarProperties: similarProperties.length > 0,
    // Nueva sección: Propiedades del asesor
    agentProperties: agentProperties,
    agentPropertiesInfo: agentPropertiesInfo,
    hasAgentProperties: agentProperties.length > 0,
    seo: {
      title: sanitizeText(apiData.seo?.title || property.name || ''),
      description: cleanDescription(apiData.seo?.description || property.description?.substring(0, 160) || ''),
      keywords: apiData.seo?.keywords || [],
      og: apiData.seo?.og || {},
      structuredData: apiData.seo?.structured_data || {},
      h1: sanitizeText(apiData.seo?.h1 || property.name || '')
    },
    breadcrumbs: processBreadcrumbs(apiData.breadcrumbs, property, 'property'),
    meta: {
      timestamp: new Date().toISOString(),
      hasProject: isProject && !!apiData.projectDetails,
      hasAgent: !!(apiData.agent || apiData.referralAgent),
      imagesCount: images.length,
      hasBreadcrumbs: !!(apiData.breadcrumbs?.length),
      breadcrumbsSource: apiData.breadcrumbs?.length ? 'api' : 'fallback',
      hasSimilarProperties: similarProperties.length > 0,
      similarPropertiesCount: similarProperties.length,
      hasAgentProperties: agentProperties.length > 0,
      agentPropertiesCount: agentProperties.length,
      // Metadatos de ubicación sin hardcoding
      hasLocationData: !!(apiData.location || property),
      locationSource: locationResult?.coordinatesSource || 'property_postgis',
      coordinatesFromAPI: !!(apiData.location?.coordinates),
      showExactLocation: locationResult?.showExactLocation || false,
      hasExactCoordinates: locationResult?.hasExactCoordinates || false,
      mapConfigFromAPI: !!(apiData.location?.mapConfig),
      postgisParsingUsed: !!(property.cities?.coordinates || property.sectors?.coordinates),
      hasRealCoordinates: !!(locationResult?.coordinates), // Nuevo: indica si hay coordenadas reales
      
      // Metadatos del contenido procesado
      hasDisplayContent: true,
      displayContentProcessed: true,
      faqsProcessed: processedFaqs.totalCount,
      videosProcessed: processedVideos.totalCount,
      hasSpecificContent: processedFaqs.hasSpecificFaqs || processedVideos.hasSpecificVideos,
      
      hasContentHierarchy: !!(apiData.relatedContent?.hierarchy_info),
      contentHierarchyInfo: apiData.relatedContent?.hierarchy_info || null,
      tagRelatedContentUsed: apiData.meta?.tagRelatedContentUsed || false,
      seoContentCount: apiData.relatedContent?.seo_content?.length || 0,
      debug: apiData.meta || {}
    }
  };
}