// ================================================================
// 🧪 Edge Function Modular - TAG PAÍS OBLIGATORIO CORREGIDO
// ================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { CORS_HEADERS, SUPABASE_CONFIG, SUPPORTED_LANGUAGES } from './config.ts';
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: CORS_HEADERS
    });
  }
  console.log('🚀 Request recibido:', req.url);
  try {
    const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    const url = new URL(req.url);
    // Extraer parámetros
    const ejecuta = url.searchParams.get('ejecuta');
    const context = parseRequestContext(req);
    console.log('🎯 Ejecutando función:', ejecuta || 'deteccion-basica');
    console.log('📝 Context:', context);
    // Router modular
    switch(ejecuta){
      case 'pais-idioma':
        return await testPaisIdioma(supabase, context);
      case 'buscar-tags':
        return await testBuscarTags(supabase, context);
      case 'buscar-propiedades':
        return await testBuscarPropiedades(supabase, context);
      case 'articulos':
        return await testArticulos(supabase, context);
      case 'propiedad-individual':
        return await testPropiedadIndividual(supabase, context);
      case 'agente':
        return await testAgente(supabase, context); // ✅ VOLVER A LA FUNCIÓN ORIGINAL
      case 'similar-properties':
        return await testSimilarProperties(supabase, context); // ✅ VOLVER A LA FUNCIÓN SIMPLE
      case 'videos':
        return await testVideos(supabase, context);
      case 'faqs':
        return await testFaqs(supabase, context);
      case 'seo-content':
        return await testSeoContent(supabase, context);
      case 'testimonials':
        return await testTestimonials(supabase, context);
      case 'contenido-relacionado':
        return await testContenidoRelacionado(supabase, context);
      default:
        return await testDeteccionBasica(supabase, context);
    }
  } catch (error) {
    console.error('💥 Error:', error);
    return createErrorResponse(error);
  }
});
// ========================================
// 📝 PARSEO DE CONTEXTO
// ========================================
function parseRequestContext(req) {
  const url = new URL(req.url);
  // Extraer slug
  const pathParts = url.pathname.split('/').filter(Boolean);
  const funcIndex = pathParts.findIndex((p)=>p === 'solicitar-propiedades');
  const rawSlug = funcIndex !== -1 ? pathParts.slice(funcIndex + 1).join('/') : url.searchParams.get('url') || url.searchParams.get('slug') || 'inicio';
  // Detectar idioma
  const segments = rawSlug.split('/').filter(Boolean);
  let language = 'es';
  let cleanSegments = segments;
  if (segments.length > 0 && SUPPORTED_LANGUAGES.includes(segments[0])) {
    language = segments[0];
    cleanSegments = segments.slice(1);
  }
  const cleanUrl = cleanSegments.join('/');
  return {
    originalSlug: rawSlug,
    cleanUrl,
    language,
    segments: cleanSegments,
    page: parseInt(url.searchParams.get('page')) || 1,
    limit: parseInt(url.searchParams.get('limit')) || 32,
    refParam: url.searchParams.get('ref'),
    propertyId: url.searchParams.get('propertyId'),
    agentId: url.searchParams.get('agentId')
  };
}
// ========================================
// 🛠️ HELPER: Obtener País y Tag Obligatorio
// ========================================
async function getCountryTagObligatorio(supabase) {
  console.log('🌍 Obteniendo tag de país OBLIGATORIO...');
  try {
    // Buscar tag de país (República Dominicana por defecto)
    const { data: countryTags, error } = await supabase.from('tags').select('id, name, slug, category, display_name').eq('category', 'pais');
    if (error) {
      console.error('❌ Error buscando tags de país:', error);
      return null;
    }
    if (!countryTags || countryTags.length === 0) {
      console.warn('⚠️ No hay tags de país en la BD');
      return null;
    }
    // Buscar República Dominicana específicamente
    let dominicanaTag = countryTags.find((tag)=>tag.name.toLowerCase().includes('dominican') || tag.name.toLowerCase().includes('dominicana') || tag.slug.toLowerCase().includes('dominican') || tag.slug.toLowerCase().includes('dominicana'));
    // Si no encuentra, usar el primero disponible
    if (!dominicanaTag) {
      dominicanaTag = countryTags[0];
      console.warn('⚠️ No se encontró República Dominicana, usando:', dominicanaTag.name);
    }
    console.log('✅ Tag de país OBLIGATORIO:', dominicanaTag.name, `(ID: ${dominicanaTag.id})`);
    return dominicanaTag;
  } catch (error) {
    console.error('❌ Error crítico obteniendo tag de país:', error);
    return null;
  }
}
// ========================================
// 🛠️ HELPER: Buscar Contenido por Tags con País Obligatorio y Ordenamiento Jerárquico
// ========================================
async function buscarContenidoPorTags(supabase, contentType, tagIds, countryTagId, limit = 10, propertyId = null) {
  console.log(`📰 Buscando ${contentType} con tags + país obligatorio:`, {
    contentType,
    tagIds: tagIds?.length || 0,
    countryTagId,
    limit,
    propertyId: propertyId || 'none (property list mode)'
  });
  // SIEMPRE incluir país como tag obligatorio
  let finalTagIds = [
    countryTagId
  ];
  if (tagIds && tagIds.length > 0) {
    // Agregar otros tags, evitando duplicar país
    const additionalTagIds = tagIds.filter((id)=>id !== countryTagId);
    finalTagIds = [
      countryTagId,
      ...additionalTagIds
    ];
  }
  console.log(`🌍 ${contentType} - Tags finales (país primero):`, finalTagIds);
  try {
    // 1. Buscar contenido que tenga el tag de país + otros tags
    const { data: contentTags, error: ctError } = await supabase.from('content_tags').select('content_id, tag_id, weight').eq('content_type', contentType).in('tag_id', finalTagIds);
    if (ctError) {
      console.error(`❌ Error buscando content_tags para ${contentType}:`, ctError);
      return [];
    }
    if (!contentTags || contentTags.length === 0) {
      console.log(`⚠️ No hay content_tags para ${contentType} con estos tags`);
      return [];
    }
    // 2. Buscar contenido específico de propiedad (solo si es single property)
    let propertySpecificContent = new Set();
    if (propertyId) {
      console.log(`🎯 Buscando contenido específico para propiedad ${propertyId}...`);
      const { data: propertyRelations, error: prError } = await supabase.from('content_property_relations').select('content_id').eq('property_id', propertyId).eq('content_type', contentType);
      if (!prError && propertyRelations) {
        propertySpecificContent = new Set(propertyRelations.map((pr)=>pr.content_id));
        console.log(`🎯 Contenido específico encontrado:`, propertySpecificContent.size);
      }
    }
    // 3. Obtener información de featured para el contenido encontrado
    const contentIds = [
      ...new Set(contentTags.map((ct)=>ct.content_id))
    ];
    let featuredContent = new Set();
    // Mapear tabla según tipo de contenido con nombres CORRECTOS
    const tableMap = {
      'article': 'articles',
      'video': 'videos',
      'faq': 'faqs',
      'testimonial': 'testimonials',
      'seo_content': 'seo_content'
    };
    if (contentIds.length > 0) {
      const tableName = tableMap[contentType];
      if (tableName) {
        // Verificar si la tabla tiene campo 'featured'
        if (contentType === 'faq' || contentType === 'seo_content') {
          // FAQs y SEO content pueden NO tener campo 'featured'
          // Intentar con featured, si falla usar query sin featured
          try {
            const { data: featuredData, error: fError } = await supabase.from(tableName).select('id').in('id', contentIds).eq('featured', true);
            if (!fError && featuredData) {
              featuredContent = new Set(featuredData.map((f)=>f.id));
              console.log(`⭐ Contenido destacado encontrado en ${tableName}:`, featuredContent.size);
            }
          } catch (featuredError) {
            console.log(`⚠️ ${tableName} no tiene campo 'featured', usando ordenamiento sin featured`);
          // No hacer nada, featuredContent queda vacío
          }
        } else {
          // Articles, videos, testimonials SÍ tienen featured
          const { data: featuredData, error: fError } = await supabase.from(tableName).select('id').in('id', contentIds).eq('featured', true);
          if (!fError && featuredData) {
            featuredContent = new Set(featuredData.map((f)=>f.id));
            console.log(`⭐ Contenido destacado encontrado en ${tableName}:`, featuredContent.size);
          }
        }
      }
    }
    // 4. Organizar por contenido: contar tags + peso + flags
    const contentScores = {};
    contentTags.forEach((ct)=>{
      if (!contentScores[ct.content_id]) {
        contentScores[ct.content_id] = {
          tagCount: 0,
          totalWeight: 0,
          matchedTags: [],
          hasCountryTag: false,
          isPropertySpecific: propertySpecificContent.has(ct.content_id),
          isFeatured: featuredContent.has(ct.content_id)
        };
      }
      contentScores[ct.content_id].tagCount += 1;
      contentScores[ct.content_id].totalWeight += ct.weight || 1;
      contentScores[ct.content_id].matchedTags.push(ct.tag_id);
      // Marcar si tiene el tag de país
      if (ct.tag_id === countryTagId) {
        contentScores[ct.content_id].hasCountryTag = true;
      }
    });
    // 5. FILTRO OBLIGATORIO: Solo contenido que tenga el tag de país
    const contentWithCountry = Object.entries(contentScores).filter(([contentId, score])=>score.hasCountryTag);
    console.log(`🌍 ${contentType} filtrado POR PAÍS:`, {
      totalEncontrado: Object.keys(contentScores).length,
      conPaisObligatorio: contentWithCountry.length,
      paisRequerido: countryTagId,
      especificos: contentWithCountry.filter(([, s])=>s.isPropertySpecific).length,
      destacados: contentWithCountry.filter(([, s])=>s.isFeatured).length,
      tableName: tableMap[contentType] || 'unknown'
    });
    if (contentWithCountry.length === 0) {
      console.log(`⚠️ No hay ${contentType} del país especificado`);
      return [];
    }
    // 6. ORDENAMIENTO JERÁRQUICO: Específico → Destacado → Tags → Peso
    const sortedContentIds = contentWithCountry.sort(([idA, a], [idB, b])=>{
      // 1. ESPECÍFICO: Contenido directo de propiedad primero (solo en single property)
      if (a.isPropertySpecific !== b.isPropertySpecific) {
        return Number(b.isPropertySpecific) - Number(a.isPropertySpecific);
      }
      // 2. DESTACADO: Featured primero
      if (a.isFeatured !== b.isFeatured) {
        return Number(b.isFeatured) - Number(a.isFeatured);
      }
      // 3. TAGS: Más coincidencias primero
      if (b.tagCount !== a.tagCount) {
        return b.tagCount - a.tagCount;
      }
      // 4. PESO: Mayor peso como tiebreaker
      return b.totalWeight - a.totalWeight;
    }).slice(0, limit).map(([contentId, score])=>({
        id: contentId,
        score: score,
        debugInfo: {
          isPropertySpecific: score.isPropertySpecific,
          isFeatured: score.isFeatured,
          tagCount: score.tagCount,
          totalWeight: score.totalWeight
        }
      }));
    console.log(`✅ ${contentType} IDs ordenados JERÁRQUICAMENTE:`, {
      total: sortedContentIds.length,
      orderCriteria: 'específico → destacado → tags → peso',
      detailedScoring: sortedContentIds.slice(0, 5).map((item)=>({
          id: item.id,
          isPropertySpecific: item.debugInfo.isPropertySpecific,
          isFeatured: item.debugInfo.isFeatured,
          tagCount: item.debugInfo.tagCount,
          totalWeight: item.debugInfo.totalWeight,
          finalPosition: sortedContentIds.findIndex((x)=>x.id === item.id) + 1
        }))
    });
    // 🔍 DEBUG ESPECÍFICO PARA FAQS
    if (contentType === 'faq') {
      console.log('🔍 DEBUG FAQs - Análisis detallado del ordenamiento:');
      // Verificar que el sorting está funcionando
      const sortingCheck = contentWithCountry.map(([id, score], index)=>({
          originalPosition: index + 1,
          id: id,
          isPropertySpecific: score.isPropertySpecific,
          isFeatured: score.isFeatured,
          tagCount: score.tagCount,
          totalWeight: score.totalWeight,
          matchedTags: score.matchedTags
        }));
      console.log('🔍 FAQs ANTES del sorting:', sortingCheck.slice(0, 5));
      const finalPositions = sortedContentIds.map((item, index)=>({
          finalPosition: index + 1,
          id: item.id,
          ...item.debugInfo
        }));
      console.log('🔍 FAQs DESPUÉS del sorting:', finalPositions.slice(0, 5));
      // Verificar si hay empates en tagCount
      const tagCounts = finalPositions.map((item)=>item.tagCount);
      const uniqueTagCounts = [
        ...new Set(tagCounts)
      ];
      console.log('🔍 FAQs - Distribución de tag counts:', {
        tagCounts: tagCounts,
        uniqueCounts: uniqueTagCounts,
        hasVariation: uniqueTagCounts.length > 1
      });
    }
    return sortedContentIds.map((item)=>item.id);
  } catch (error) {
    console.error(`❌ Error en buscarContenidoPorTags para ${contentType}:`, error);
    return [];
  }
}
// ========================================
// 🛠️ HELPER: Buscar Propiedad por URL Completa
// ========================================
async function findPropertyByUrl(supabase, cleanUrl, language) {
  console.log('🏡 Buscando propiedad por URL:', {
    cleanUrl,
    language
  });
  if (!cleanUrl) return null;
  try {
    // Determinar campo de slug según idioma
    const slugField = language === 'es' ? 'slug_url' : `slug_${language}`;
    // Buscar la propiedad
    const { data: property, error } = await supabase.from('properties').select(`
        id, agent_id, name, slug_url, slug_en, slug_fr,
        bedrooms, bathrooms, sale_price, rental_price,
        property_categories(name), cities(name), sectors(name)
      `).eq(slugField, cleanUrl).single();
    if (error || !property) {
      console.log('⚠️ Propiedad no encontrada con URL:', cleanUrl);
      return null;
    }
    console.log('✅ Propiedad encontrada:', {
      id: property.id,
      name: property.name,
      agent_id: property.agent_id
    });
    return property;
  } catch (error) {
    console.error('❌ Error buscando propiedad por URL:', error);
    return null;
  }
}
// ========================================
// 🛠️ HELPER: Obtener Tags de Propiedad
// ========================================
async function getPropertyTags(supabase, propertyId) {
  console.log('🏷️ Obteniendo tags de propiedad:', propertyId);
  try {
    const { data: contentTags, error } = await supabase.from('content_tags').select(`
        tag_id, weight,
        tags!inner(id, name, slug, category, display_name)
      `).eq('content_type', 'property').eq('content_id', propertyId).order('weight', {
      ascending: false
    });
    if (error) {
      console.error('❌ Error obteniendo tags de propiedad:', error);
      return [];
    }
    const tags = (contentTags || []).map((ct)=>({
        ...ct.tags,
        weight: ct.weight || 1
      }));
    console.log('✅ Tags de propiedad obtenidos:', {
      total: tags.length,
      byCategory: tags.reduce((acc, tag)=>{
        acc[tag.category] = (acc[tag.category] || 0) + 1;
        return acc;
      }, {}),
      topTags: tags.slice(0, 3).map((t)=>`${t.category}:${t.name}`)
    });
    return tags;
  } catch (error) {
    console.error('❌ Error crítico en getPropertyTags:', error);
    return [];
  }
}
async function testDeteccionBasica(supabase, context) {
  return createJsonResponse({
    test: 'deteccion-basica',
    success: true,
    data: {
      originalSlug: context.originalSlug,
      cleanUrl: context.cleanUrl,
      language: context.language,
      segments: context.segments,
      page: context.page,
      limit: context.limit,
      refParam: context.refParam
    },
    availableTests: [
      'pais-idioma',
      'buscar-tags',
      'buscar-propiedades',
      'articulos',
      'videos',
      'faqs',
      'testimonials',
      'contenido-relacionado',
      'seo-content',
      'propiedad-individual',
      'agente',
      'similar-properties'
    ],
    usage: 'Agrega ?ejecuta=nombre-test para probar funciones específicas'
  });
}
// ========================================
// 🧪 TEST: País e Idioma
// ========================================
async function testPaisIdioma(supabase, context) {
  console.log('🌍 Detectando país...');
  try {
    // Paso 1: Buscar países disponibles
    const { data: countries, error: countriesError } = await supabase.from('countries').select('id, name, code, subdomain, custom_domains').eq('active', true);
    console.log('📊 Países encontrados:', countries?.length || 0);
    // Paso 2: Obtener tag de país obligatorio
    const countryTag = await getCountryTagObligatorio(supabase);
    // Paso 3: Buscar país por defecto
    let defaultCountry = null;
    if (countries && countries.length > 0) {
      defaultCountry = countries.find((c)=>c.name.toLowerCase().includes('dominican') || c.name.toLowerCase().includes('dominicana'));
      if (!defaultCountry) {
        defaultCountry = countries[0];
      }
    }
    return createJsonResponse({
      test: 'pais-idioma',
      success: true,
      data: {
        language: context.language,
        detectedCountry: defaultCountry,
        countryTag: countryTag,
        availableCountries: countries?.length || 0,
        countryTagMandatory: !!countryTag
      },
      debug: {
        step1: 'Buscar países',
        step2: 'Buscar tag de país OBLIGATORIO',
        step3: 'Seleccionar República Dominicana',
        countriesError: countriesError?.message,
        countryTagFound: !!countryTag,
        allCountries: countries?.map((c)=>({
            id: c.id,
            name: c.name
          }))
      }
    });
  } catch (error) {
    return createJsonResponse({
      test: 'pais-idioma',
      success: false,
      error: error.message,
      data: {
        language: context.language,
        detectedCountry: null,
        countryTag: null
      }
    });
  }
}
// ========================================
// 🧪 TEST: Buscar Tags
// ========================================
async function testBuscarTags(supabase, context) {
  console.log('🏷️ Buscando tags para:', context.segments, 'idioma:', context.language);
  if (!context.segments || context.segments.length === 0) {
    return createJsonResponse({
      test: 'buscar-tags',
      success: false,
      message: 'No hay segmentos para buscar. Usa: ?url=comprar/apartamento o ?url=buy/apartment',
      data: {
        tags: []
      }
    });
  }
  try {
    // Buscar en todos los campos de slug
    const { data: tags, error } = await supabase.from('tags').select(`
        id, name, slug, category, display_name,
        slug_en, slug_fr, display_name_en, display_name_fr
      `).or(`slug.in.(${context.segments.join(',')}),slug_en.in.(${context.segments.join(',')}),slug_fr.in.(${context.segments.join(',')})`);
    // Aplicar traducciones y devolver campos con nombres estándar
    const translatedTags = tags?.map((tag)=>({
        id: tag.id,
        name: tag.name,
        category: tag.category,
        // Slug traducido según idioma, pero siempre se llama 'slug'
        slug: context.language === 'es' ? tag.slug : context.language === 'en' ? tag.slug_en || tag.slug : tag.slug_fr || tag.slug,
        // Display name traducido según idioma, pero siempre se llama 'display_name'
        display_name: context.language === 'es' ? tag.display_name : context.language === 'en' ? tag.display_name_en || tag.display_name : tag.display_name_fr || tag.display_name,
        language: context.language,
        _original_slug: tag.slug,
        _original_display_name: tag.display_name,
        _translated: context.language !== 'es' && (context.language === 'en' && (tag.slug_en || tag.display_name_en) || context.language === 'fr' && (tag.slug_fr || tag.display_name_fr))
      })) || [];
    const translatedCount = translatedTags.filter((t)=>t._translated).length;
    return createJsonResponse({
      test: 'buscar-tags',
      success: true,
      data: {
        searchSegments: context.segments,
        language: context.language,
        tagsFound: tags?.length || 0,
        tagsTranslated: translatedCount,
        tags: translatedTags
      },
      debug: {
        note: 'Tags devueltos con campos estándar (slug, display_name) ya traducidos',
        originalFields: 'slug_en, slug_fr, display_name_en, display_name_fr',
        error: error?.message
      }
    });
  } catch (error) {
    return createJsonResponse({
      test: 'buscar-tags',
      success: false,
      error: error.message,
      data: {
        tags: []
      }
    });
  }
}
// ========================================
// 🧪 TEST: Buscar Propiedades
// ========================================
async function testBuscarPropiedades(supabase, context) {
  console.log('🏠 Buscando propiedades para idioma:', context.language);
  // Obtener tag de país OBLIGATORIO
  const countryTag = await getCountryTagObligatorio(supabase);
  if (!countryTag) {
    return createJsonResponse({
      test: 'buscar-propiedades',
      success: false,
      message: 'Tag de país obligatorio no encontrado',
      data: {
        properties: [],
        tags: []
      }
    });
  }
  // Obtener tags de búsqueda
  const tagsResponse = await testBuscarTags(supabase, context);
  const tagsData = await tagsResponse.json();
  // SIEMPRE incluir país como tag obligatorio
  let searchTagIds = [
    countryTag.id
  ];
  if (tagsData.success && tagsData.data.tags.length > 0) {
    const additionalTagIds = tagsData.data.tags.filter((tag)=>tag.id !== countryTag.id) // Evitar duplicar país
    .map((tag)=>tag.id);
    searchTagIds = [
      countryTag.id,
      ...additionalTagIds
    ];
  }
  console.log('🌍 Tag de país OBLIGATORIO:', countryTag.id);
  console.log('🏷️ Tags de búsqueda completos:', searchTagIds);
  try {
    // Buscar propiedades que tengan TODOS los tags (incluido país OBLIGATORIO)
    const { data: contentTags, error: ctError } = await supabase.from('content_tags').select('content_id, tag_id, weight').eq('content_type', 'property').in('tag_id', searchTagIds);
    if (ctError) throw ctError;
    // Organizar por relevancia: contar tags + peso
    const propertyScores = {};
    contentTags?.forEach((ct)=>{
      if (!propertyScores[ct.content_id]) {
        propertyScores[ct.content_id] = {
          tagCount: 0,
          totalWeight: 0,
          matchedTags: [],
          hasCountryTag: false
        };
      }
      propertyScores[ct.content_id].tagCount += 1;
      propertyScores[ct.content_id].totalWeight += ct.weight || 1;
      propertyScores[ct.content_id].matchedTags.push(ct.tag_id);
      // Marcar si tiene el tag de país
      if (ct.tag_id === countryTag.id) {
        propertyScores[ct.content_id].hasCountryTag = true;
      }
    });
    // FILTRO OBLIGATORIO: Solo propiedades que tengan el tag de país
    const propertiesWithCountry = Object.entries(propertyScores).filter(([propertyId, score])=>score.hasCountryTag).filter(([propertyId, score])=>score.tagCount === searchTagIds.length); // Todos los tags
    console.log('🌍 Propiedades filtradas POR PAÍS:', {
      totalEncontradas: Object.keys(propertyScores).length,
      conPaisObligatorio: propertiesWithCountry.length,
      paisRequerido: countryTag.id
    });
    if (propertiesWithCountry.length === 0) {
      return createJsonResponse({
        test: 'buscar-propiedades',
        success: true,
        message: 'No hay propiedades de este país que coincidan con los criterios',
        data: {
          properties: [],
          countryFilter: 'applied_mandatory',
          countryTagId: countryTag.id,
          searchTagIds: searchTagIds
        }
      });
    }
    // Ordenar por relevancia: primero por cantidad de tags, luego por peso
    const sortedPropertyIds = propertiesWithCountry.sort(([, a], [, b])=>{
      if (b.tagCount !== a.tagCount) {
        return b.tagCount - a.tagCount; // Más tags coincidentes primero
      }
      return b.totalWeight - a.totalWeight; // Luego por mayor peso
    }).slice(0, 20) // Top 20
    .map(([propertyId])=>propertyId);
    // Construir select con campo de traducción
    const contentField = context.language !== 'es' ? `content_${context.language}` : null;
    let selectFields = `
      id, name, description, slug_url, slug_en, slug_fr,
      sale_price, rental_price, sale_currency, rental_currency,
      bedrooms, bathrooms, main_image_url,
      property_categories(name), cities(name), sectors(name)
    `;
    if (contentField) {
      selectFields += `, ${contentField}`;
    }
    // Obtener detalles de propiedades ordenadas por relevancia
    const { data: properties, error: propError } = await supabase.from('properties').select(selectFields).in('id', sortedPropertyIds).eq('availability', 1).eq('property_status', 'Publicada');
    // Reordenar según el score calculado y aplicar traducciones
    const sortedProperties = sortedPropertyIds.map((id)=>properties?.find((p)=>p.id.toString() === id)).filter(Boolean).map((property)=>{
      let processedProperty = {
        id: property.id,
        name: property.name,
        description: property.description,
        // Slug traducido según idioma, pero siempre se llama 'slug'
        slug: context.language === 'es' ? property.slug_url : context.language === 'en' ? property.slug_en || property.slug_url : property.slug_fr || property.slug_url,
        sale_price: property.sale_price,
        rental_price: property.rental_price,
        sale_currency: property.sale_currency,
        rental_currency: property.rental_currency,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        main_image_url: property.main_image_url,
        property_categories: property.property_categories,
        cities: property.cities,
        sectors: property.sectors,
        language: context.language,
        _relevance: propertyScores[property.id],
        _translated: false
      };
      // Aplicar traducciones JSON si no es español
      if (context.language !== 'es' && property[contentField]) {
        try {
          const translations = typeof property[contentField] === 'string' ? JSON.parse(property[contentField]) : property[contentField];
          if (translations) {
            processedProperty.name = translations.name || property.name;
            processedProperty.description = translations.description || property.description;
            processedProperty._translated = true;
            processedProperty._original_name = property.name;
          }
        } catch (e) {
          console.warn('⚠️ Error parsing property translations:', e.message);
        }
      }
      return processedProperty;
    });
    return createJsonResponse({
      test: 'buscar-propiedades',
      success: true,
      data: {
        language: context.language,
        translationApplied: context.language !== 'es',
        countryFilter: 'mandatory_applied',
        countryTagId: countryTag.id,
        tagsUsed: tagsData.data.tags || [],
        totalPropertiesFound: propertiesWithCountry.length,
        propertiesReturned: sortedProperties.length,
        properties: sortedProperties
      },
      debug: {
        note: '🌍 TAG DE PAÍS OBLIGATORIO - Solo propiedades del país correcto',
        countryMandatory: true,
        searchTagIds: searchTagIds,
        countryFirst: true,
        topScores: propertiesWithCountry.slice(0, 5).map(([id, score])=>({
            propertyId: id,
            tagCount: score.tagCount,
            totalWeight: score.totalWeight,
            hasCountryTag: score.hasCountryTag
          }))
      }
    });
  } catch (error) {
    return createJsonResponse({
      test: 'buscar-propiedades',
      success: false,
      error: error.message,
      data: {
        properties: []
      }
    });
  }
}
// ========================================
// 🧪 TEST: Artículos CON PAÍS OBLIGATORIO Y ORDENAMIENTO JERÁRQUICO
// ========================================
async function testArticulos(supabase, context) {
  console.log('📰 Obteniendo artículos para idioma:', context.language);
  // 🌍 OBTENER TAG DE PAÍS OBLIGATORIO
  const countryTag = await getCountryTagObligatorio(supabase);
  if (!countryTag) {
    return createJsonResponse({
      test: 'articulos',
      success: false,
      message: 'Tag de país obligatorio no encontrado',
      data: {
        articles: []
      }
    });
  }
  // 🏷️ OBTENER TAGS DE BÚSQUEDA (si hay)
  let searchTagIds = [];
  if (context.segments && context.segments.length > 0) {
    const tagsResponse = await testBuscarTags(supabase, context);
    const tagsData = await tagsResponse.json();
    if (tagsData.success && tagsData.data.tags.length > 0) {
      searchTagIds = tagsData.data.tags.map((tag)=>tag.id);
    }
  }
  // 📰 BUSCAR ARTÍCULOS CON ORDENAMIENTO JERÁRQUICO
  // Para property list: propertyId = null (solo tags + featured)
  // Para single property: se pasa propertyId (específico + featured + tags)
  const propertyId = context.propertyId || null; // Determinar si es single property
  const articleIds = await buscarContenidoPorTags(supabase, 'article', searchTagIds, countryTag.id, 6, propertyId);
  if (articleIds.length === 0) {
    return createJsonResponse({
      test: 'articulos',
      success: true,
      message: 'No hay artículos del país especificado que coincidan con los criterios',
      data: {
        articles: [],
        countryFilter: 'applied_mandatory',
        countryTagId: countryTag.id,
        searchTagIds: searchTagIds,
        orderingApplied: 'jerárquico: específico → destacado → tags → peso'
      }
    });
  }
  try {
    // Construir select con campos de traducción
    let selectFields = `
      id, title, slug, slug_en, slug_fr, excerpt, content, featured_image, published_at, 
      read_time, category, views, featured,
      users!articles_author_id_fkey(first_name, last_name, profile_photo_url)
    `;
    // Agregar campo JSON de traducción
    if (context.language !== 'es') {
      selectFields += `, content_${context.language}`;
    }
    console.log('📰 Consultando articles con IDs:', articleIds);
    console.log('📰 Select fields:', selectFields);
    const { data: articles, error } = await supabase.from('articles').select(selectFields).in('id', articleIds).eq('status', 'published').order('published_at', {
      ascending: false
    });
    console.log('📰 Query result:', {
      articlesFound: articles?.length || 0,
      error: error?.message,
      firstArticle: articles?.[0]?.id || 'none'
    });
    if (error) {
      console.error('❌ Error en query de articles:', error);
      return createJsonResponse({
        test: 'articulos',
        success: false,
        error: `Error consultando articles: ${error.message}`,
        data: {
          articles: []
        },
        debug: {
          articleIds,
          selectFields,
          queryError: error
        }
      });
    }
    const processedArticles = articles?.map((article)=>{
      let processedArticle = {
        id: article.id,
        title: article.title,
        excerpt: article.excerpt,
        content: article.content,
        // Slug traducido según idioma, pero siempre se llama 'slug'
        slug: context.language === 'es' ? article.slug : context.language === 'en' ? article.slug_en || article.slug : article.slug_fr || article.slug,
        featured_image: article.featured_image,
        published_at: article.published_at,
        read_time: article.read_time,
        category: article.category,
        views: article.views,
        featured: article.featured,
        author: {
          name: article.users ? `${article.users.first_name || ''} ${article.users.last_name || ''}`.trim() || 'Equipo CLIC' : 'Equipo CLIC',
          avatar: article.users?.profile_photo_url || '/images/team/default.jpg'
        },
        readTime: article.read_time ? `${article.read_time} min` : '5 min',
        language: context.language,
        _translated: false
      };
      // Aplicar traducciones desde JSON si no es español
      if (context.language !== 'es') {
        const contentField = `content_${context.language}`;
        const translationData = article[contentField];
        if (translationData) {
          try {
            const translations = typeof translationData === 'string' ? JSON.parse(translationData) : translationData;
            if (translations) {
              // Aplicar traducciones manteniendo nombres de campo estándar
              processedArticle.title = translations.title || article.title;
              processedArticle.excerpt = translations.excerpt || article.excerpt;
              processedArticle.content = translations.content || article.content;
              processedArticle._translated = true;
              processedArticle._original_title = article.title;
              processedArticle._original_excerpt = article.excerpt;
            }
          } catch (e) {
            console.warn('⚠️ Error parsing article translations:', e.message);
            processedArticle._translation_error = e.message;
          }
        }
      }
      return processedArticle;
    }) || [];
    const translatedCount = processedArticles.filter((a)=>a._translated).length;
    return createJsonResponse({
      test: 'articulos',
      success: true,
      data: {
        language: context.language,
        translationApplied: context.language !== 'es',
        countryFilter: 'applied_mandatory',
        countryTagId: countryTag.id,
        searchTagIds: searchTagIds,
        articlesFound: articles?.length || 0,
        articlesTranslated: translatedCount,
        articles: processedArticles
      },
      debug: {
        note: '🌍 PAÍS OBLIGATORIO + ORDENAMIENTO JERÁRQUICO aplicado',
        countryMandatory: true,
        countryFirst: true,
        orderingCriteria: 'específico → destacado → tags → peso',
        isPropertyListMode: !propertyId,
        translationSource: context.language !== 'es' ? `content_${context.language} JSON` : 'original spanish',
        error: error?.message
      }
    });
  } catch (error) {
    return createJsonResponse({
      test: 'articulos',
      success: false,
      error: error.message,
      data: {
        articles: []
      }
    });
  }
}
// ========================================
// 🧪 TEST: Videos CON PAÍS OBLIGATORIO
// ========================================
async function testVideos(supabase, context) {
  console.log('🎥 Obteniendo videos para idioma:', context.language);
  // 🌍 OBTENER TAG DE PAÍS OBLIGATORIO
  const countryTag = await getCountryTagObligatorio(supabase);
  if (!countryTag) {
    return createJsonResponse({
      test: 'videos',
      success: false,
      message: 'Tag de país obligatorio no encontrado',
      data: {
        videos: []
      }
    });
  }
  // 🏷️ OBTENER TAGS DE BÚSQUEDA (si hay)
  let searchTagIds = [];
  if (context.segments && context.segments.length > 0) {
    const tagsResponse = await testBuscarTags(supabase, context);
    const tagsData = await tagsResponse.json();
    if (tagsData.success && tagsData.data.tags.length > 0) {
      searchTagIds = tagsData.data.tags.map((tag)=>tag.id);
    }
  }
  // 🎥 BUSCAR VIDEOS CON ORDENAMIENTO JERÁRQUICO
  const propertyId = context.propertyId || null;
  const videoIds = await buscarContenidoPorTags(supabase, 'video', searchTagIds, countryTag.id, 8, propertyId);
  if (videoIds.length === 0) {
    return createJsonResponse({
      test: 'videos',
      success: true,
      message: 'No hay videos del país especificado que coincidan con los criterios',
      data: {
        videos: [],
        countryFilter: 'applied_mandatory',
        countryTagId: countryTag.id,
        searchTagIds: searchTagIds
      }
    });
  }
  try {
    // Construir select con campos de traducción
    let selectFields = `
      id, title, description, video_slug, slug_en, slug_fr,
      thumbnail, video_id, video_platform, duration, views, 
      category, featured, published_at, subtitle
    `;
    // Agregar campo JSON de traducción
    if (context.language !== 'es') {
      selectFields += `, content_${context.language}`;
    }
    const { data: videos, error } = await supabase.from('videos').select(selectFields).in('id', videoIds).eq('status', 'published').order('featured', {
      ascending: false
    }) // Featured primero
    .order('published_at', {
      ascending: false
    }); // Luego por fecha
    const processedVideos = videos?.map((video)=>{
      let processedVideo = {
        id: video.id,
        title: video.title,
        description: video.description,
        // Slug traducido según idioma, pero siempre se llama 'slug'
        slug: context.language === 'es' ? video.video_slug : context.language === 'en' ? video.slug_en || video.video_slug : video.slug_fr || video.video_slug,
        thumbnail: video.thumbnail,
        video_id: video.video_id,
        video_platform: video.video_platform,
        duration: video.duration,
        views: video.views,
        category: video.category,
        featured: video.featured,
        published_at: video.published_at,
        subtitle: video.subtitle,
        language: context.language,
        _translated: false,
        youtube_url: video.video_platform === 'youtube' && video.video_id ? `https://www.youtube.com/watch?v=${video.video_id}` : null
      };
      // Aplicar traducciones desde JSON si no es español
      if (context.language !== 'es') {
        const contentField = `content_${context.language}`;
        const translationData = video[contentField];
        if (translationData) {
          try {
            const translations = typeof translationData === 'string' ? JSON.parse(translationData) : translationData;
            if (translations) {
              // Aplicar traducciones manteniendo nombres de campo estándar
              processedVideo.title = translations.title || video.title;
              processedVideo.description = translations.description || video.description;
              processedVideo._translated = true;
              processedVideo._original_title = video.title;
              processedVideo._original_description = video.description;
            }
          } catch (e) {
            console.warn('⚠️ Error parsing video translations:', e.message);
            processedVideo._translation_error = e.message;
          }
        }
      }
      return processedVideo;
    }) || [];
    const translatedCount = processedVideos.filter((v)=>v._translated).length;
    const featuredCount = processedVideos.filter((v)=>v.featured).length;
    return createJsonResponse({
      test: 'videos',
      success: true,
      data: {
        language: context.language,
        translationApplied: context.language !== 'es',
        countryFilter: 'applied_mandatory',
        countryTagId: countryTag.id,
        searchTagIds: searchTagIds,
        videosFound: videos?.length || 0,
        videosTranslated: translatedCount,
        videosFeatured: featuredCount,
        videos: processedVideos
      },
      debug: {
        note: '🌍 PAÍS OBLIGATORIO - Solo videos del país correcto',
        countryMandatory: true,
        countryFirst: true,
        orderCriteria: 'featured first, then newest',
        translationSource: context.language !== 'es' ? `content_${context.language} JSON` : 'original spanish',
        error: error?.message
      }
    });
  } catch (error) {
    return createJsonResponse({
      test: 'videos',
      success: false,
      error: error.message,
      data: {
        videos: []
      }
    });
  }
}
// ========================================
// 🧪 TEST: FAQs CON PAÍS OBLIGATORIO
// ========================================
async function testFaqs(supabase, context) {
  console.log('❓ Obteniendo FAQs para idioma:', context.language);
  // 🌍 OBTENER TAG DE PAÍS OBLIGATORIO
  const countryTag = await getCountryTagObligatorio(supabase);
  if (!countryTag) {
    return createJsonResponse({
      test: 'faqs',
      success: false,
      message: 'Tag de país obligatorio no encontrado',
      data: {
        faqs: []
      }
    });
  }
  // 🏷️ OBTENER TAGS DE BÚSQUEDA (si hay)
  let searchTagIds = [];
  if (context.segments && context.segments.length > 0) {
    const tagsResponse = await testBuscarTags(supabase, context);
    const tagsData = await tagsResponse.json();
    if (tagsData.success && tagsData.data.tags.length > 0) {
      searchTagIds = tagsData.data.tags.map((tag)=>tag.id);
    }
  }
  // ❓ BUSCAR FAQS CON ORDENAMIENTO JERÁRQUICO  
  const propertyId = context.propertyId || null;
  const faqIds = await buscarContenidoPorTags(supabase, 'faq', searchTagIds, countryTag.id, 10, propertyId);
  if (faqIds.length === 0) {
    return createJsonResponse({
      test: 'faqs',
      success: true,
      message: 'No hay FAQs del país especificado que coincidan con los criterios',
      data: {
        faqs: [],
        countryFilter: 'applied_mandatory',
        countryTagId: countryTag.id,
        searchTagIds: searchTagIds
      }
    });
  }
  try {
    // FAQs solo tienen content_en y content_fr (sin URLs)
    let selectFields = `
      id, question, answer, sort_order, category, featured,
      created_at, updated_at, status
    `;
    // Agregar campo JSON de traducción
    if (context.language !== 'es') {
      selectFields += `, content_${context.language}`;
    }
    console.log('❓ Consultando faqs con IDs:', faqIds);
    console.log('❓ Select fields:', selectFields);
    const { data: faqs, error } = await supabase.from('faqs').select(selectFields).in('id', faqIds).eq('status', 'published').order('sort_order', {
      nullsFirst: false
    }); // REMOVER ordenamiento de BD
    console.log('❓ Query result:', {
      faqsFound: faqs?.length || 0,
      error: error?.message,
      firstFaq: faqs?.[0]?.id || 'none'
    });
    if (error) {
      console.error('❌ Error en query de faqs:', error);
      return createJsonResponse({
        test: 'faqs',
        success: false,
        error: `Error consultando faqs: ${error.message}`,
        data: {
          faqs: []
        },
        debug: {
          faqIds,
          selectFields,
          queryError: error
        }
      });
    }
    // 🔍 PRESERVAR EL ORDEN JERÁRQUICO EN FAQs
    const orderedFaqs = faqIds.map((id)=>faqs?.find((faq)=>faq.id === id)).filter(Boolean);
    console.log('❓ FAQs - Verificación de orden final:', {
      faqIdsOrder: faqIds.slice(0, 3),
      orderedFaqsIds: orderedFaqs.slice(0, 3).map((f)=>f.id),
      orderPreserved: faqIds.slice(0, 3).every((id, index)=>orderedFaqs[index]?.id === id)
    });
    const processedFaqs = orderedFaqs.map((faq)=>{
      let processedFaq = {
        ...faq,
        language: context.language,
        _translated: false
      };
      // Aplicar traducciones desde JSON si no es español
      if (context.language !== 'es') {
        const contentField = `content_${context.language}`;
        const translationData = faq[contentField];
        if (translationData) {
          try {
            const translations = typeof translationData === 'string' ? JSON.parse(translationData) : translationData;
            if (translations) {
              // Guardar originales
              processedFaq._original_question = faq.question;
              processedFaq._original_answer = faq.answer;
              // Aplicar traducciones
              processedFaq.question = translations.question || faq.question;
              processedFaq.answer = translations.answer || faq.answer;
              processedFaq._translated = true;
            }
          } catch (e) {
            console.warn('⚠️ Error parsing FAQ translations:', e.message);
            processedFaq._translation_error = e.message;
          }
        }
        // Limpiar campo JSON
        delete processedFaq[contentField];
      }
      return processedFaq;
    }) || [];
    const translatedCount = processedFaqs.filter((f)=>f._translated).length;
    return createJsonResponse({
      test: 'faqs',
      success: true,
      data: {
        language: context.language,
        translationApplied: context.language !== 'es',
        countryFilter: 'applied_mandatory',
        countryTagId: countryTag.id,
        searchTagIds: searchTagIds,
        faqsFound: faqs?.length || 0,
        faqsTranslated: translatedCount,
        faqs: processedFaqs
      },
      debug: {
        note: '🌍 PAÍS OBLIGATORIO - Solo FAQs del país correcto',
        countryMandatory: true,
        countryFirst: true,
        translationField: context.language !== 'es' ? `content_${context.language}` : 'none (spanish)',
        translationStructure: 'JSON with question, answer',
        error: error?.message
      }
    });
  } catch (error) {
    return createJsonResponse({
      test: 'faqs',
      success: false,
      error: error.message,
      data: {
        faqs: []
      }
    });
  }
}
// ========================================
// 🧪 TEST: SEO Content CON PAÍS OBLIGATORIO
// ========================================
async function testSeoContent(supabase, context) {
  console.log('🔍 Obteniendo SEO content para idioma:', context.language);
  // 🌍 OBTENER TAG DE PAÍS OBLIGATORIO
  const countryTag = await getCountryTagObligatorio(supabase);
  if (!countryTag) {
    return createJsonResponse({
      test: 'seo-content',
      success: false,
      message: 'Tag de país obligatorio no encontrado',
      data: {
        seoContent: []
      }
    });
  }
  // 🏷️ OBTENER TAGS DE BÚSQUEDA (si hay)
  let searchTagIds = [];
  if (context.segments && context.segments.length > 0) {
    const tagsResponse = await testBuscarTags(supabase, context);
    const tagsData = await tagsResponse.json();
    if (tagsData.success && tagsData.data.tags.length > 0) {
      searchTagIds = tagsData.data.tags.map((tag)=>tag.id);
    }
  }
  // 🔍 BUSCAR SEO CONTENT CON ORDENAMIENTO JERÁRQUICO
  const propertyId = context.propertyId || null;
  const seoContentIds = await buscarContenidoPorTags(supabase, 'seo_content', searchTagIds, countryTag.id, 8, propertyId);
  if (seoContentIds.length === 0) {
    return createJsonResponse({
      test: 'seo-content',
      success: true,
      message: 'No hay SEO content del país especificado que coincida con los criterios',
      data: {
        seoContent: [],
        countryFilter: 'applied_mandatory',
        countryTagId: countryTag.id,
        searchTagIds: searchTagIds
      }
    });
  }
  try {
    // SEO content - campos reales de la tabla
    let selectFields = `
      id, title, description, seo_content, meta_title, meta_description, 
      content_type, identifier, location_context, property_type_context,
      operation_context, views, status, created_at, updated_at
    `;
    // Agregar campo específico según idioma
    if (context.language !== 'es') {
      selectFields += `, content_${context.language}`;
    }
    console.log('🔍 Consultando seo_content con IDs:', seoContentIds);
    console.log('🔍 Select fields:', selectFields);
    const { data: seoContent, error } = await supabase.from('seo_content').select(selectFields).in('id', seoContentIds).eq('status', 'published'); // REMOVER .order('priority') que no existe
    console.log('🔍 Query result:', {
      seoContentFound: seoContent?.length || 0,
      error: error?.message,
      firstSeoContent: seoContent?.[0]?.id || 'none'
    });
    if (error) {
      console.error('❌ Error en query de seo_content:', error);
      return createJsonResponse({
        test: 'seo-content',
        success: false,
        error: `Error consultando seo_content: ${error.message}`,
        data: {
          seoContent: []
        },
        debug: {
          seoContentIds,
          selectFields,
          queryError: error
        }
      });
    }
    // 🔍 PRESERVAR EL ORDEN JERÁRQUICO EN SEO CONTENT
    const orderedSeoContent = seoContentIds.map((id)=>seoContent?.find((seo)=>seo.id === id)).filter(Boolean);
    console.log('🔍 SEO Content - Verificación de orden final:', {
      seoContentIdsOrder: seoContentIds.slice(0, 3),
      orderedSeoContentIds: orderedSeoContent.slice(0, 3).map((s)=>s.id),
      orderPreserved: seoContentIds.slice(0, 3).every((id, index)=>orderedSeoContent[index]?.id === id)
    });
    const processedSeoContent = orderedSeoContent.map((seo)=>{
      let processedSeo = {
        id: seo.id,
        title: seo.title,
        description: seo.description,
        content: seo.seo_content,
        meta_title: seo.meta_title,
        meta_description: seo.meta_description,
        content_type: seo.content_type,
        identifier: seo.identifier,
        location_context: seo.location_context,
        property_type_context: seo.property_type_context,
        operation_context: seo.operation_context,
        views: seo.views,
        status: seo.status,
        created_at: seo.created_at,
        updated_at: seo.updated_at,
        language: context.language,
        _translated: false
      };
      // Aplicar traducciones desde JSON si no es español
      if (context.language !== 'es') {
        const contentField = `content_${context.language}`;
        const translationData = seo[contentField];
        if (translationData) {
          try {
            const translations = typeof translationData === 'string' ? JSON.parse(translationData) : translationData;
            if (translations) {
              // Guardar originales
              processedSeo._original_title = seo.title;
              processedSeo._original_content = seo.seo_content;
              processedSeo._original_description = seo.description;
              processedSeo._original_meta_title = seo.meta_title;
              processedSeo._original_meta_description = seo.meta_description;
              // Aplicar traducciones
              processedSeo.title = translations.title || seo.title;
              processedSeo.content = translations.seo_content || seo.seo_content;
              processedSeo.description = translations.description || seo.description;
              processedSeo.meta_title = translations.meta_title || seo.meta_title;
              processedSeo.meta_description = translations.meta_description || seo.meta_description;
              processedSeo._translated = true;
            }
          } catch (e) {
            console.warn('⚠️ Error parsing SEO content translations:', e.message);
            processedSeo._translation_error = e.message;
          }
        }
        // Limpiar campo JSON
        delete processedSeo[contentField];
      }
      return processedSeo;
    }) || [];
    const translatedCount = processedSeoContent.filter((s)=>s._translated).length;
    return createJsonResponse({
      test: 'seo-content',
      success: true,
      data: {
        language: context.language,
        translationApplied: context.language !== 'es',
        countryFilter: 'applied_mandatory',
        countryTagId: countryTag.id,
        searchTagIds: searchTagIds,
        seoContentFound: seoContent?.length || 0,
        seoContentTranslated: translatedCount,
        seoContent: processedSeoContent
      },
      debug: {
        note: '🌍 PAÍS OBLIGATORIO - Solo SEO content del país correcto',
        countryMandatory: true,
        countryFirst: true,
        translationField: context.language !== 'es' ? `content_${context.language}` : 'none (spanish)',
        translationStructure: 'JSON with title, content, meta_title, meta_description',
        error: error?.message
      }
    });
  } catch (error) {
    return createJsonResponse({
      test: 'seo-content',
      success: false,
      error: error.message,
      data: {
        seoContent: []
      }
    });
  }
}
// ========================================
// 🧪 TEST: Testimonials CON PAÍS OBLIGATORIO
// ========================================
async function testTestimonials(supabase, context) {
  console.log('🗣️ Obteniendo testimonials para idioma:', context.language);
  // 🌍 OBTENER TAG DE PAÍS OBLIGATORIO
  const countryTag = await getCountryTagObligatorio(supabase);
  if (!countryTag) {
    return createJsonResponse({
      test: 'testimonials',
      success: false,
      message: 'Tag de país obligatorio no encontrado',
      data: {
        testimonials: []
      }
    });
  }
  // 🏷️ OBTENER TAGS DE BÚSQUEDA (si hay)
  let searchTagIds = [];
  if (context.segments && context.segments.length > 0) {
    const tagsResponse = await testBuscarTags(supabase, context);
    const tagsData = await tagsResponse.json();
    if (tagsData.success && tagsData.data.tags.length > 0) {
      searchTagIds = tagsData.data.tags.map((tag)=>tag.id);
    }
  }
  // 🗣️ BUSCAR TESTIMONIALS CON ORDENAMIENTO JERÁRQUICO
  const propertyId = context.propertyId || null;
  const testimonialIds = await buscarContenidoPorTags(supabase, 'testimonial', searchTagIds, countryTag.id, 8, propertyId);
  if (testimonialIds.length === 0) {
    return createJsonResponse({
      test: 'testimonials',
      success: true,
      message: 'No hay testimonials del país especificado que coincidan con los criterios',
      data: {
        testimonials: [],
        countryFilter: 'applied_mandatory',
        countryTagId: countryTag.id,
        searchTagIds: searchTagIds
      }
    });
  }
  try {
    // Testimonials - campos reales de la tabla
    let selectFields = `
      id, client_name, full_testimonial, rating, client_location, property_type,
      client_avatar, featured, published_at, created_at, status, title, excerpt,
      client_profession, category
    `;
    // Agregar campo específico según idioma
    if (context.language !== 'es') {
      selectFields += `, content_${context.language}`;
    }
    console.log('🗣️ Consultando testimonials con IDs:', testimonialIds);
    console.log('🗣️ Select fields:', selectFields);
    const { data: testimonials, error } = await supabase.from('testimonials').select(selectFields).in('id', testimonialIds).eq('status', 'published').order('featured', {
      ascending: false
    }) // Featured primero
    .order('published_at', {
      ascending: false
    }); // Luego por fecha
    console.log('🗣️ Query result:', {
      testimonialsFound: testimonials?.length || 0,
      error: error?.message,
      firstTestimonial: testimonials?.[0]?.id || 'none'
    });
    if (error) {
      console.error('❌ Error en query de testimonials:', error);
      return createJsonResponse({
        test: 'testimonials',
        success: false,
        error: `Error consultando testimonials: ${error.message}`,
        data: {
          testimonials: []
        },
        debug: {
          testimonialIds,
          selectFields,
          queryError: error
        }
      });
    }
    const processedTestimonials = testimonials?.map((testimonial)=>{
      let processedTestimonial = {
        id: testimonial.id,
        client_name: testimonial.client_name,
        content: testimonial.full_testimonial,
        title: testimonial.title,
        excerpt: testimonial.excerpt,
        rating: testimonial.rating,
        location: testimonial.client_location,
        property_type: testimonial.property_type,
        client_photo: testimonial.client_avatar,
        client_profession: testimonial.client_profession,
        category: testimonial.category,
        featured: testimonial.featured,
        published_at: testimonial.published_at,
        created_at: testimonial.created_at,
        status: testimonial.status,
        language: context.language,
        _translated: false
      };
      // Aplicar traducciones desde JSON si no es español
      if (context.language !== 'es') {
        const contentField = `content_${context.language}`;
        const translationData = testimonial[contentField];
        if (translationData) {
          try {
            const translations = typeof translationData === 'string' ? JSON.parse(translationData) : translationData;
            if (translations) {
              // Guardar originales
              processedTestimonial._original_content = testimonial.full_testimonial;
              processedTestimonial._original_client_name = testimonial.client_name;
              processedTestimonial._original_location = testimonial.client_location;
              processedTestimonial._original_title = testimonial.title;
              // Aplicar traducciones
              processedTestimonial.content = translations.full_testimonial || testimonial.full_testimonial;
              processedTestimonial.client_name = translations.client_name || testimonial.client_name;
              processedTestimonial.location = translations.client_location || testimonial.client_location;
              processedTestimonial.title = translations.title || testimonial.title;
              processedTestimonial._translated = true;
            }
          } catch (e) {
            console.warn('⚠️ Error parsing testimonial translations:', e.message);
            processedTestimonial._translation_error = e.message;
          }
        }
        // Limpiar campo JSON
        delete processedTestimonial[contentField];
      }
      return processedTestimonial;
    }) || [];
    const translatedCount = processedTestimonials.filter((t)=>t._translated).length;
    const featuredCount = processedTestimonials.filter((t)=>t.featured).length;
    return createJsonResponse({
      test: 'testimonials',
      success: true,
      data: {
        language: context.language,
        translationApplied: context.language !== 'es',
        countryFilter: 'applied_mandatory',
        countryTagId: countryTag.id,
        searchTagIds: searchTagIds,
        testimonialsFound: testimonials?.length || 0,
        testimonialsTranslated: translatedCount,
        testimonialsFeatured: featuredCount,
        testimonials: processedTestimonials
      },
      debug: {
        note: '🌍 PAÍS OBLIGATORIO - Solo testimonials del país correcto',
        countryMandatory: true,
        countryFirst: true,
        orderCriteria: 'featured first, then newest',
        translationSource: context.language !== 'es' ? `content_${context.language} JSON` : 'original spanish',
        error: error?.message
      }
    });
  } catch (error) {
    return createJsonResponse({
      test: 'testimonials',
      success: false,
      error: error.message,
      data: {
        testimonials: []
      }
    });
  }
}
// ========================================
// 🧪 TEST: Contenido Relacionado DIRECTO DE PROPIEDAD (content_property_relations)
// ========================================
async function testContenidoRelacionado(supabase, context) {
  console.log('🔗 Obteniendo contenido relacionado DIRECTO de propiedad específica para idioma:', context.language);
  // 🏡 BUSCAR PROPIEDAD POR URL COMPLETA
  const property = await findPropertyByUrl(supabase, context.cleanUrl, context.language);
  if (!property) {
    return createJsonResponse({
      test: 'contenido-relacionado',
      success: false,
      message: `No se encontró propiedad con URL: ${context.cleanUrl}`,
      data: {
        content: {}
      },
      debug: {
        searchUrl: context.cleanUrl,
        language: context.language,
        segments: context.segments
      }
    });
  }
  try {
    console.log('🔗 Buscando contenido relacionado DIRECTO para propiedad:', property.id);
    // 🎯 BUSCAR RELACIONES DIRECTAS EN content_property_relations
    const { data: relations, error: relError } = await supabase.from('content_property_relations').select('content_id, content_type, relation_type, weight').eq('property_id', property.id).order('weight', {
      ascending: false
    });
    if (relError) {
      console.error('❌ Error buscando relaciones directas:', relError);
      return createJsonResponse({
        test: 'contenido-relacionado',
        success: false,
        error: `Error buscando relaciones: ${relError.message}`,
        data: {
          content: {}
        }
      });
    }
    console.log('🎯 Relaciones directas encontradas:', {
      total: relations?.length || 0,
      byType: relations?.reduce((acc, rel)=>{
        acc[rel.content_type] = (acc[rel.content_type] || 0) + 1;
        return acc;
      }, {}) || {}
    });
    if (!relations || relations.length === 0) {
      return createJsonResponse({
        test: 'contenido-relacionado',
        success: true,
        message: 'No hay contenido relacionado directo para esta propiedad',
        data: {
          sourceProperty: {
            id: property.id,
            name: property.name,
            url: context.cleanUrl
          },
          content: {
            articles: [],
            videos: [],
            faqs: [],
            testimonials: [],
            seoContent: []
          },
          relationshipType: 'direct_property_relations',
          totalRelations: 0
        }
      });
    }
    // 📊 ORGANIZAR POR TIPO DE CONTENIDO
    const contentByType = relations.reduce((acc, rel)=>{
      if (!acc[rel.content_type]) acc[rel.content_type] = [];
      acc[rel.content_type].push({
        id: rel.content_id,
        weight: rel.weight,
        relation_type: rel.relation_type
      });
      return acc;
    }, {});
    // 🔄 OBTENER DETALLES DEL CONTENIDO EN PARALELO
    const [articles, videos, testimonials, faqs, seoContent] = await Promise.all([
      contentByType.article ? getContentDetails(supabase, 'articles', contentByType.article, context.language) : [],
      contentByType.video ? getContentDetails(supabase, 'videos', contentByType.video, context.language) : [],
      contentByType.testimonial ? getContentDetails(supabase, 'testimonials', contentByType.testimonial, context.language) : [],
      contentByType.faq ? getContentDetails(supabase, 'faqs', contentByType.faq, context.language) : [],
      contentByType.seo_content ? getContentDetails(supabase, 'seo_content', contentByType.seo_content, context.language) : []
    ]);
    // 📈 ESTADÍSTICAS FINALES
    const contentStats = {
      articles: articles.length,
      videos: videos.length,
      testimonials: testimonials.length,
      faqs: faqs.length,
      seoContent: seoContent.length,
      totalContent: articles.length + videos.length + testimonials.length + faqs.length + seoContent.length,
      totalRelations: relations.length
    };
    return createJsonResponse({
      test: 'contenido-relacionado',
      success: true,
      data: {
        sourceProperty: {
          id: property.id,
          name: property.name,
          url: context.cleanUrl
        },
        language: context.language,
        relationshipType: 'direct_property_relations',
        content: {
          articles: articles,
          videos: videos,
          testimonials: testimonials,
          faqs: faqs,
          seoContent: seoContent
        },
        contentStats: contentStats,
        relations: relations
      },
      debug: {
        note: '🎯 CONTENIDO RELACIONADO DIRECTO - Desde content_property_relations',
        method: 'content_property_relations table',
        propertySpecific: true,
        orderingCriteria: 'weight DESC from content_property_relations',
        relationshipTypes: [
          ...new Set(relations.map((r)=>r.relation_type))
        ]
      }
    });
  } catch (error) {
    return createJsonResponse({
      test: 'contenido-relacionado',
      success: false,
      error: error.message,
      data: {
        content: {}
      }
    });
  }
}
// ========================================
// 🛠️ HELPER: Obtener Detalles de Contenido por Tipo
// ========================================
async function getContentDetails(supabase, tableName, contentItems, language) {
  if (!contentItems || contentItems.length === 0) return [];
  const contentIds = contentItems.map((item)=>item.id);
  try {
    let selectFields = '';
    let orderBy = 'created_at';
    // Definir campos según tipo de tabla
    switch(tableName){
      case 'articles':
        selectFields = `
          id, title, slug, slug_en, slug_fr, excerpt, content, featured_image, published_at, 
          read_time, category, views, featured,
          users!articles_author_id_fkey(first_name, last_name, profile_photo_url)
        `;
        orderBy = 'published_at';
        break;
      case 'videos':
        selectFields = `
          id, title, description, video_slug, slug_en, slug_fr,
          thumbnail, video_id, video_platform, duration, views, 
          category, featured, published_at, subtitle
        `;
        orderBy = 'published_at';
        break;
      case 'testimonials':
        selectFields = `
          id, client_name, full_testimonial, rating, client_location, property_type,
          client_avatar, featured, published_at, created_at, status, title, excerpt,
          client_profession, category
        `;
        orderBy = 'published_at';
        break;
      case 'faqs':
        selectFields = `
          id, question, answer, sort_order, category, featured,
          created_at, updated_at, status
        `;
        orderBy = 'sort_order';
        break;
      case 'seo_content':
        selectFields = `
          id, title, description, seo_content, meta_title, meta_description, 
          content_type, identifier, location_context, property_type_context,
          operation_context, views, status, created_at, updated_at
        `;
        orderBy = 'created_at';
        break;
      default:
        return [];
    }
    // Agregar campo de traducción si no es español
    if (language !== 'es') {
      selectFields += `, content_${language}`;
    }
    console.log(`📄 Consultando ${tableName} con IDs:`, contentIds);
    const { data: content, error } = await supabase.from(tableName).select(selectFields).in('id', contentIds).eq('status', 'published').order(orderBy, {
      ascending: false
    });
    if (error) {
      console.error(`❌ Error consultando ${tableName}:`, error);
      return [];
    }
    // Preservar orden de relaciones (por weight) y agregar metadata
    const orderedContent = contentIds.map((id)=>{
      const item = content?.find((c)=>c.id === id);
      const relation = contentItems.find((ci)=>ci.id === id);
      if (item && relation) {
        return {
          ...item,
          _relation_weight: relation.weight,
          _relation_type: relation.relation_type,
          _content_priority: 'property_specific'
        };
      }
      return null;
    }).filter(Boolean);
    console.log(`✅ ${tableName} obtenidos:`, orderedContent.length);
    return orderedContent;
  } catch (error) {
    console.error(`❌ Error crítico en getContentDetails para ${tableName}:`, error);
    return [];
  }
}
// ========================================
// 🧪 TEST: Propiedad Individual
// ========================================
async function testPropiedadIndividual(supabase, context) {
  console.log('🏡 Buscando propiedad individual para idioma:', context.language);
  if (!context.cleanUrl) {
    return createJsonResponse({
      test: 'propiedad-individual',
      success: false,
      message: 'Proporciona URL de propiedad. Usa: ?url=slug-de-propiedad',
      data: {
        property: null
      }
    });
  }
  try {
    const slugField = context.language === 'es' ? 'slug_url' : `slug_${context.language}`;
    const contentField = context.language === 'es' ? '' : `content_${context.language}`;
    // Construir select dinámico
    let selectFields = `
      id, name, description, slug_url, slug_en, slug_fr,
      sale_price, sale_currency, rental_price, rental_currency,
      bedrooms, bathrooms, built_area, main_image_url, agent_id,
      property_categories(name), cities(name), sectors(name)
    `;
    if (contentField) {
      selectFields += `, ${contentField}`;
    }
    const { data: property, error } = await supabase.from('properties').select(selectFields).eq(slugField, context.cleanUrl).single();
    let processedProperty = null;
    if (property) {
      processedProperty = {
        ...property,
        language: context.language,
        _translated: false,
        current_slug: property[slugField] || property.slug_url
      };
      // Aplicar traducciones si no es español
      if (context.language !== 'es' && property[contentField]) {
        try {
          const translations = typeof property[contentField] === 'string' ? JSON.parse(property[contentField]) : property[contentField];
          if (translations) {
            processedProperty._original_name = property.name;
            processedProperty._original_description = property.description;
            processedProperty.name = translations.name || property.name;
            processedProperty.description = translations.description || property.description;
            processedProperty._translated = true;
          }
        } catch (e) {
          console.warn('⚠️ Error parsing translations for property:', property.id);
          processedProperty._translation_error = e.message;
        }
      }
      // Limpiar campos internos
      if (contentField) {
        delete processedProperty[contentField];
      }
    }
    return createJsonResponse({
      test: 'propiedad-individual',
      success: !error,
      data: {
        language: context.language,
        translationApplied: context.language !== 'es',
        searchUrl: context.cleanUrl,
        property: processedProperty
      },
      debug: {
        slugField: slugField,
        contentField: contentField || 'none (spanish)',
        query: `${slugField} = ${context.cleanUrl}`,
        error: error?.message
      }
    });
  } catch (error) {
    return createJsonResponse({
      test: 'propiedad-individual',
      success: false,
      error: error.message,
      data: {
        property: null
      }
    });
  }
}
// ========================================
// 🧪 TEST: Agente
// ========================================
async function testAgente(supabase, context) {
  console.log('👤 Obteniendo datos del agente...');
  const agentId = context.agentId || context.propertyId; // Usar agentId del parámetro o buscar por propiedad
  if (!agentId) {
    return createJsonResponse({
      test: 'agente',
      success: false,
      message: 'Proporciona agentId. Usa: ?agentId=123 o ?propertyId=456',
      data: {
        agent: null,
        properties: []
      }
    });
  }
  try {
    // Obtener agente
    const { data: agent, error: agentError } = await supabase.from('users').select(`
        id, first_name, last_name, email, phone, position,
        profile_photo_url, years_experience, specialty_description
      `).eq('id', agentId).single();
    // Obtener propiedades del agente
    const { data: properties, error: propError } = await supabase.from('properties').select(`
        id, name, sale_price, rental_price, sale_currency, rental_currency,
        bedrooms, bathrooms, main_image_url, slug_url,
        property_categories(name), sectors(name), cities(name)
      `).eq('agent_id', agentId).eq('availability', 1).eq('property_status', 'Publicada').limit(20);
    return createJsonResponse({
      test: 'agente',
      success: !agentError,
      data: {
        agent: agent ? {
          ...agent,
          name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim()
        } : null,
        propertiesCount: properties?.length || 0,
        properties: properties || []
      },
      debug: {
        agentId,
        agentError: agentError?.message,
        propError: propError?.message
      }
    });
  } catch (error) {
    return createJsonResponse({
      test: 'agente',
      success: false,
      error: error.message,
      data: {
        agent: null,
        properties: []
      }
    });
  }
}
// ========================================
// 🧪 TEST: Propiedades Similares CON SCORING INTELIGENTE (MÉTODO ORIGINAL MEJORADO)
// ========================================
async function testSimilarProperties(supabase, context) {
  console.log('🔄 Buscando propiedades similares...');
  // 🏡 BUSCAR PROPIEDAD POR URL COMPLETA
  const property = await findPropertyByUrl(supabase, context.cleanUrl, context.language);
  if (!property) {
    return createJsonResponse({
      test: 'similar-properties',
      success: false,
      message: `No se encontró propiedad con URL: ${context.cleanUrl}`,
      data: {
        similarProperties: []
      }
    });
  }
  // 🌍 OBTENER TAG DE PAÍS OBLIGATORIO
  const countryTag = await getCountryTagObligatorio(supabase);
  if (!countryTag) {
    return createJsonResponse({
      test: 'similar-properties',
      success: false,
      message: 'Tag de país obligatorio no encontrado',
      data: {
        similarProperties: []
      }
    });
  }
  try {
    // 🏷️ OBTENER TAGS DE LA PROPIEDAD (MÉTODO ORIGINAL QUE FUNCIONABA)
    const propertyTags = await getPropertyTags(supabase, property.id);
    if (!propertyTags || propertyTags.length === 0) {
      return createJsonResponse({
        test: 'similar-properties',
        success: true,
        message: 'La propiedad no tiene tags para comparar',
        data: {
          similarProperties: [],
          sourceProperty: {
            id: property.id,
            name: property.name
          }
        }
      });
    }
    console.log('🏷️ Tags de la propiedad encontrados:', {
      total: propertyTags.length,
      categories: propertyTags.reduce((acc, tag)=>{
        acc[tag.category] = (acc[tag.category] || 0) + 1;
        return acc;
      }, {})
    });
    // 🎯 SISTEMA DE PESOS POR CATEGORÍA
    const categoryWeights = {
      'pais': 100,
      'operacion': 50,
      'categoria': 40,
      'ciudad': 30,
      'sector': 25,
      'precio': 20,
      'caracteristica': 10 // Amenidades
    };
    const tagIds = propertyTags.map((t)=>t.id);
    const totalPossibleScore = propertyTags.reduce((sum, tag)=>{
      return sum + (categoryWeights[tag.category] || 5);
    }, 0);
    // 🔍 BUSCAR PROPIEDADES SIMILARES DEL MISMO PAÍS
    const { data: similarContentTags, error: similarError } = await supabase.from('content_tags').select('content_id, tag_id, weight').eq('content_type', 'property').in('tag_id', tagIds).neq('content_id', property.id);
    if (similarError) {
      console.error('❌ Error buscando content_tags similares:', similarError);
      return createJsonResponse({
        test: 'similar-properties',
        success: false,
        error: `Error buscando propiedades similares: ${similarError.message}`,
        data: {
          similarProperties: []
        }
      });
    }
    if (!similarContentTags || similarContentTags.length === 0) {
      return createJsonResponse({
        test: 'similar-properties',
        success: true,
        message: 'No se encontraron propiedades con tags similares',
        data: {
          similarProperties: [],
          sourceProperty: {
            id: property.id,
            name: property.name
          }
        }
      });
    }
    // 🧮 CALCULAR SCORES CON PESOS INTELIGENTES
    const propertyScores = {};
    const tagCategoryMap = {};
    // Crear mapa de tag -> categoría
    propertyTags.forEach((tag)=>{
      tagCategoryMap[tag.id] = tag.category;
    });
    similarContentTags.forEach((ct)=>{
      const propId = ct.content_id;
      const tagCategory = tagCategoryMap[ct.tag_id];
      const categoryWeight = categoryWeights[tagCategory] || 5;
      if (!propertyScores[propId]) {
        propertyScores[propId] = {
          totalScore: 0,
          tagCount: 0,
          matchedTags: [],
          hasCountryTag: false,
          categoryMatches: {}
        };
      }
      propertyScores[propId].totalScore += categoryWeight;
      propertyScores[propId].tagCount += 1;
      propertyScores[propId].matchedTags.push(ct.tag_id);
      // Marcar categorías coincidentes
      if (tagCategory) {
        propertyScores[propId].categoryMatches[tagCategory] = (propertyScores[propId].categoryMatches[tagCategory] || 0) + 1;
      }
      // Verificar país obligatorio
      if (ct.tag_id === countryTag.id) {
        propertyScores[propId].hasCountryTag = true;
      }
    });
    // 🌍 FILTRO OBLIGATORIO: Solo del mismo país
    const propertiesWithCountry = Object.entries(propertyScores).filter(([propertyId, score])=>score.hasCountryTag).map(([propertyId, score])=>({
        propertyId,
        ...score,
        similarityPercentage: Math.round(score.totalScore / totalPossibleScore * 100)
      })).filter((prop)=>prop.similarityPercentage >= 15) // Mínimo 15% similitud
    .sort((a, b)=>b.totalScore - a.totalScore) // Por score total
    .slice(0, 8); // Top 8
    console.log('🏆 Propiedades similares calculadas:', {
      totalCandidates: Object.keys(propertyScores).length,
      withCountryTag: propertiesWithCountry.length,
      topScores: propertiesWithCountry.slice(0, 3).map((p)=>({
          id: p.propertyId,
          score: p.totalScore,
          similarity: p.similarityPercentage + '%'
        }))
    });
    if (propertiesWithCountry.length === 0) {
      return createJsonResponse({
        test: 'similar-properties',
        success: true,
        message: 'No hay propiedades similares del país con suficiente similitud (mínimo 15%)',
        data: {
          similarProperties: [],
          sourceProperty: {
            id: property.id,
            name: property.name
          },
          searchCriteria: {
            minimumSimilarity: '15%',
            categoryWeights
          }
        }
      });
    }
    // 🏠 OBTENER DETALLES DE PROPIEDADES SIMILARES
    const similarPropertyIds = propertiesWithCountry.map((p)=>p.propertyId);
    const { data: similarProperties, error: propError } = await supabase.from('properties').select(`
        id, name, sale_price, rental_price, sale_currency, rental_currency,
        bedrooms, bathrooms, built_area, main_image_url, slug_url, slug_en, slug_fr,
        property_categories(name), sectors(name), cities(name)
      `).in('id', similarPropertyIds).eq('availability', 1).eq('property_status', 'Publicada');
    // 🔄 COMBINAR DATOS CON SCORES
    const enrichedSimilarProperties = similarPropertyIds.map((id)=>{
      const propertyData = similarProperties?.find((p)=>p.id === id);
      const scoreData = propertiesWithCountry.find((p)=>p.propertyId === id);
      if (propertyData && scoreData) {
        return {
          ...propertyData,
          similarity: {
            score: scoreData.totalScore,
            percentage: scoreData.similarityPercentage,
            matchedTags: scoreData.tagCount,
            categoryMatches: scoreData.categoryMatches
          }
        };
      }
      return null;
    }).filter(Boolean);
    return createJsonResponse({
      test: 'similar-properties',
      success: true,
      data: {
        sourceProperty: {
          id: property.id,
          name: property.name,
          url: context.cleanUrl,
          totalTags: propertyTags.length,
          totalScore: totalPossibleScore
        },
        searchCriteria: {
          countryMandatory: true,
          minimumSimilarity: '15%',
          categoryWeights,
          maxResults: 8
        },
        similarPropertiesFound: enrichedSimilarProperties.length,
        similarProperties: enrichedSimilarProperties
      },
      debug: {
        note: '🎯 SCORING INTELIGENTE con método original mejorado',
        propertyTagsCount: propertyTags.length,
        totalCandidates: Object.keys(propertyScores).length,
        qualifiedResults: propertiesWithCountry.length,
        countryMandatory: true
      }
    });
  } catch (error) {
    console.error('❌ Error en similar properties:', error);
    return createJsonResponse({
      test: 'similar-properties',
      success: false,
      error: error.message,
      data: {
        similarProperties: []
      }
    });
  }
}
// ========================================
// 🛠️ HELPERS
// ========================================
function createJsonResponse(data, additionalHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
      ...additionalHeaders
    }
  });
}
function createErrorResponse(error) {
  return new Response(JSON.stringify({
    success: false,
    error: error.message || 'Internal server error',
    timestamp: new Date().toISOString()
  }, null, 2), {
    status: 500,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json'
    }
  });
}
