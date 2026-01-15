// 📁 supabase/functions/unified-property-search/index.ts
// ✅ IMPORTS CORRECTOS PARA EDGE FUNCTIONS
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// ✅ IMPORTS LOCALES CON SINTAXIS CORRECTA
import { CORS_HEADERS, SUPABASE_CONFIG, DEFAULT_PAGINATION } from './config.ts';
import { CountryDetectionService } from './country-detection.ts';
import { CoordinatesService } from './coordinates.ts';
import { PropertySearchService } from './property-search.ts';
import { ContentService } from './content.ts';
import { SimilarPropertiesService } from './similar-properties.ts';
import { AgentService } from './agent.ts';
import { BreadcrumbsService } from './breadcrumbs.ts';
import { SEOService } from './seo.ts';
import { ProjectsService } from './projects.ts';
import { parseUrlToSlugs, detectLanguageFromUrl, optimizePropertyImages, unifyPropertyPricing, extractLocationFromTags } from './utils.ts';
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: CORS_HEADERS
    });
  }
  try {
    // Inicializar servicios
    const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    const countryService = new CountryDetectionService(supabase);
    const coordinatesService = new CoordinatesService();
    const propertySearchService = new PropertySearchService(supabase);
    const contentService = new ContentService(supabase);
    const similarPropertiesService = new SimilarPropertiesService(supabase);
    const agentService = new AgentService(supabase);
    const breadcrumbsService = new BreadcrumbsService(supabase);
    const seoService = new SEOService(supabase);
    const projectsService = new ProjectsService(supabase);
    // Parsear URL y parámetros
    const url = new URL(req.url);
    const pathname = url.pathname;
    const pathSegments = pathname.split('/').filter((segment)=>segment.length > 0);
    let slug = '';
    // ✅ SIMPLIFICADO: Extraer todo después del nombre de la función (SIN necesidad de "busqueda")
    const functionNameIndex = pathSegments.findIndex((segment)=>segment === 'unified-property-search');
    if (functionNameIndex !== -1 && functionNameIndex < pathSegments.length - 1) {
      // Extraer todo después del nombre de la función directamente
      slug = pathSegments.slice(functionNameIndex + 1).join('/');
    } else {
      // Fallback a parámetros de query
      slug = url.searchParams.get('url') || url.searchParams.get('slug') || '';
    }
    if (!slug) {
      return new Response(JSON.stringify({
        error: 'Invalid URL format. Expected: /functions/v1/unified-property-search/your-search-terms',
        type: 'error',
        received_path: pathname,
        examples: [
          '/functions/v1/unified-property-search/comprar/apartamento/bavaro',
          '/functions/v1/unified-property-search/mystic-bay-a-solo-2min-de-playa-gorda'
        ]
      }), {
        status: 400,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json'
        }
      });
    }
    const refParam = url.searchParams.get('ref');
    const page = parseInt(url.searchParams.get('page')) || DEFAULT_PAGINATION.page;
    const limit = parseInt(url.searchParams.get('limit')) || DEFAULT_PAGINATION.limit;
    console.log('🔍 Iniciando búsqueda unificada:', {
      slug,
      refParam,
      page,
      limit
    });
    // Detección de país e idioma
    const urlSegments = parseUrlToSlugs(slug);
    const languageDetection = detectLanguageFromUrl(urlSegments);
    const cleanUrlSegments = languageDetection.cleanedSegments;
    const detectedLanguage = languageDetection.language;
    const countryDetection = await countryService.detectCountryByDomainAndInjectTag(req.url);
    const detectedCountry = countryDetection.country;
    const countryTag = countryDetection.countryTag;
    // PASO 1: Búsqueda SIMPLE y DIRECTA por slug_url
    const propertyResult = await propertySearchService.searchPropertyBySlugUrl(slug);
    // CASO 1: PROPIEDAD ENCONTRADA
    if (propertyResult.found && propertyResult.property) {
      const property = propertyResult.property;
      const optimizedProperty = optimizePropertyImages(unifyPropertyPricing(property));
      const coordinatesInfo = coordinatesService.processPropertyCoordinates(property);
      const locationData = coordinatesService.generateLocationData(property, coordinatesInfo);
      // Obtener datos completos de la propiedad
      const propertyTags = await propertySearchService.getPropertyTags(property.id);
      const tagIds = propertyTags.map((tag)=>tag.id);
      // Ejecutar todas las consultas en paralelo
      const [tagRelatedContent, defaultContent, specificContent, projectDetails, agentData, referralAgent, googlePlacesData, articlesStats, similarProperties, agentProperties] = await Promise.all([
        contentService.getRelatedContent(tagIds, countryTag?.id, 10),
        contentService.getDefaultRelatedContent(countryTag?.id),
        projectsService.getPropertySpecificContent(property.id),
        property.is_project && property.project_detail_id ? projectsService.getCompleteProjectDetails(property.project_detail_id) : Promise.resolve(null),
        property.agent_id ? agentService.getPropertyAgent(property.agent_id) : Promise.resolve(null),
        refParam ? agentService.getReferralAgent(refParam) : Promise.resolve(null),
        property.sectors?.name || property.cities?.name ? seoService.getLocationGooglePlacesData(property.sectors?.name || property.cities?.name) : Promise.resolve(null),
        seoService.getArticlesStats(),
        similarPropertiesService.getSmartSimilarProperties(propertyTags, property.id, countryTag?.id),
        property.agent_id ? agentService.getAgentProperties(property.agent_id, property.id, 20) : Promise.resolve([])
      ]);
      // Generar carruseles dinámicos temáticos
      const dynamicCarousels = await projectsService.generateDynamicThematicCarousels(tagIds, countryTag?.id, 8);
      // Combinar contenido con jerarquía
      const enhancedContent = combineContentWithTagsHierarchy(specificContent, tagRelatedContent, defaultContent);
      enhancedContent.articles_stats = articlesStats;
      enhancedContent.carousels = dynamicCarousels;
      // Generar breadcrumbs y SEO
      const breadcrumbs = await breadcrumbsService.generatePropertyBreadcrumbs(property, propertyTags);
      const processedProperty = {
        ...optimizedProperty,
        location: locationData
      };
      const responseType = property.is_project ? 'single-property-project' : propertyResult.available ? 'single-property' : 'property-not-available';
      const seoData = seoService.generateSEOMetadata({
        type: responseType,
        property: processedProperty,
        urlSegments: [
          slug
        ],
        googlePlacesData
      });
      const response = {
        type: responseType,
        available: propertyResult.available,
        soldStatus: propertyResult.soldStatus,
        property: processedProperty,
        location: locationData,
        relatedContent: enhancedContent,
        projectDetails: projectDetails || null,
        agent: agentData || null,
        referralAgent: referralAgent || null,
        agentProperties: agentProperties,
        agentPropertiesInfo: {
          total_found: agentProperties.length,
          agent_id: property.agent_id,
          excluded_property: property.id,
          has_agent_properties: agentProperties.length > 0
        },
        similarProperties: similarProperties,
        similarPropertiesDebug: {
          total_found: similarProperties.length,
          tags_used: propertyTags.length,
          search_method: propertyTags.length > 0 ? 'smart_tags' : 'fallback'
        },
        breadcrumbs: breadcrumbs,
        seo: seoData,
        countryInfo: {
          country: detectedCountry,
          language: detectedLanguage,
          countryTag: countryTag,
          detectionMethod: countryDetection.detectionMethod,
          contentFilteredByCountry: tagRelatedContent.countryInjected || false
        },
        meta: {
          slug,
          searchPath: pathname,
          referralParam: refParam,
          contentHierarchy: enhancedContent.hierarchy_info,
          contentSource: enhancedContent.content_source,
          tagRelatedContentUsed: !!tagRelatedContent && Object.keys(tagRelatedContent).some((key)=>tagRelatedContent[key] && tagRelatedContent[key].length > 0),
          coordinatesProcessed: true,
          coordinatesSource: coordinatesInfo.source,
          showExactLocation: coordinatesInfo.showExactLocation,
          hasExactCoordinates: coordinatesInfo.hasExactCoordinates,
          locationDataGenerated: true,
          countryDetected: detectedCountry.name,
          languageDetected: detectedLanguage,
          countryTagInjected: tagRelatedContent.countryInjected || false,
          timestamp: new Date().toISOString()
        }
      };
      return new Response(JSON.stringify(response), {
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json',
          'Cache-Control': response.available ? 'public, max-age=3600' : 'public, max-age=1800'
        }
      });
    }
    // PASO 2: Si no es propiedad individual, buscar por tags
    const tags = await propertySearchService.findTagsBySlug(cleanUrlSegments);
    const tagIds = tags.map((t)=>t.id);
    // Nueva llamada con inyección automática de país
    const searchResults = await propertySearchService.searchPropertiesByTags(tagIds, countryTag?.id, page, limit);
    // Procesar propiedades con coordenadas
    const enrichedProperties = (searchResults.properties || []).map((property)=>{
      const optimizedProperty = optimizePropertyImages(unifyPropertyPricing(property));
      const coordinatesInfo = coordinatesService.processPropertyCoordinates(property);
      const locationData = coordinatesService.generateLocationData(property, coordinatesInfo);
      return {
        ...optimizedProperty,
        location: locationData
      };
    });
    // Obtener contenido y datos adicionales en paralelo
    const [tagRelatedContent, referralAgent, googlePlacesData, articlesStats, dynamicCarousels] = await Promise.all([
      tagIds.length > 0 ? contentService.getRelatedContent(tagIds, countryTag?.id, 10) : contentService.getDefaultRelatedContent(countryTag?.id),
      refParam ? agentService.getReferralAgent(refParam) : Promise.resolve(null),
      extractLocationFromTags(tags) ? seoService.getLocationGooglePlacesData(extractLocationFromTags(tags)) : Promise.resolve(null),
      seoService.getArticlesStats(),
      projectsService.generateDynamicThematicCarousels(tagIds, countryTag?.id, 8)
    ]);
    // Generar breadcrumbs y SEO
    const breadcrumbs = await breadcrumbsService.generateSmartBreadcrumbs(tags, cleanUrlSegments, 'listing');
    const seoData = seoService.generateSEOMetadata({
      type: 'property-list',
      searchResults: {
        properties: enrichedProperties,
        pagination: {
          currentPage: searchResults.currentPage,
          totalCount: searchResults.totalCount,
          itemsPerPage: searchResults.itemsPerPage,
          totalPages: Math.ceil(searchResults.totalCount / searchResults.itemsPerPage),
          hasMore: searchResults.hasMore
        }
      },
      tags,
      urlSegments: cleanUrlSegments,
      googlePlacesData
    });
    // Agregar carruseles dinámicos al contenido
    const enhancedContent = {
      ...tagRelatedContent,
      articles_stats: articlesStats,
      carousels: dynamicCarousels
    };
    const response = {
      type: 'property-list',
      available: true,
      searchResults: {
        properties: enrichedProperties,
        tags,
        searchTerms: cleanUrlSegments,
        pagination: {
          currentPage: searchResults.currentPage,
          totalCount: searchResults.totalCount,
          itemsPerPage: searchResults.itemsPerPage,
          totalPages: Math.ceil(searchResults.totalCount / searchResults.itemsPerPage),
          hasMore: searchResults.hasMore,
          hasNextPage: searchResults.hasMore,
          hasPreviousPage: searchResults.currentPage > 1
        }
      },
      relatedContent: enhancedContent,
      referralAgent: referralAgent || null,
      breadcrumbs: breadcrumbs,
      seo: seoData,
      countryInfo: {
        country: detectedCountry,
        language: detectedLanguage,
        countryTag: countryTag,
        detectionMethod: countryDetection.detectionMethod,
        propertiesFilteredByCountry: searchResults.countryInjected || false,
        contentFilteredByCountry: tagRelatedContent.countryInjected || false
      },
      meta: {
        slug,
        searchPath: pathname,
        urlSegments: cleanUrlSegments,
        referralParam: refParam,
        page,
        limit,
        contentHierarchy: enhancedContent.hierarchy_info,
        contentSource: enhancedContent.content_source,
        tagRelatedContentUsed: !!tagRelatedContent && Object.keys(tagRelatedContent).some((key)=>tagRelatedContent[key] && tagRelatedContent[key].length > 0),
        tagCount: tagIds.length,
        propertiesWithCoordinates: enrichedProperties.filter((p)=>p.location?.coordinates).length,
        coordinatesProcessedForAll: true,
        countryDetected: detectedCountry.name,
        languageDetected: detectedLanguage,
        countryTagInjected: {
          properties: searchResults.countryInjected || false,
          content: tagRelatedContent.countryInjected || false
        },
        searchMetadata: searchResults.searchMetadata || {},
        timestamp: new Date().toISOString()
      }
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=1800'
      }
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      type: 'error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/json'
      }
    });
  }
});
// Función auxiliar para combinar contenido con jerarquía
function combineContentWithTagsHierarchy(specificContent, tagRelatedContent, defaultContent) {
  const maxLimits = {
    articles: 12,
    videos: 10,
    testimonials: 8,
    faqs: 15,
    seo_content: 8
  };
  const combined = {
    articles: [],
    videos: [],
    testimonials: [],
    faqs: [],
    seo_content: [],
    content_source: 'hierarchical',
    hierarchy_info: {
      specific_count: 0,
      tag_related_count: 0,
      default_count: 0
    }
  };
  function combineContentType(type) {
    const maxLimit = maxLimits[type];
    let currentCount = 0;
    let specificCount = 0;
    let tagRelatedCount = 0;
    let defaultCount = 0;
    const usedIds = new Set();
    const finalItems = [];
    // PRIORIDAD 1: CONTENIDO ESPECÍFICO
    if (specificContent?.has_specific_content && specificContent[type]) {
      specificContent[type].forEach((item)=>{
        if (!usedIds.has(item.id)) {
          const cleanItem = {
            ...item,
            content_priority: 'specific',
            is_property_specific: true
          };
          finalItems.push(cleanItem);
          usedIds.add(item.id);
          specificCount++;
        }
      });
      currentCount = specificCount;
    }
    // PRIORIDAD 2: CONTENIDO POR TAGS
    if (currentCount < maxLimit && tagRelatedContent?.[type]) {
      const remainingSlots = maxLimit - currentCount;
      const uniqueTagItems = tagRelatedContent[type].filter((item)=>{
        return !usedIds.has(item.id);
      });
      const tagItems = uniqueTagItems.slice(0, remainingSlots).map((item)=>{
        const cleanItem = {
          ...item,
          content_priority: 'tag_related',
          is_tag_related: true
        };
        usedIds.add(item.id);
        return cleanItem;
      });
      finalItems.push(...tagItems);
      currentCount += tagItems.length;
      tagRelatedCount = tagItems.length;
    }
    // PRIORIDAD 3: CONTENIDO POR DEFECTO
    if (currentCount < maxLimit && defaultContent?.[type]) {
      const remainingSlots = maxLimit - currentCount;
      const uniqueDefaultItems = defaultContent[type].filter((item)=>{
        return !usedIds.has(item.id);
      });
      const defaultItems = uniqueDefaultItems.slice(0, remainingSlots).map((item)=>{
        const cleanItem = {
          ...item,
          content_priority: 'default',
          is_default_content: true
        };
        usedIds.add(item.id);
        return cleanItem;
      });
      finalItems.push(...defaultItems);
      currentCount += defaultItems.length;
      defaultCount = defaultItems.length;
    }
    combined[type] = finalItems;
    combined.hierarchy_info.specific_count += specificCount;
    combined.hierarchy_info.tag_related_count += tagRelatedCount;
    combined.hierarchy_info.default_count += defaultCount;
  }
  [
    'articles',
    'videos',
    'testimonials',
    'faqs',
    'seo_content'
  ].forEach(combineContentType);
  const { specific_count, tag_related_count, default_count } = combined.hierarchy_info;
  if (specific_count > 0 && tag_related_count > 0) {
    combined.content_source = 'specific_and_tag_related_and_general';
  } else if (specific_count > 0) {
    combined.content_source = 'specific_and_general';
  } else if (tag_related_count > 0) {
    combined.content_source = 'tag_related_and_general';
  } else {
    combined.content_source = 'general_only';
  }
  return combined;
}
