// enhanced-single-property-handler.ts - VERSIÓN COMPLETA INTEGRADA
// Sistema de lugares cercanos personalizado - Cache
import { calculatePropertyAggregations, generateTwitterCardMeta, generateSEOKeywords } from './seo-utils.ts';
import { getUIText } from './ui-texts.ts';
const nearbyPlacesCache = new Map();
// Función para calcular distancia entre dos coordenadas (Haversine)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Retornar en metros
}
// Función para parsear coordenadas POINT de PostgreSQL
function parsePostgresPoint(pointString) {
  if (!pointString || typeof pointString !== 'string') {
    return null;
  }
  const cleanPoint = pointString.replace(/[()]/g, '').trim();
  const coords = cleanPoint.split(',');
  if (coords.length !== 2) {
    return null;
  }
  const lat = parseFloat(coords[0].trim());
  const lng = parseFloat(coords[1].trim());
  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }
  return {
    lat,
    lng
  };
}
// Función para procesar imágenes de propiedades
function processPropertyImages(property) {
  const upgradeToLargeVersion = (url)=>{
    if (!url || typeof url !== 'string') return url;
    if (url.includes('pacewqgypevfgjmdsorz.supabase.co/storage/v1/object/public/images/') && url.includes('_small.')) {
      return url.replace('_small.', '_large.');
    }
    return url;
  };
  let galleryImages = [];
  if (property.gallery_images_url) {
    if (typeof property.gallery_images_url === 'string') {
      galleryImages = property.gallery_images_url.split(',').map((url)=>url.trim()).filter((url)=>url.length > 0).map((url)=>upgradeToLargeVersion(url));
    }
  }
  const originalMainImage = property.main_image_url?.trim() || 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Sin+Imagen';
  const mainImage = upgradeToLargeVersion(originalMainImage);
  const finalImages = [
    mainImage,
    ...galleryImages.filter((img)=>img !== mainImage)
  ];
  return {
    main_image: mainImage,
    main_image_original: originalMainImage,
    gallery_images: galleryImages,
    final_images: finalImages,
    total_images: finalImages.length
  };
}
// Función centralizada para precios y operaciones
function calculatePriceAndOperation(property, language = 'es') {
  const operationTranslations = {
    es: {
      'Venta': 'Venta',
      'Venta Amueblada': 'Venta Amueblada',
      'Alquiler': 'Alquiler',
      'Alquiler Amueblado': 'Alquiler Amueblado',
      'Temporal': 'Temporal',
      'Consultar': 'Consultar'
    },
    en: {
      'Venta': 'Sale',
      'Venta Amueblada': 'Furnished Sale',
      'Alquiler': 'Rental',
      'Alquiler Amueblado': 'Furnished Rental',
      'Temporal': 'Short-term',
      'Consultar': 'Inquire'
    },
    fr: {
      'Venta': 'Vente',
      'Venta Amueblada': 'Vente Meublée',
      'Alquiler': 'Location',
      'Alquiler Amueblado': 'Location Meublée',
      'Temporal': 'Temporaire',
      'Consultar': 'Consulter'
    }
  };
  const consultPriceTranslations = {
    es: 'Consultar precio',
    en: 'Price on request',
    fr: 'Prix sur demande'
  };
  function isValidPrice(price) {
    return price !== null && price !== undefined && price !== 0 && price !== '';
  }
  function formatPrice(price, currency) {
    if (!price || isNaN(price) || price <= 0) {
      return consultPriceTranslations[language] || consultPriceTranslations.es;
    }
    const symbol = currency === 'USD' ? 'US$' : 'RD$';
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numericPrice) || numericPrice <= 0) {
      return consultPriceTranslations[language] || consultPriceTranslations.es;
    }
    return `${symbol}${numericPrice.toLocaleString()}`;
  }
  // Prioridad: venta -> venta amueblada -> alquiler -> alquiler amueblado -> temporal
  if (isValidPrice(property.sale_price)) {
    return {
      price_display: formatPrice(property.sale_price, property.sale_currency),
      operation_key: 'Venta',
      operation_display: operationTranslations[language]['Venta'],
      price_raw: property.sale_price,
      currency: property.sale_currency,
      operation_type: 'sale'
    };
  } else if (isValidPrice(property.furnished_sale_price)) {
    return {
      price_display: formatPrice(property.furnished_sale_price, property.furnished_sale_currency),
      operation_key: 'Venta Amueblada',
      operation_display: operationTranslations[language]['Venta Amueblada'],
      price_raw: property.furnished_sale_price,
      currency: property.furnished_sale_currency,
      operation_type: 'furnished_sale'
    };
  } else if (isValidPrice(property.rental_price)) {
    return {
      price_display: formatPrice(property.rental_price, property.rental_currency),
      operation_key: 'Alquiler',
      operation_display: operationTranslations[language]['Alquiler'],
      price_raw: property.rental_price,
      currency: property.rental_currency,
      operation_type: 'rental'
    };
  } else if (isValidPrice(property.furnished_rental_price)) {
    return {
      price_display: formatPrice(property.furnished_rental_price, property.furnished_rental_currency),
      operation_key: 'Alquiler Amueblado',
      operation_display: operationTranslations[language]['Alquiler Amueblado'],
      price_raw: property.furnished_rental_price,
      currency: property.furnished_rental_currency,
      operation_type: 'furnished_rental'
    };
  } else if (isValidPrice(property.temp_rental_price)) {
    return {
      price_display: formatPrice(property.temp_rental_price, property.temp_rental_currency),
      operation_key: 'Temporal',
      operation_display: operationTranslations[language]['Temporal'],
      price_raw: property.temp_rental_price,
      currency: property.temp_rental_currency,
      operation_type: 'temp_rental'
    };
  } else {
    return {
      price_display: consultPriceTranslations[language] || consultPriceTranslations.es,
      operation_key: 'Consultar',
      operation_display: operationTranslations[language]['Consultar'],
      price_raw: 0,
      currency: 'USD',
      operation_type: 'consult'
    };
  }
}
// Función para procesamiento multilenguaje completo
function processCompleteMultilingualContent(item, language, contentField = 'content') {
  let processed = {};
  // Procesar contenido multilenguaje
  if (language === 'en' && item[`${contentField}_en`]) {
    try {
      const contentEn = typeof item[`${contentField}_en`] === 'string' ? JSON.parse(item[`${contentField}_en`]) : item[`${contentField}_en`];
      processed = {
        ...contentEn
      };
    } catch (e) {
      console.warn('Failed to parse EN content:', e);
    }
  } else if (language === 'fr' && item[`${contentField}_fr`]) {
    try {
      const contentFr = typeof item[`${contentField}_fr`] === 'string' ? JSON.parse(item[`${contentField}_fr`]) : item[`${contentField}_fr`];
      processed = {
        ...contentFr
      };
    } catch (e) {
      console.warn('Failed to parse FR content:', e);
    }
  }
  // Retornar datos display listos para usar
  return {
    title_display: processed.title || processed.name || item.title || item.name || '',
    description_display: processed.description || item.description || '',
    excerpt_display: processed.excerpt || item.excerpt || '',
    name_display: processed.name || item.name || '',
    question_display: processed.question || item.question || '',
    answer_display: processed.answer || item.answer || '',
    full_testimonial_display: processed.full_testimonial || item.full_testimonial || '',
    position: processed.position || item.position || '',
    languages: processed.languages || item.languages || '',
    specialty_description: processed.specialty_description || item.specialty_description || '',
    bio: processed.bio || item.bio || '',
    slug: processed.slug || item.slug || ''
  };
}
// Función para procesar categorías
function processCategory(category, language) {
  if (!category) return {
    name_display: 'Propiedad'
  };
  const nameMap = {
    es: category.name,
    en: category.name_en,
    fr: category.name_fr
  };
  return {
    ...category,
    name_display: nameMap[language] || category.name || 'Propiedad'
  };
}
// Función simple para agente por defecto
async function getDefaultAgent(supabase, countryCode) {
  console.log('🌍 Getting default agent for country:', countryCode);
  const { data, error } = await supabase.from('default_agents').select(`
      agent_id,
      users!default_agents_agent_id_fkey(
        id, slug, email, phone, position, languages, last_name, content_en, content_fr, 
        first_name, sales_count, twitter_url, youtube_url, facebook_url, linkedin_url, 
        instagram_url, specialty_cities, years_experience, profile_photo_url, 
        specialty_city_id, specialty_sectors, specialty_sector_id, specialty_description, 
        profile_photo_metadata, specialty_property_categories, specialty_property_category_id,
        active, show_on_website, country_code
      )
    `).eq('country_code', countryCode).eq('users.active', true).single();
  if (error) {
    console.log('❌ Error getting default agent:', error);
    return null;
  }
  return data?.users || null;
}
// Función para determinar agente principal con lógica corregida
async function determineMainAgent(supabase, property, referralCode, language, trackingString) {
  console.log('🔍 Determining main agent...');
  console.log('Original agent ID:', property.agent_id);
  console.log('Referral code:', referralCode);
  let finalAgent = null;
  let agentSource = 'original';
  let shouldFetchAgentProperties = true;
  // 1. PRIORIDAD ABSOLUTA: Agente referido
  if (referralCode) {
    console.log('📧 Checking referral agent...');
    console.log('🔍 Full tracking string:', trackingString);
    console.log('🔍 Extracted referral code:', referralCode);
    console.log('🔍 Referral code length:', referralCode?.length);
    console.log('🔍 Referral code type:', typeof referralCode);
    const { data: referralAgent, error } = await supabase.from('users').select(`
        id, slug, email, phone, position, languages, last_name, content_en, content_fr, 
        first_name, sales_count, twitter_url, youtube_url, facebook_url, linkedin_url, 
        instagram_url, specialty_cities, years_experience, profile_photo_url, 
        specialty_city_id, specialty_sectors, specialty_sector_id, specialty_description, 
        profile_photo_metadata, specialty_property_categories, specialty_property_category_id,
        active, show_on_website, country_code, external_id
      `).eq('external_id', referralCode).eq('active', true).single();
    console.log('🔍 Searching for external_id:', referralCode);
    console.log('🔍 Supabase error:', error);
    console.log('🔍 Supabase response data:', referralAgent);
    if (!error && referralAgent) {
      console.log('✅ REFERRAL AGENT FOUND - Using only referral agent:', referralAgent.id);
      console.log('🔍 Agent external_id:', referralAgent.external_id);
      console.log('🔍 Agent active:', referralAgent.active);
      console.log('🔍 Agent show_on_website:', referralAgent.show_on_website);
      console.log('🔍 Agent name:', `${referralAgent.first_name} ${referralAgent.last_name}`);
      return {
        agent: referralAgent,
        source: 'referral',
        should_fetch_properties: referralAgent.show_on_website,
        referral_code: referralCode
      };
    } else {
      console.log('❌ Referral agent not found or inactive');
      if (error) {
        console.log('❌ Supabase error details:', error.message, error.code);
      }
      if (!referralAgent) {
        console.log('❌ No agent found with external_id:', referralCode);
      }
    }
  }
  // 2. Agente original (captador principal)
  if (property.users) {
    console.log('👤 Checking original agent...');
    const originalAgent = property.users;
    if (originalAgent.active && originalAgent.show_on_website) {
      console.log('✅ Original agent is valid');
      finalAgent = originalAgent;
      agentSource = 'original';
      shouldFetchAgentProperties = true;
    } else {
      console.log('❌ Original agent is inactive or not visible on website');
    }
  }
  // 3. Primer cocaptor activo
  if (!finalAgent) {
    console.log('👥 Checking for active cocaptors...');
    const { data: firstCocaptor, error: cocaptorError } = await supabase.from('property_cocaptors').select(`
        role,
        order_priority,
        users!property_cocaptors_user_id_fkey(
          id, slug, email, phone, position, languages, last_name, content_en, content_fr, 
          first_name, sales_count, twitter_url, youtube_url, facebook_url, linkedin_url, 
          instagram_url, specialty_cities, years_experience, profile_photo_url, 
          specialty_city_id, specialty_sectors, specialty_sector_id, specialty_description, 
          profile_photo_metadata, specialty_property_categories, specialty_property_category_id,
          active, show_on_website, country_code
        )
      `).eq('property_id', property.id).eq('users.active', true).eq('users.show_on_website', true).order('order_priority', {
      ascending: true
    }).limit(1).single();
    if (!cocaptorError && firstCocaptor?.users) {
      console.log('✅ Using first active cocaptor as main agent:', firstCocaptor.users.id);
      finalAgent = firstCocaptor.users;
      agentSource = 'cocaptor';
      shouldFetchAgentProperties = true;
    } else {
      console.log('❌ No active and visible cocaptors found');
    }
  }
  // 4. Agente por defecto
  if (!finalAgent) {
    console.log('🌍 No valid agents found, fetching default agent...');
    let countryCode = property.users?.country_code || property.country_code || 'DOM';
    finalAgent = await getDefaultAgent(supabase, countryCode);
    if (finalAgent) {
      console.log('✅ Using default agent for country:', countryCode);
      agentSource = 'default';
      shouldFetchAgentProperties = true;
    } else {
      console.log('❌ CRITICAL: No default agent found');
      throw new Error(`No default agent configured for country: ${countryCode}`);
    }
  }
  return {
    agent: finalAgent,
    source: agentSource,
    should_fetch_properties: shouldFetchAgentProperties,
    referral_code: referralCode
  };
}
// Función para traer cocaptadores
async function getPropertyCocaptors(supabase, propertyId, language, domainInfo, mainAgentId = null, agentSource = 'original') {
  console.log('👥 Fetching property cocaptors for property:', propertyId);
  console.log('👥 Agent source:', agentSource);
  // Si es un agente referido, NO mostrar cocaptadores
  if (agentSource === 'referral') {
    console.log('📧 Referral agent - not showing cocaptors');
    return [];
  }
  let query = supabase.from('property_cocaptors').select(`
      role,
      order_priority,
      users!property_cocaptors_user_id_fkey(
        id, first_name, last_name, email, phone, position, 
        profile_photo_url, slug, active, show_on_website
      )
    `).eq('property_id', propertyId).eq('users.active', true).eq('users.show_on_website', true);
  // Excluir agente principal si es cocaptor
  if (mainAgentId) {
    query = query.neq('user_id', mainAgentId);
  }
  const { data, error } = await query.order('order_priority', {
    ascending: true
  }).limit(3);
  if (error) {
    console.log('❌ Error getting cocaptors:', error);
    return [];
  }
  if (!data || data.length === 0) {
    console.log('No additional cocaptors found');
    return [];
  }
  console.log(`✅ Found ${data.length} additional cocaptors`);
  // CORRECCIÓN DEL ERROR: Verificar que users no sea null antes de procesar
  const validCocaptors = data.filter((item)=>item.users !== null && item.users !== undefined);
  if (validCocaptors.length === 0) {
    console.log('No valid cocaptors found (all users were null)');
    return [];
  }
  // Procesar cocaptadores
  return validCocaptors.map((item)=>{
    const cocaptor = item.users;
    const agentContent = processCompleteMultilingualContent(cocaptor, language);
    let agentUrl = null;
    let agentFullUrl = null;
    if (cocaptor.slug) {
      const agentSlug = agentContent.slug || cocaptor.slug;
      const agentPath = language === 'en' ? `en/advisors/${agentSlug}` : language === 'fr' ? `fr/conseillers/${agentSlug}` : `asesores/${agentSlug}`;
      agentUrl = `/${agentPath}`;
      agentFullUrl = `${domainInfo.realDomain}${agentUrl}`;
    }
    return {
      id: cocaptor.id,
      first_name: cocaptor.first_name || '',
      last_name: cocaptor.last_name || '',
      email: cocaptor.email || '',
      phone: cocaptor.phone || '',
      position: cocaptor.position || '',
      profile_photo_url: cocaptor.profile_photo_url,
      slug: cocaptor.slug,
      role: item.role,
      order_priority: item.order_priority,
      full_name: `${cocaptor.first_name || ''} ${cocaptor.last_name || ''}`.trim(),
      position_display: agentContent.position || cocaptor.position || '',
      url: agentUrl,
      full_url: agentFullUrl
    };
  });
}
// Función para obtener lugares cercanos (mantener original)
async function getNearbyPlaces(supabaseClient, property, maxDistance = 2000) {
  if (!property) return null;
  let propertyCoords = null;
  if (property.exact_coordinates) {
    propertyCoords = parsePostgresPoint(property.exact_coordinates);
  }
  const locationName = property.sectors?.name || property.cities?.name;
  const cacheKey = propertyCoords ? `coords_${propertyCoords.lat}_${propertyCoords.lng}` : `location_${locationName}`;
  if (nearbyPlacesCache.has(cacheKey)) {
    return nearbyPlacesCache.get(cacheKey);
  }
  try {
    let lugares = [];
    if (propertyCoords && propertyCoords.lat && propertyCoords.lng) {
      const { data: allLugares, error } = await supabaseClient.from('lugares_cercanos').select('nombre, categoria, subcategoria, icono, direccion, es_destacado, lat, lng, rating').eq('activo', true);
      if (error) throw error;
      lugares = allLugares.map((lugar)=>{
        const lugarLat = parseFloat(lugar.lat);
        const lugarLng = parseFloat(lugar.lng);
        if (isNaN(lugarLat) || isNaN(lugarLng)) {
          return {
            ...lugar,
            distancia_calculada: Infinity
          };
        }
        const distancia = calculateDistance(propertyCoords.lat, propertyCoords.lng, lugarLat, lugarLng);
        return {
          ...lugar,
          distancia_calculada: distancia
        };
      }).filter((lugar)=>lugar.distancia_calculada <= maxDistance).sort((a, b)=>{
        if (a.es_destacado !== b.es_destacado) {
          return b.es_destacado - a.es_destacado;
        }
        if (a.distancia_calculada !== b.distancia_calculada) {
          return a.distancia_calculada - b.distancia_calculada;
        }
        return (b.rating || 0) - (a.rating || 0);
      });
    } else {
      const { data: lugaresSector, error } = await supabaseClient.from('lugares_cercanos').select('nombre, categoria, subcategoria, icono, direccion, es_destacado, distancia_metros, rating, ubicacion_referencia').ilike('ubicacion_referencia', `%${locationName}%`).eq('activo', true).order('es_destacado', {
        ascending: false
      }).order('distancia_metros', {
        ascending: true
      }).order('categoria', {
        ascending: true
      });
      if (error) throw error;
      lugares = lugaresSector || [];
    }
    if (!lugares || lugares.length === 0) {
      return null;
    }
    const lugaresOrganizados = {};
    const destacados = [];
    const conteosPorCategoria = {};
    lugares.forEach((lugar)=>{
      if (!conteosPorCategoria[lugar.categoria]) {
        conteosPorCategoria[lugar.categoria] = 0;
      }
      conteosPorCategoria[lugar.categoria]++;
      let distanciaFinal = 0;
      let distanciaDisplay = 'N/A';
      if (lugar.distancia_calculada !== undefined && lugar.distancia_calculada !== null && !isNaN(lugar.distancia_calculada) && lugar.distancia_calculada !== Infinity) {
        distanciaFinal = Math.round(lugar.distancia_calculada);
        distanciaDisplay = `${distanciaFinal}m`;
      } else if (lugar.distancia_metros !== null && lugar.distancia_metros !== undefined && !isNaN(lugar.distancia_metros)) {
        distanciaFinal = lugar.distancia_metros;
        distanciaDisplay = `${distanciaFinal}m`;
      }
      const lugarSimplificado = {
        nombre: lugar.nombre,
        categoria: lugar.categoria,
        subcategoria: lugar.subcategoria,
        icono: lugar.icono,
        direccion: lugar.direccion,
        es_destacado: lugar.es_destacado,
        distancia_metros: distanciaFinal,
        distancia_display: distanciaDisplay
      };
      if (!lugaresOrganizados[lugar.categoria]) {
        lugaresOrganizados[lugar.categoria] = [];
      }
      if (lugaresOrganizados[lugar.categoria].length < 5) {
        lugaresOrganizados[lugar.categoria].push(lugarSimplificado);
      }
      if (lugar.es_destacado && destacados.length < 8) {
        destacados.push(lugarSimplificado);
      }
    });
    const resultado = {
      ubicacion: locationName,
      lugares_destacados: destacados,
      conteos_por_categoria: conteosPorCategoria,
      lugares_por_categoria: lugaresOrganizados,
      estadisticas: {
        total_lugares: lugares.length,
        conteos_por_categoria: conteosPorCategoria,
        destacados_count: destacados.length,
        busqueda_tipo: propertyCoords ? 'coordenadas_exactas' : 'zona_sector',
        radio_busqueda: propertyCoords ? `${maxDistance}m` : 'sector_completo'
      },
      fuente: 'base_datos_propia'
    };
    nearbyPlacesCache.set(cacheKey, resultado);
    setTimeout(()=>nearbyPlacesCache.delete(cacheKey), 60 * 60 * 1000);
    return resultado;
  } catch (error) {
    console.error('Error obteniendo lugares cercanos:', error);
    return null;
  }
}
function getTagDisplayName(tag, language) {
  if (!tag) return null;
  if (language === 'en' && tag.display_name_en) return tag.display_name_en;
  if (language === 'fr' && tag.display_name_fr) return tag.display_name_fr;
  return tag.display_name || tag.name;
}
function getCategoryName(category, language) {
  if (language === 'en' && category.name_en) return category.name_en;
  if (language === 'fr' && category.name_fr) return category.name_fr;
  return category.name;
}
// Helper functions para SEO
function buildPropertyBreadcrumbs(propertyData, userTagsDetails, language, trackingString, domainInfo) {
  const breadcrumbs = [];
  const homeLabel = getUIText('HOME', language);
  const baseHomeUrl = language === 'es' ? '/' : `/${language}/`;
  const homeUrl = trackingString ? baseHomeUrl === '/' ? `/${trackingString.substring(1)}` : `${baseHomeUrl}${trackingString}` : baseHomeUrl;
  breadcrumbs.push({
    name: homeLabel,
    url: homeUrl
  });
  if (userTagsDetails && userTagsDetails.length > 0) {
    const coreCategories = [
      'operacion',
      'categoria',
      'ciudad',
      'sector'
    ];
    let cumulativeUrl = language === 'es' ? '' : `/${language}`;
    coreCategories.forEach((category)=>{
      const tag = userTagsDetails.find((t)=>t.category === category);
      if (tag) {
        const tagSlug = language === 'en' && tag.slug_en ? tag.slug_en : language === 'fr' && tag.slug_fr ? tag.slug_fr : tag.slug;
        const tagDisplayName = getTagDisplayName(tag, language);
        cumulativeUrl += `/${tagSlug}`;
        breadcrumbs.push({
          name: tagDisplayName,
          url: `${cumulativeUrl}${trackingString}`
        });
      }
    });
  }
  breadcrumbs.push({
    name: propertyData.name,
    url: null
  });
  return breadcrumbs;
}
function buildPropertyHreflangUrls(propertyData, language, domainInfo, trackingString) {
  const buildLanguageUrl = (targetLanguage)=>{
    let slug = propertyData.slug_url;
    if (targetLanguage === 'en' && propertyData.slug_en) slug = propertyData.slug_en;
    if (targetLanguage === 'fr' && propertyData.slug_fr) slug = propertyData.slug_fr;
    const path = targetLanguage === 'es' ? slug : `${targetLanguage}/${slug}`;
    return `${domainInfo.realDomain}/${path}${trackingString}`;
  };
  return {
    es: buildLanguageUrl('es'),
    en: buildLanguageUrl('en'),
    fr: buildLanguageUrl('fr')
  };
}
function generatePropertyStructuredData(propertyData, breadcrumbs, canonicalUrl, language, faqs, nearbyPlaces) {
  const structuredDataArray = [];
  const propertySchema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "name": propertyData.name,
    "description": propertyData.description,
    "url": canonicalUrl,
    "image": propertyData.main_image_url,
    "offers": {
      "@type": "Offer",
      "price": propertyData.sale_price || propertyData.rental_price,
      "priceCurrency": propertyData.sale_currency || propertyData.rental_currency || "USD",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "RealEstateAgent",
        "name": "CLIC Inmobiliaria"
      }
    },
    "address": {
      "@type": "PostalAddress",
      "addressLocality": propertyData.cities?.name,
      "addressRegion": propertyData.sectors?.name,
      "addressCountry": "DO"
    },
    "numberOfRooms": propertyData.bedrooms,
    "numberOfBathroomsTotal": propertyData.bathrooms,
    "floorSize": {
      "@type": "QuantitativeValue",
      "value": propertyData.built_area,
      "unitCode": "MTK"
    }
  };
  if (nearbyPlaces && nearbyPlaces.lugares_destacados?.length > 0) {
    propertySchema.nearbyPoints = nearbyPlaces.lugares_destacados.slice(0, 5).map((lugar)=>({
        "@type": "Place",
        "name": lugar.nombre,
        "description": lugar.categoria,
        "address": lugar.direccion,
        "aggregateRating": lugar.rating ? {
          "@type": "AggregateRating",
          "ratingValue": lugar.rating
        } : undefined
      }));
  }
  structuredDataArray.push(propertySchema);
  if (breadcrumbs && breadcrumbs.length > 0) {
    structuredDataArray.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, index)=>({
          "@type": "ListItem",
          "position": index + 1,
          "name": crumb.name,
          ...crumb.url && {
            "item": `https://clicinmobiliaria.com${crumb.url.split('?')[0]}`
          }
        }))
    });
  }
  structuredDataArray.push({
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "CLIC Inmobiliaria",
    "url": "https://clicinmobiliaria.com",
    "logo": "https://clicinmobiliaria.com/images/logo-clic-inmobiliaria.png"
  });
  if (faqs && faqs.length > 0) {
    structuredDataArray.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map((faq)=>({
          "@type": "Question",
          "name": faq.question_display || faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer_display || faq.answer
          }
        }))
    });
  }
  return structuredDataArray;
}
// MAIN HANDLER FUNCTION - VERSIÓN COMPLETA
export async function handleSingleProperty(params) {
  const { property, supabase, language, countryTag, validatedTags, trackingString, seoPages, userTagsDetails, hotItems, domainInfo, globalConfig } = params;
  console.log('=== ENHANCED SINGLE PROPERTY HANDLER - COMPLETE VERSION ===');
  console.log('Property ID:', property.id);
  console.log('Language:', language);
  console.log('Tracking String:', trackingString);
  const startTime = Date.now();
  try {
    const referralCode = extractReferralCode(trackingString);
    // PHASE 1: Core property data and basic relations
    const phase1Start = Date.now();
    const [propertyData, propertyTags, propertyRelations] = await Promise.all([
      supabase.from('properties').select(`
        *, property_categories(*), cities(*, provinces(*)), sectors(*),
        users!properties_agent_id_fkey(
          id, slug, email, phone, position, languages, last_name, content_en, content_fr, 
          first_name, sales_count, twitter_url, youtube_url, facebook_url, linkedin_url, 
          instagram_url, specialty_cities, years_experience, profile_photo_url, 
          specialty_city_id, specialty_sectors, specialty_sector_id, specialty_description, 
          profile_photo_metadata, specialty_property_categories, specialty_property_category_id,
          active, show_on_website, country_code
        ), property_images(*), 
        property_amenities(*, amenities(*))
      `).eq('id', property.id).single(),
      supabase.from('content_tags').select(`
        tag_id, weight, tags(*)
      `).eq('content_id', property.id).eq('content_type', 'property').order('weight', {
        ascending: false
      }),
      supabase.from('content_property_relations').select(`
        content_id, content_type, relation_type, weight
      `).eq('property_id', property.id).order('weight', {
        ascending: false
      })
    ]);
    console.log(`Phase 1 completed in ${Date.now() - phase1Start}ms`);
    if (propertyData.error) throw propertyData.error;
    const property_complete = propertyData.data;
    // Procesar imágenes
    const processedImages = processPropertyImages(property_complete);
    const tags = propertyTags.data || [];
    const relations = propertyRelations.data || [];
    // LÓGICA DE AGENTES CORREGIDA
    console.log('🎯 Starting corrected agent determination logic...');
    const agentResult = await determineMainAgent(supabase, property_complete, referralCode, language, trackingString);
    const finalAgent = agentResult.agent;
    const agentSource = agentResult.source;
    const shouldFetchAgentProperties = agentResult.should_fetch_properties;
    console.log('📊 Agent determination result:', {
      agent_id: finalAgent?.id,
      source: agentSource,
      should_fetch_properties: shouldFetchAgentProperties,
      referral_code: referralCode
    });
    // TRAER COCAPTADORES
    const cocaptors = await getPropertyCocaptors(supabase, property.id, language, domainInfo, finalAgent?.id, agentSource);
    console.log(`👥 Cocaptors found: ${cocaptors.length}`);
    const tagIds = tags.map((t)=>t.tag_id);
    const searchTags = countryTag?.id ? [
      countryTag.id,
      ...tagIds
    ] : tagIds;
    // PHASE 2: Extended data
    const phase2Start = Date.now();
    const [projectDetails, agentProperties, contentByTags, nearbyPlaces] = await Promise.all([
      // Project details
      property_complete.is_project && property_complete.project_detail_id ? supabase.from('project_details').select(`
            *, developers(*), project_typologies(*), project_amenities(*, amenities(*)),
            project_payment_plans(*), project_phases(*), 
            project_availability(*, project_typologies(*)),
            project_benefits(*, project_benefits_catalog(*)),
            project_documents(*, project_documents_catalog(*))
          `).eq('id', property_complete.project_detail_id).single() : Promise.resolve({
        data: null
      }),
      // Agent properties - solo si debe traerlas
      shouldFetchAgentProperties && finalAgent?.id ? supabase.from('properties').select(`
            id, name, slug_url, slug_en, slug_fr, 
            sale_price, rental_price, sale_currency, rental_currency,
            temp_rental_price, temp_rental_currency, 
            furnished_rental_price, furnished_rental_currency,
            furnished_sale_price, furnished_sale_currency,
            bedrooms, bathrooms, parking_spots, nivel, built_area, land_area, main_image_url, 
            content_en, content_fr, is_project,
            property_categories(name, name_en, name_fr), cities(name), sectors(name)
          `).eq('agent_id', finalAgent.id).neq('id', property.id).eq('availability', 1).eq('property_status', 'Publicada').order('created_at', {
        ascending: false
      }).limit(20) : Promise.resolve({
        data: []
      }),
      // Content by tags
      tagIds.length > 0 ? supabase.rpc('get_all_content_by_tags', {
        tag_ids: searchTags,
        limit_per_type: 15
      }) : Promise.resolve({
        data: []
      }),
      // Nearby places
      getNearbyPlaces(supabase, property_complete, 2000)
    ]);
    console.log(`Phase 2 completed in ${Date.now() - phase2Start}ms`);
    // PHASE 3: Process content with priority system (COMPLETO)
    const phase3Start = Date.now();
    const directlyRelated = {
      property: relations.filter((rel)=>rel.content_type === 'property' && rel.content_id !== property.id),
      article: relations.filter((rel)=>rel.content_type === 'article'),
      video: relations.filter((rel)=>rel.content_type === 'video'),
      testimonial: relations.filter((rel)=>rel.content_type === 'testimonial'),
      faq: relations.filter((rel)=>rel.content_type === 'faq'),
      seo_content: relations.filter((rel)=>rel.content_type === 'seo_content')
    };
    const rawContentByTags = contentByTags.data || [];
    const alreadyRelatedIds = relations.map((rel)=>rel.content_id);
    const tagContent = {
      property: rawContentByTags.filter((item)=>item.content_type === 'property' && item.content_id !== property.id && !alreadyRelatedIds.includes(item.content_id)),
      article: rawContentByTags.filter((item)=>item.content_type === 'article' && !alreadyRelatedIds.includes(item.content_id)),
      video: rawContentByTags.filter((item)=>item.content_type === 'video' && !alreadyRelatedIds.includes(item.content_id)),
      testimonial: rawContentByTags.filter((item)=>item.content_type === 'testimonial' && !alreadyRelatedIds.includes(item.content_id)),
      faq: rawContentByTags.filter((item)=>item.content_type === 'faq' && !alreadyRelatedIds.includes(item.content_id)),
      seo_content: rawContentByTags.filter((item)=>item.content_type === 'seo_content' && !alreadyRelatedIds.includes(item.content_id))
    };
    const contentIds = {
      property: [
        ...directlyRelated.property.map((rel)=>rel.content_id),
        ...tagContent.property.map((item)=>item.content_id)
      ].slice(0, 12),
      article: [
        ...directlyRelated.article.map((rel)=>rel.content_id),
        ...tagContent.article.map((item)=>item.content_id)
      ].slice(0, 15),
      video: [
        ...directlyRelated.video.map((rel)=>rel.content_id),
        ...tagContent.video.map((item)=>item.content_id)
      ].slice(0, 15),
      testimonial: [
        ...directlyRelated.testimonial.map((rel)=>rel.content_id),
        ...tagContent.testimonial.map((item)=>item.content_id)
      ].slice(0, 15),
      faq: [
        ...directlyRelated.faq.map((rel)=>rel.content_id),
        ...tagContent.faq.map((item)=>item.content_id)
      ].slice(0, 15),
      seo_content: [
        ...directlyRelated.seo_content.map((rel)=>rel.content_id),
        ...tagContent.seo_content.map((item)=>item.content_id)
      ].slice(0, 15)
    };
    const [similarProperties, articles, videos, testimonials, faqs, seoContent] = await Promise.all([
      contentIds.property.length > 0 ? supabase.from('properties').select(`
        id, name, slug_url, slug_en, slug_fr, sale_price, rental_price, sale_currency, rental_currency,
        temp_rental_price, temp_rental_currency, furnished_rental_price, furnished_rental_currency,
        furnished_sale_price, furnished_sale_currency,
        bedrooms, bathrooms, built_area, land_area, main_image_url, is_project, content_en, content_fr,
        property_categories(name, name_en, name_fr), cities(name), sectors(name)
      `).in('id', contentIds.property).eq('availability', 1).eq('property_status', 'Publicada') : Promise.resolve({
        data: []
      }),
      contentIds.article.length > 0 ? supabase.from('articles').select(`
        id, title, slug, slug_en, slug_fr, excerpt, featured_image, published_at, read_time,
        views, featured, category, author_id,
        content_en, content_fr,
        users!articles_author_id_fkey(first_name, last_name, profile_photo_url)
      `).in('id', contentIds.article).eq('status', 'published').order('featured', {
        ascending: false
      }).order('published_at', {
        ascending: false
      }) : Promise.resolve({
        data: []
      }),
      contentIds.video.length > 0 ? supabase.from('videos').select(`
        id, title, description, video_slug, slug_en, slug_fr, thumbnail, video_id, 
        video_platform, duration, views, featured, published_at,
        content_en, content_fr,
        content_categories!videos_category_id_fkey(display_name, display_name_en, display_name_fr)
      `).in('id', contentIds.video).eq('status', 'published').order('featured', {
        ascending: false
      }).order('views', {
        ascending: false
      }).order('published_at', {
        ascending: false
      }) : Promise.resolve({
        data: []
      }),
      contentIds.testimonial.length > 0 ? supabase.from('testimonials').select(`
        id, title, slug, slug_en, slug_fr, excerpt, full_testimonial, rating, client_name, 
        client_avatar, client_location, featured, published_at,
        content_en, content_fr
      `).in('id', contentIds.testimonial).eq('status', 'published').order('featured', {
        ascending: false
      }).order('rating', {
        ascending: false
      }).order('published_at', {
        ascending: false
      }) : Promise.resolve({
        data: []
      }),
      contentIds.faq.length > 0 ? supabase.from('faqs').select(`
        id, question, answer, sort_order, featured,
        content_en, content_fr
      `).in('id', contentIds.faq).eq('status', 'published').order('featured', {
        ascending: false
      }).order('sort_order', {
        ascending: true
      }).order('id', {
        ascending: true
      }) : Promise.resolve({
        data: []
      }),
      contentIds.seo_content.length > 0 ? supabase.from('seo_content').select('*').in('id', contentIds.seo_content).eq('status', 'published').order('featured', {
        ascending: false
      }).order('created_at', {
        ascending: false
      }) : Promise.resolve({
        data: []
      })
    ]);
    const restoreContentOrder = (dbResults, prioritizedIds)=>{
      if (!dbResults || dbResults.length === 0) return [];
      const resultMap = new Map(dbResults.map((item)=>[
          item.id,
          item
        ]));
      return prioritizedIds.map((id)=>resultMap.get(id)).filter(Boolean);
    };
    const orderedContent = {
      similarProperties: restoreContentOrder(similarProperties.data, contentIds.property),
      articles: restoreContentOrder(articles.data, contentIds.article),
      videos: restoreContentOrder(videos.data, contentIds.video),
      testimonials: restoreContentOrder(testimonials.data, contentIds.testimonial),
      faqs: restoreContentOrder(faqs.data, contentIds.faq),
      seoContent: restoreContentOrder(seoContent.data, contentIds.seo_content)
    };
    console.log(`Phase 3 completed in ${Date.now() - phase3Start}ms`);
    // PHASE 4: Processing (COMPLETO)
    const processingStart = Date.now();
    // Procesar propiedad principal
    const mainPropertyMultilingual = processCompleteMultilingualContent(property_complete, language);
    const mainPropertyPricing = calculatePriceAndOperation(property_complete, language);
    const mainPropertyCategory = processCategory(property_complete.property_categories, language);
    // Procesar agente final con traducciones
    const processedFinalAgent = finalAgent ? {
      ...finalAgent,
      ...processCompleteMultilingualContent(finalAgent, language),
      agent_source: agentSource,
      url: finalAgent.slug ? `/${language === 'en' ? 'en/advisors' : language === 'fr' ? 'fr/conseillers' : 'asesores'}/${finalAgent.slug}${trackingString}` : null
    } : null;
    // Procesar propiedades del agente
    const processedAgentProperties = shouldFetchAgentProperties ? (agentProperties.data || []).map((property)=>{
      const multilingual = processCompleteMultilingualContent(property, language);
      const pricing = calculatePriceAndOperation(property, language);
      const category = processCategory(property.property_categories, language);
      let propertySlug = property.slug_url;
      if (language === 'en' && property.slug_en) propertySlug = property.slug_en;
      if (language === 'fr' && property.slug_fr) propertySlug = property.slug_fr;
      let propertyPath = propertySlug;
      if (language === 'en') propertyPath = `en/${propertySlug}`;
      if (language === 'fr') propertyPath = `fr/${propertySlug}`;
      return {
        ...property,
        title_display: multilingual.title_display || property.name,
        price_display: pricing.price_display,
        operation_display: pricing.operation_display,
        category_display: category.name_display,
        location_display: property.sectors?.name || property.cities?.name || '',
        url: `/${propertyPath}${trackingString}`,
        full_url: `${domainInfo.realDomain}/${propertyPath}${trackingString}`,
        pricing_data: pricing,
        category_data: category
      };
    }) : [];
    // Procesar propiedades similares
    const processedSimilarProperties = orderedContent.similarProperties.map((property, index)=>{
      const multilingual = processCompleteMultilingualContent(property, language);
      const pricing = calculatePriceAndOperation(property, language);
      const category = processCategory(property.property_categories, language);
      const relationType = index < directlyRelated.property.length ? 'direct' : 'tags';
      let propertySlug = property.slug_url;
      if (language === 'en' && property.slug_en) propertySlug = property.slug_en;
      if (language === 'fr' && property.slug_fr) propertySlug = property.slug_fr;
      let propertyPath = propertySlug;
      if (language === 'en') propertyPath = `en/${propertySlug}`;
      if (language === 'fr') propertyPath = `fr/${propertySlug}`;
      return {
        ...property,
        title_display: multilingual.title_display || property.name,
        price_display: pricing.price_display,
        operation_display: pricing.operation_display,
        category_display: category.name_display,
        location_display: property.sectors?.name || property.cities?.name || '',
        url: `/${propertyPath}${trackingString}`,
        full_url: `${domainInfo.realDomain}/${propertyPath}${trackingString}`,
        relation_type: relationType,
        relation_source: relationType === 'direct' ? 'manually_curated' : 'algorithm_tags',
        pricing_data: pricing,
        category_data: category
      };
    });
    // Procesar artículos
    const processedArticles = orderedContent.articles.map((article, index)=>{
      const multilingual = processCompleteMultilingualContent(article, language);
      const relationType = index < directlyRelated.article.length ? 'direct' : 'tags';
      let articleSlug = article.slug;
      if (language === 'en' && article.slug_en) articleSlug = article.slug_en;
      if (language === 'fr' && article.slug_fr) articleSlug = article.slug_fr;
      let articlePath = articleSlug;
      if (language === 'en') articlePath = `en/${articleSlug}`;
      if (language === 'fr') articlePath = `fr/${articleSlug}`;
      return {
        ...article,
        title_display: multilingual.title_display || article.title,
        excerpt_display: multilingual.excerpt_display || article.excerpt,
        url: `/${articlePath}${trackingString}`,
        full_url: `${domainInfo.realDomain}/${articlePath}${trackingString}`,
        relation_type: relationType,
        relation_source: relationType === 'direct' ? 'manually_curated' : 'algorithm_tags'
      };
    });
    // Procesar videos
    const processedVideos = orderedContent.videos.map((video, index)=>{
      const multilingual = processCompleteMultilingualContent(video, language);
      const relationType = index < directlyRelated.video.length ? 'direct' : 'tags';
      let videoSlug = video.video_slug;
      if (language === 'en' && video.slug_en) videoSlug = video.slug_en;
      if (language === 'fr' && video.slug_fr) videoSlug = video.slug_fr;
      let videoPath = videoSlug;
      if (language === 'en') videoPath = `en/${videoSlug}`;
      if (language === 'fr') videoPath = `fr/${videoSlug}`;
      const category = video.content_categories;
      const categoryName = category ? language === 'en' && category.display_name_en ? category.display_name_en : language === 'fr' && category.display_name_fr ? category.display_name_fr : category.display_name : null;
      return {
        ...video,
        title_display: multilingual.title_display || video.title,
        description_display: multilingual.description_display || video.description,
        category_display: categoryName,
        url: `/${videoPath}${trackingString}`,
        full_url: `${domainInfo.realDomain}/${videoPath}${trackingString}`,
        relation_type: relationType,
        relation_source: relationType === 'direct' ? 'manually_curated' : 'algorithm_tags'
      };
    });
    // Procesar testimonios
    const processedTestimonials = orderedContent.testimonials.map((testimonial, index)=>{
      const multilingual = processCompleteMultilingualContent(testimonial, language);
      const relationType = index < directlyRelated.testimonial.length ? 'direct' : 'tags';
      let testimonialSlug = testimonial.slug;
      if (language === 'en' && testimonial.slug_en) testimonialSlug = testimonial.slug_en;
      if (language === 'fr' && testimonial.slug_fr) testimonialSlug = testimonial.slug_fr;
      let testimonialPath = testimonialSlug;
      if (language === 'en') testimonialPath = `en/${testimonialSlug}`;
      if (language === 'fr') testimonialPath = `fr/${testimonialSlug}`;
      return {
        ...testimonial,
        title_display: multilingual.title_display || testimonial.title,
        excerpt_display: multilingual.excerpt_display || testimonial.excerpt,
        full_testimonial_display: multilingual.full_testimonial_display || testimonial.full_testimonial,
        url: `/${testimonialPath}${trackingString}`,
        full_url: `${domainInfo.realDomain}/${testimonialPath}${trackingString}`,
        relation_type: relationType,
        relation_source: relationType === 'direct' ? 'manually_curated' : 'algorithm_tags'
      };
    });
    // Procesar FAQs
    const processedFaqs = orderedContent.faqs.map((faq, index)=>{
      const multilingual = processCompleteMultilingualContent(faq, language);
      const relationType = index < directlyRelated.faq.length ? 'direct' : 'tags';
      return {
        ...faq,
        question_display: multilingual.question_display || faq.question,
        answer_display: multilingual.answer_display || faq.answer,
        relation_type: relationType,
        relation_source: relationType === 'direct' ? 'manually_curated' : 'algorithm_tags'
      };
    });
    console.log(`Processing completed in ${Date.now() - processingStart}ms`);
    // PHASE 5: Build SEO Data (COMPLETO)
    const seoStart = Date.now();
    const propertyContent = processCompleteMultilingualContent(property_complete, language);
    const propertyTitle = propertyContent.title_display || property_complete.name;
    const propertyDescription = propertyContent.description_display || property_complete.description;
    const bedroomsLabel = getUIText('BEDROOMS', language);
    const bathroomsLabel = getUIText('BATHROOMS', language);
    const locationLabel = getUIText('IN_LOCATION', language);
    const companyName = 'CLIC Inmobiliaria';
    const nearbyLabel = getUIText('NEARBY', language);
    const propertyUserTagsDetails = tags.map((tag)=>({
        id: tag.tags.id,
        slug: tag.tags.slug,
        slug_en: tag.tags.slug_en,
        slug_fr: tag.tags.slug_fr,
        category: tag.tags.category,
        display_name: tag.tags.display_name,
        display_name_en: tag.tags.display_name_en,
        display_name_fr: tag.tags.display_name_fr,
        name: tag.tags.name,
        weight: tag.weight
      }));
    const breadcrumbs = buildPropertyBreadcrumbs(property_complete, propertyUserTagsDetails, language, trackingString, domainInfo);
    let propertySlug = property_complete.slug_url;
    if (language === 'en' && property_complete.slug_en) propertySlug = property_complete.slug_en;
    if (language === 'fr' && property_complete.slug_fr) propertySlug = property_complete.slug_fr;
    let canonicalPath = propertySlug;
    if (language !== 'es') canonicalPath = `${language}/${propertySlug}`;
    const canonicalUrl = `${domainInfo.realDomain}/${canonicalPath}`;
    const hreflangUrls = buildPropertyHreflangUrls(property_complete, language, domainInfo, trackingString);
    const seoTitle = `${propertyTitle} - ${property_complete.bedrooms || 'N'} ${bedroomsLabel}, ${property_complete.bathrooms || 'N'} ${bathroomsLabel} - ${companyName}`;
    let seoDescription = `${propertyDescription?.substring(0, 120) || ''}... ${property_complete.bedrooms || 'N'} ${bedroomsLabel}, ${property_complete.bathrooms || 'N'} ${bathroomsLabel} ${locationLabel} ${property_complete.sectors?.name || property_complete.cities?.name || 'República Dominicana'}.`;
    if (nearbyPlaces && nearbyPlaces.lugares_destacados?.length > 0) {
      const serviciosCercanos = nearbyPlaces.lugares_destacados.slice(0, 3).map((lugar)=>lugar.nombre).join(', ');
      seoDescription += ` ${nearbyLabel}: ${serviciosCercanos}.`;
    }
    const propertyAggregations = calculatePropertyAggregations([
      property_complete
    ]);
    const structuredData = generatePropertyStructuredData(property_complete, breadcrumbs, canonicalUrl, language, processedFaqs, nearbyPlaces);
    const twitterCard = generateTwitterCardMeta({
      title: seoTitle,
      description: seoDescription,
      image: property_complete.main_image_url,
      language,
      propertyAggregations
    });
    const keywords = generateSEOKeywords({
      tags: propertyUserTagsDetails,
      language,
      propertyAggregations
    });
    console.log(`SEO data built in ${Date.now() - seoStart}ms`);
    const totalTime = Date.now() - startTime;
    console.log(`=== TOTAL PROCESSING TIME: ${totalTime}ms ===`);
    // RETURN RESPONSE COMPLETO
    return {
      // Main property with all display data
      property: {
        ...property_complete,
        ...mainPropertyMultilingual,
        ...mainPropertyPricing,
        category_data: mainPropertyCategory,
        processed_images: processedImages
      },
      // Tags
      tags: tags,
      // Enhanced agent information with new logic
      agent: {
        main: processedFinalAgent,
        source: agentSource,
        referral_code: referralCode,
        properties: processedAgentProperties,
        properties_count: processedAgentProperties.length,
        should_show_properties: shouldFetchAgentProperties,
        cocaptors: cocaptors,
        cocaptors_count: cocaptors.length
      },
      // Content relacionado COMPLETO
      related_content: {
        similar_properties: processedSimilarProperties,
        articles: processedArticles,
        videos: processedVideos,
        testimonials: processedTestimonials,
        faqs: processedFaqs,
        seo_content: orderedContent.seoContent
      },
      // Project details
      project_details: projectDetails.data,
      // Location context
      location_context: {
        nearby_places: nearbyPlaces,
        total_places: nearbyPlaces?.estadisticas?.total_lugares || 0,
        featured_count: nearbyPlaces?.estadisticas?.destacados_count || 0,
        category_counts: nearbyPlaces?.conteos_por_categoria || {},
        search_type: nearbyPlaces?.estadisticas?.busqueda_tipo || 'none',
        search_radius: nearbyPlaces?.estadisticas?.radio_busqueda || 'N/A',
        location_name: nearbyPlaces?.ubicacion || property_complete.sectors?.name || property_complete.cities?.name,
        data_source: 'custom_database'
      },
      // SEO Data COMPLETO
      seo: {
        title: seoTitle,
        description: seoDescription,
        canonical_url: canonicalUrl,
        keywords: keywords,
        breadcrumbs: breadcrumbs,
        hreflang: hreflangUrls,
        structured_data: structuredData,
        twitter_card: twitterCard,
        open_graph: {
          title: seoTitle,
          description: seoDescription,
          url: canonicalUrl,
          type: 'article',
          site_name: companyName,
          image: property_complete.main_image_url,
          locale: language === 'en' ? 'en_US' : language === 'fr' ? 'fr_FR' : 'es_DO'
        },
        meta_tags: {
          robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
          author: 'René Castillo - CLIC Inmobiliaria',
          publisher: companyName
        }
      },
      // Tracking string
      trackingString: trackingString,
      // Performance metadata actualizado
      performance: {
        total_time_ms: totalTime,
        parallel_queries_used: true,
        query_phases: 5,
        agent_determination_enabled: true,
        cocaptors_fetched: true,
        default_agent_fallback: agentSource === 'default',
        properties_carousel_logic: shouldFetchAgentProperties ? 'enabled' : 'disabled',
        images_processed: true,
        centralized_processing: true,
        content_relations_processed: true,
        seo_data_complete: true
      },
      // Enhanced metadata
      meta: {
        language: language,
        agent_logic: {
          original_agent_id: property_complete.users?.id,
          final_agent_id: finalAgent?.id,
          agent_source: agentSource,
          referral_code: referralCode,
          should_fetch_properties: shouldFetchAgentProperties,
          cocaptors_found: cocaptors.length,
          agent_determination_logic: 'referral -> original -> cocaptor -> default',
          country_code_used: property_complete.users?.country_code || property_complete.country_code || 'DOM'
        },
        tags_count: tagIds.length,
        similar_properties_count: processedSimilarProperties.length,
        agent_properties_count: processedAgentProperties.length,
        content_articles_count: processedArticles.length,
        content_videos_count: processedVideos.length,
        content_testimonials_count: processedTestimonials.length,
        content_faqs_count: processedFaqs.length,
        content_seo_count: orderedContent.seoContent.length,
        directly_related_count: {
          properties: directlyRelated.property.length,
          articles: directlyRelated.article.length,
          videos: directlyRelated.video.length,
          testimonials: directlyRelated.testimonial.length,
          faqs: directlyRelated.faq.length,
          seo_content: directlyRelated.seo_content.length
        },
        tag_related_count: {
          properties: tagContent.property.length,
          articles: tagContent.article.length,
          videos: tagContent.video.length,
          testimonials: tagContent.testimonial.length,
          faqs: tagContent.faq.length,
          seo_content: tagContent.seo_content.length
        },
        referral_code: referralCode,
        referral_agent_found: agentSource === 'referral',
        urls_processed_with_tracking: true,
        multilingual_seo: true,
        nearby_places_integrated: !!nearbyPlaces,
        images_processing: {
          total_images: processedImages.total_images,
          gallery_images_count: processedImages.gallery_images.length,
          main_image_url: processedImages.main_image,
          large_versions_applied: processedImages.gallery_images.filter((img)=>img.includes('_large.')).length
        },
        seo_processing: {
          breadcrumbs_generated: breadcrumbs.length,
          hreflang_urls_generated: Object.keys(hreflangUrls).length,
          structured_data_schemas: structuredData.length,
          twitter_card_generated: !!twitterCard,
          keywords_generated: keywords.length > 0
        },
        display_data_ready: true,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error in enhanced single property handler:', error);
    throw error;
  }
}
// Helper functions
function extractReferralCode(trackingString) {
  if (!trackingString) return null;
  const match = trackingString.match(/[?&]ref=([A-Z0-9]+)/i);
  return match ? match[1] : null;
}
