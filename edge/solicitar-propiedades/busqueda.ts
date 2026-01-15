import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// =====================================================
// 🌍 NUEVAS FUNCIONES DE DETECCIÓN DE PAÍS E IDIOMA
// =====================================================
async function detectCountryByDomainAndInjectTag(supabaseClient, requestUrl) {
  console.log('🌍 === DETECTANDO PAÍS POR DOMINIO ===');
  const url = new URL(requestUrl);
  const hostname = url.hostname;
  const subdomain = hostname.split('.')[0];
  console.log('🔍 Analizando:', {
    hostname,
    subdomain
  });
  try {
    // 1. Buscar por custom domains PRIMERO
    let { data: country, error } = await supabaseClient.from('countries').select('*').eq('active', true).contains('custom_domains', [
      hostname
    ]).single();
    let detectionMethod = 'custom_domain';
    // 2. Si no encuentra, buscar por subdomain
    if (!country && !error) {
      ({ data: country, error } = await supabaseClient.from('countries').select('*').eq('active', true).eq('subdomain', subdomain).single());
      detectionMethod = 'subdomain';
    }
    // 3. Fallback a República Dominicana
    if (!country) {
      console.log('🔄 No se encontró país específico, usando República Dominicana como default');
      ({ data: country, error } = await supabaseClient.from('countries').select('*').eq('active', true).ilike('name', '%república dominicana%').single());
      detectionMethod = 'default';
    }
    if (!country) {
      // Hardcoded fallback
      country = {
        id: null,
        name: 'República Dominicana',
        code: 'DO',
        currency: 'USD',
        country_flag: '🇩🇴',
        subdomain: null,
        custom_domains: []
      };
      detectionMethod = 'hardcoded_fallback';
    }
    // 4. Buscar el tag correspondiente al país
    const countryTag = await findCountryTag(supabaseClient, country);
    return {
      country,
      countryTag,
      detectionMethod
    };
  } catch (error) {
    console.error('❌ Error detectando país:', error);
    return {
      country: {
        id: null,
        name: 'República Dominicana',
        code: 'DO',
        currency: 'USD',
        country_flag: '🇩🇴'
      },
      countryTag: null,
      detectionMethod: 'error_fallback'
    };
  }
}
async function findCountryTag(supabaseClient, country) {
  console.log('🏷️ Buscando tag del país:', country.name);
  try {
    const countrySlug = country.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    let { data: tag } = await supabaseClient.from('tags').select('id, name, slug, category, display_name').eq('category', 'pais').or(`slug.eq.${countrySlug},name.ilike.%${country.name}%`).single();
    if (tag) {
      console.log('✅ Tag de país encontrado:', tag.name);
      return tag;
    }
    console.log('⚠️ No se encontró tag para el país:', country.name);
    return null;
  } catch (error) {
    console.error('❌ Error buscando tag del país:', error);
    return null;
  }
}
function detectLanguageFromUrl(urlSegments) {
  console.log('🗣️ Detectando idioma desde URL segments:', urlSegments);
  const firstSegment = urlSegments[0]?.toLowerCase();
  if ([
    'en',
    'fr'
  ].includes(firstSegment)) {
    console.log(`🎯 Idioma detectado: ${firstSegment}`);
    return {
      language: firstSegment,
      detectedFromUrl: true,
      cleanedSegments: urlSegments.slice(1)
    };
  }
  console.log('🔄 Idioma por defecto: español');
  return {
    language: 'es',
    detectedFromUrl: false,
    cleanedSegments: urlSegments
  };
}
async function checkIfHasCountryTag(supabaseClient, tagIds) {
  if (!tagIds || tagIds.length === 0) return false;
  try {
    const { data: tags } = await supabaseClient.from('tags').select('category').in('id', tagIds);
    return tags?.some((tag)=>tag.category === 'pais') || false;
  } catch (error) {
    console.error('❌ Error verificando tags de país:', error);
    return false;
  }
}
// =====================================================
// FUNCIONES SEO CON GOOGLE PLACES INTEGRATION (EXISTENTES)
// =====================================================
const googlePlacesCache = new Map();
async function getLocationGooglePlacesData(supabaseClient, locationName) {
  if (!locationName) return null;
  if (googlePlacesCache.has(locationName)) {
    console.log(`🎯 Cache hit para Google Places: ${locationName}`);
    return googlePlacesCache.get(locationName);
  }
  console.log(`🔍 Obteniendo datos de Google Places para: ${locationName}`);
  try {
    const { data: locationInsight, error: locationError } = await supabaseClient.from('location_insights_with_places').select('id, location_name, services_score').ilike('location_name', `%${locationName}%`).eq('status', 'active').single();
    if (locationError || !locationInsight) {
      console.log(`⚠️ No se encontró location_insight para: ${locationName}`);
      return null;
    }
    const { data: placesData, error: placesError } = await supabaseClient.from('google_places_data').select(`
        place_name, place_category, place_type, rating, 
        user_ratings_total, distance_display, business_status,
        is_featured, relevance_score, address
      `).eq('location_insight_id', locationInsight.id).eq('status', 'active').order('distance_meters', {
      ascending: true
    });
    if (placesError) {
      console.error(`❌ Error obteniendo Google Places data:`, placesError);
      return null;
    }
    const placesByCategory = {};
    const featuredPlaces = [];
    (placesData || []).forEach((place)=>{
      if (!placesByCategory[place.place_category]) {
        placesByCategory[place.place_category] = [];
      }
      placesByCategory[place.place_category].push(place);
      if (place.is_featured && featuredPlaces.length < 10) {
        featuredPlaces.push(place);
      }
    });
    const stats = {
      total_places: placesData?.length || 0,
      categories_count: Object.keys(placesByCategory).length,
      featured_count: featuredPlaces.length,
      avg_rating: placesData?.length > 0 ? (placesData.filter((p)=>p.rating).reduce((sum, p)=>sum + p.rating, 0) / placesData.filter((p)=>p.rating).length).toFixed(1) : null,
      services_score: locationInsight.services_score || 0
    };
    const result = {
      location_insight_id: locationInsight.id,
      location_name: locationInsight.location_name,
      places_by_category: placesByCategory,
      featured_places: featuredPlaces,
      stats
    };
    googlePlacesCache.set(locationName, result);
    setTimeout(()=>googlePlacesCache.delete(locationName), 30 * 60 * 1000);
    return result;
  } catch (error) {
    console.error(`❌ Error crítico obteniendo Google Places data:`, error);
    return null;
  }
}
function optimizePropertyImages(property) {
  const location = property.sectors?.name || property.cities?.name || '';
  const propertyType = property.property_categories?.name || 'Propiedad';
  const allImages = new Map();
  if (property.main_image_url && property.main_image_url.trim()) {
    allImages.set(property.main_image_url, {
      url: property.main_image_url,
      title: `${property.name} - Imagen Principal`,
      description: `${propertyType} de ${property.bedrooms} habitaciones en ${location}`,
      is_main: true,
      sort_order: 0,
      source: 'main'
    });
  }
  if (property.property_images && property.property_images.length > 0) {
    property.property_images.forEach((img, index)=>{
      if (img.url && img.url.trim()) {
        const key = img.url;
        if (!allImages.has(key)) {
          allImages.set(key, {
            url: img.url,
            title: img.title || `${property.name} - Vista ${index + 1}`,
            description: img.description || `${propertyType} en ${location}`,
            is_main: img.is_main || false,
            sort_order: img.sort_order || index + 1,
            source: 'property_images'
          });
        }
      }
    });
  }
  if (property.gallery_images_url && typeof property.gallery_images_url === 'string') {
    const galleryUrls = property.gallery_images_url.split(',').map((url)=>url.trim()).filter((url)=>url.length > 0 && url !== ',');
    galleryUrls.forEach((url, index)=>{
      if (!allImages.has(url)) {
        allImages.set(url, {
          url: url,
          title: `${property.name} - Galería ${index + 1}`,
          description: `${propertyType} en ${location}`,
          is_main: false,
          sort_order: 100 + index,
          source: 'gallery'
        });
      }
    });
  }
  const unifiedImages = Array.from(allImages.values()).sort((a, b)=>{
    if (a.is_main && !b.is_main) return -1;
    if (!a.is_main && b.is_main) return 1;
    return a.sort_order - b.sort_order;
  }).map((img, index)=>({
      ...img,
      optimized_url: `${img.url}?w=800&h=600&q=85&f=webp`,
      thumbnail_url: `${img.url}?w=300&h=200&q=80&f=webp`,
      position: index
    }));
  const mainImage = unifiedImages.find((img)=>img.is_main) || unifiedImages[0];
  return {
    ...property,
    main_image_optimized: mainImage ? {
      url: mainImage.url,
      alt: mainImage.title,
      width: 800,
      height: 600,
      optimized_url: mainImage.optimized_url
    } : null,
    images_unified: unifiedImages,
    images_count: unifiedImages.length
  };
}
function unifyPropertyPricing(property) {
  const prices = {
    sale: null,
    rental: null,
    temp_rental: null,
    furnished_rental: null,
    display_price: null,
    price_range: null
  };
  if (property.sale_price && property.sale_price > 0) {
    prices.sale = {
      amount: property.sale_price,
      currency: property.sale_currency || 'USD',
      formatted: `$${property.sale_price.toLocaleString()} ${property.sale_currency || 'USD'}`
    };
  }
  if (property.rental_price && property.rental_price > 0) {
    prices.rental = {
      amount: property.rental_price,
      currency: property.rental_currency || 'USD',
      formatted: `$${property.rental_price.toLocaleString()} ${property.rental_currency || 'USD'}/mes`
    };
  }
  if (property.temp_rental_price && property.temp_rental_price > 0) {
    prices.temp_rental = {
      amount: property.temp_rental_price,
      currency: property.temp_rental_currency || 'USD',
      formatted: `$${property.temp_rental_price.toLocaleString()} ${property.temp_rental_currency || 'USD'}/noche`
    };
  }
  if (property.furnished_rental_price && property.furnished_rental_price > 0) {
    prices.furnished_rental = {
      amount: property.furnished_rental_price,
      currency: property.furnished_rental_currency || 'USD',
      formatted: `$${property.furnished_rental_price.toLocaleString()} ${property.furnished_rental_currency || 'USD'}/mes amueblado`
    };
  }
  if (prices.sale) {
    prices.display_price = prices.sale;
    prices.operation_type = 'sale';
  } else if (prices.rental) {
    prices.display_price = prices.rental;
    prices.operation_type = 'rental';
  } else if (prices.furnished_rental) {
    prices.display_price = prices.furnished_rental;
    prices.operation_type = 'furnished_rental';
  } else if (prices.temp_rental) {
    prices.display_price = prices.temp_rental;
    prices.operation_type = 'temp_rental';
  }
  return {
    ...property,
    pricing_unified: prices
  };
}
// =====================================================
// ✨ FUNCIONES PARA COORDENADAS (EXISTENTES)
// =====================================================
function parseCoordinates(coordinatesData) {
  if (!coordinatesData) return null;
  try {
    // Si es un string, intentar parsearlo
    if (typeof coordinatesData === 'string') {
      // ✅ NUEVO: Formato PostgreSQL/PostGIS: (lng,lat)
      if (coordinatesData.includes('(') && coordinatesData.includes(',') && coordinatesData.includes(')')) {
        const match = coordinatesData.match(/\(\s*([+-]?\d*\.?\d+)\s*,\s*([+-]?\d*\.?\d+)\s*\)/);
        if (match) {
          return {
            lng: parseFloat(match[1]),
            lat: parseFloat(match[2])
          };
        }
      }
      // Formato POINT(lng lat) de PostGIS
      if (coordinatesData.includes('POINT')) {
        const match = coordinatesData.match(/POINT\s*\(\s*([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s*\)/i);
        if (match) {
          return {
            lng: parseFloat(match[1]),
            lat: parseFloat(match[2])
          };
        }
      }
      // Intentar parsear como JSON solo si parece JSON válido
      if (coordinatesData.trim().startsWith('{') || coordinatesData.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(coordinatesData);
          if (parsed.x !== undefined && parsed.y !== undefined) {
            return {
              lng: parsed.x,
              lat: parsed.y
            };
          }
          if (parsed.lng !== undefined && parsed.lat !== undefined) {
            return {
              lng: parsed.lng,
              lat: parsed.lat
            };
          }
          if (parsed.longitude !== undefined && parsed.latitude !== undefined) {
            return {
              lng: parsed.longitude,
              lat: parsed.latitude
            };
          }
        } catch (jsonError) {
          console.warn('⚠️ Error parseando como JSON:', jsonError.message, coordinatesData);
        }
      }
    }
    // Si es un objeto
    if (typeof coordinatesData === 'object') {
      if (coordinatesData.x !== undefined && coordinatesData.y !== undefined) {
        return {
          lng: coordinatesData.x,
          lat: coordinatesData.y
        };
      }
      if (coordinatesData.lng !== undefined && coordinatesData.lat !== undefined) {
        return {
          lng: coordinatesData.lng,
          lat: coordinatesData.lat
        };
      }
      if (coordinatesData.longitude !== undefined && coordinatesData.latitude !== undefined) {
        return {
          lng: coordinatesData.longitude,
          lat: coordinatesData.latitude
        };
      }
    }
    console.warn('⚠️ Formato de coordenadas no reconocido:', coordinatesData);
    return null;
  } catch (error) {
    console.error('❌ Error parseando coordenadas:', error, coordinatesData);
    return null;
  }
}
function getStaticCoordinates(property) {
  // Mantener el sistema estático existente como último fallback
  const locationMap = {
    'punta cana': {
      lat: 18.5601,
      lng: -68.3725
    },
    'bavaro': {
      lat: 18.5467,
      lng: -68.4104
    },
    'naco': {
      lat: 18.4861,
      lng: -69.9312
    },
    'piantini': {
      lat: 18.4745,
      lng: -69.9254
    },
    'bella vista': {
      lat: 18.4696,
      lng: -69.9411
    },
    'manoguayabo': {
      lat: 18.4861,
      lng: -70.0037
    },
    'santiago': {
      lat: 19.4517,
      lng: -70.6970
    },
    'distrito nacional': {
      lat: 18.4682,
      lng: -69.9279
    }
  };
  const searchTerms = [
    property.sectors?.name?.toLowerCase(),
    property.cities?.name?.toLowerCase()
  ].filter(Boolean);
  for (const term of searchTerms){
    for (const [location, coords] of Object.entries(locationMap)){
      if (term.includes(location) || location.includes(term)) {
        return coords;
      }
    }
  }
  // Default: Distrito Nacional
  return {
    lat: 18.4682,
    lng: -69.9279
  };
}
function findFallbackCoordinates(property) {
  // Buscar coordenadas de zona cuando no se debe mostrar ubicación exacta
  if (property.sectors?.coordinates) {
    return parseCoordinates(property.sectors.coordinates);
  }
  if (property.cities?.coordinates) {
    return parseCoordinates(property.cities.coordinates);
  }
  if (property.cities?.provinces?.coordinates) {
    return parseCoordinates(property.cities.provinces.coordinates);
  }
  return getStaticCoordinates(property);
}
function processPropertyCoordinates(property) {
  console.log('📍 === PROCESANDO COORDENADAS DE PROPIEDAD ===');
  console.log('🏠 Property ID:', property.id);
  console.log('📍 exact_coordinates:', property.exact_coordinates);
  console.log('👁️ show_exact_location:', property.show_exact_location);
  console.log('🏙️ sectors.coordinates:', property.sectors?.coordinates);
  console.log('🌆 cities.coordinates:', property.cities?.coordinates);
  console.log('🗺️ provinces.coordinates:', property.cities?.provinces?.coordinates);
  const result = {
    hasExactCoordinates: false,
    showExactLocation: property.show_exact_location || false,
    exactCoordinates: null,
    fallbackCoordinates: null,
    source: 'none',
    processed: true,
    rawData: {
      exact_coordinates: property.exact_coordinates,
      show_exact_location: property.show_exact_location,
      sectors_coordinates: property.sectors?.coordinates,
      cities_coordinates: property.cities?.coordinates,
      provinces_coordinates: property.cities?.provinces?.coordinates
    }
  };
  // ✅ PRIORIDAD 1: COORDENADAS EXACTAS DE LA PROPIEDAD
  if (property.exact_coordinates) {
    console.log('🎯 Usando coordenadas exactas de la propiedad');
    result.hasExactCoordinates = true;
    result.exactCoordinates = parseCoordinates(property.exact_coordinates);
    result.source = 'property_exact';
    // Si no se debe mostrar ubicación exacta, usar coordenadas de zona como fallback
    if (!property.show_exact_location) {
      console.log('👁️ show_exact_location = false, buscando coordenadas de zona...');
      result.fallbackCoordinates = findFallbackCoordinates(property);
    }
  } else if (property.sectors?.coordinates) {
    console.log('🏘️ Usando coordenadas del sector');
    result.fallbackCoordinates = parseCoordinates(property.sectors.coordinates);
    result.source = 'sector';
  } else if (property.cities?.coordinates) {
    console.log('🏙️ Usando coordenadas de la ciudad');
    result.fallbackCoordinates = parseCoordinates(property.cities.coordinates);
    result.source = 'city';
  } else if (property.cities?.provinces?.coordinates) {
    console.log('🗺️ Usando coordenadas de la provincia');
    result.fallbackCoordinates = parseCoordinates(property.cities.provinces.coordinates);
    result.source = 'province';
  } else {
    console.log('📍 Usando coordenadas estáticas como fallback');
    result.fallbackCoordinates = getStaticCoordinates(property);
    result.source = 'static_fallback';
  }
  console.log('✅ Coordenadas procesadas exitosamente:', {
    hasExact: result.hasExactCoordinates,
    showExact: result.showExactLocation,
    source: result.source,
    exactCoords: result.exactCoordinates,
    fallbackCoords: result.fallbackCoordinates
  });
  return result;
}
function generateLocationData(property, coordinatesInfo) {
  console.log('🗺️ === GENERANDO DATOS DE UBICACIÓN COMPLETOS ===');
  const displayCoordinates = coordinatesInfo.showExactLocation && coordinatesInfo.exactCoordinates ? coordinatesInfo.exactCoordinates : coordinatesInfo.fallbackCoordinates;
  const locationData = {
    // ✅ COORDENADAS PARA MOSTRAR (respetando show_exact_location)
    coordinates: displayCoordinates,
    // ✅ INFORMACIÓN DE CONFIGURACIÓN
    hasExactCoordinates: coordinatesInfo.hasExactCoordinates,
    showExactLocation: coordinatesInfo.showExactLocation,
    coordinatesSource: coordinatesInfo.source,
    // ✅ DATOS SEPARADOS PARA CASOS ESPECÍFICOS
    exactCoordinates: coordinatesInfo.exactCoordinates,
    fallbackCoordinates: coordinatesInfo.fallbackCoordinates,
    // ✅ INFORMACIÓN DE UBICACIÓN TEXTUAL
    address: formatLocationAddress(property),
    sector: property.sectors?.name || null,
    city: property.cities?.name || null,
    province: property.cities?.provinces?.name || null,
    // ✅ CONFIGURACIÓN PARA MAPAS
    mapConfig: {
      zoom: coordinatesInfo.showExactLocation && coordinatesInfo.hasExactCoordinates ? 17 : 14,
      showMarker: coordinatesInfo.showExactLocation && coordinatesInfo.hasExactCoordinates,
      showAreaCircle: !coordinatesInfo.showExactLocation,
      circleRadius: coordinatesInfo.source === 'sector' ? 500 : coordinatesInfo.source === 'city' ? 1000 : coordinatesInfo.source === 'province' ? 2000 : 750
    },
    // ✅ METADATA PARA DEBUG
    debug: {
      rawCoordinatesData: coordinatesInfo.rawData,
      processingSource: coordinatesInfo.source,
      hasExactButHidden: coordinatesInfo.hasExactCoordinates && !coordinatesInfo.showExactLocation,
      fallbackReason: !coordinatesInfo.hasExactCoordinates ? 'no_exact_coordinates' : !coordinatesInfo.showExactLocation ? 'privacy_setting' : null
    }
  };
  console.log('✅ Datos de ubicación generados:', {
    hasCoordinates: !!locationData.coordinates,
    source: locationData.coordinatesSource,
    showExact: locationData.showExactLocation,
    zoom: locationData.mapConfig.zoom,
    showMarker: locationData.mapConfig.showMarker
  });
  return locationData;
}
function formatLocationAddress(property) {
  const parts = [
    property.sectors?.name,
    property.cities?.name,
    property.cities?.provinces?.name
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'República Dominicana';
} // =====================================================
// 🔍 FUNCIONES DE BÚSQUEDA MODIFICADAS CON INYECCIÓN DE PAÍS
// =====================================================
async function searchPropertiesByTags(supabaseClient, tagIds, countryTagId, page = 1, limit = 32) {
  console.log('🔍 === BÚSQUEDA DE PROPIEDADES CON INYECCIÓN AUTOMÁTICA DE PAÍS ===');
  // ✅ INYECCIÓN AUTOMÁTICA DEL TAG DE PAÍS
  let finalTagIds = [
    ...tagIds
  ];
  let countryInjected = false;
  if (countryTagId) {
    // Verificar si ya tiene tag de país
    const hasCountryTag = await checkIfHasCountryTag(supabaseClient, tagIds);
    if (!hasCountryTag) {
      finalTagIds = [
        countryTagId,
        ...tagIds
      ];
      countryInjected = true;
      console.log('✅ Tag de país inyectado automáticamente:', countryTagId);
    } else {
      console.log('✅ Ya existe tag de país en la búsqueda');
    }
  } else {
    console.log('⚠️ No hay tag de país para inyectar');
  }
  console.log('📋 Tags finales para búsqueda:', {
    original: tagIds.length,
    final: finalTagIds.length,
    countryInjected: countryInjected
  });
  if (finalTagIds.length === 0) {
    return {
      properties: [],
      totalCount: 0,
      currentPage: page,
      hasMore: false,
      itemsPerPage: limit,
      countryInjected: false
    };
  }
  try {
    let totalCount = 0;
    let validPropertyIds = [];
    // Intentar RPC primero
    const { data: rpcPropertyIds, error: rpcError } = await supabaseClient.rpc('get_properties_with_all_tags', {
      tag_ids: finalTagIds
    });
    if (!rpcError && rpcPropertyIds && rpcPropertyIds.length > 0) {
      validPropertyIds = rpcPropertyIds;
      totalCount = rpcPropertyIds.length;
      console.log(`✅ RPC exitoso con país: ${totalCount} propiedades encontradas`);
    } else {
      console.log('🔄 Usando método fallback con content_tags');
      const { data: contentTags, error: contentTagsError } = await supabaseClient.from('content_tags').select('content_id, tag_id').eq('content_type', 'properties').in('tag_id', finalTagIds);
      if (contentTagsError || !contentTags) {
        return {
          properties: [],
          totalCount: 0,
          currentPage: page,
          hasMore: false,
          itemsPerPage: limit,
          countryInjected: countryInjected
        };
      }
      const tagCountByProperty = {};
      contentTags.forEach((ct)=>{
        tagCountByProperty[ct.content_id] = (tagCountByProperty[ct.content_id] || 0) + 1;
      });
      // DEBE tener TODOS los tags (incluyendo país)
      const requiredTagCount = finalTagIds.length;
      validPropertyIds = Object.keys(tagCountByProperty).filter((propertyId)=>tagCountByProperty[propertyId] === requiredTagCount);
      totalCount = validPropertyIds.length;
      console.log(`✅ Fallback exitoso con país: ${totalCount} propiedades encontradas`);
    }
    if (totalCount === 0) {
      return {
        properties: [],
        totalCount: 0,
        currentPage: page,
        hasMore: false,
        itemsPerPage: limit,
        countryInjected: countryInjected
      };
    }
    const offset = (page - 1) * limit;
    const paginatedPropertyIds = validPropertyIds.slice(offset, offset + limit);
    console.log(`📄 Obteniendo página ${page}: ${paginatedPropertyIds.length} propiedades (offset: ${offset})`);
    // ✅ CONSULTA ACTUALIZADA CON COORDENADAS PARA LISTADOS
    const { data: properties, error: propertiesError } = await supabaseClient.from('properties').select(`
        id, code, name, description, agent_id, slug_url,
        sale_price, sale_currency, rental_price, rental_currency,
        temp_rental_price, temp_rental_currency, 
        furnished_rental_price, furnished_rental_currency,
        bedrooms, bathrooms, parking_spots, built_area, land_area,
        main_image_url, gallery_images_url, property_status, is_project,
        delivery_date, project_detail_id,
        exact_coordinates, show_exact_location,
        property_categories(name, description),
        cities(name, coordinates, provinces(name, coordinates)),
        sectors(name, coordinates),
        property_images(url, title, description, is_main, sort_order)
      `).in('id', paginatedPropertyIds).eq('availability', 1).eq('property_status', 'Publicada');
    if (propertiesError) {
      console.error('❌ Error obteniendo propiedades:', propertiesError);
      return {
        properties: [],
        totalCount: 0,
        currentPage: page,
        hasMore: false,
        itemsPerPage: limit,
        countryInjected: countryInjected
      };
    }
    const hasMore = offset + limit < totalCount;
    console.log(`✅ Búsqueda completada con país: ${properties?.length || 0} propiedades obtenidas, ${totalCount} total, hasMore: ${hasMore}`);
    return {
      properties: properties || [],
      totalCount,
      currentPage: page,
      hasMore,
      itemsPerPage: limit,
      countryInjected: countryInjected,
      searchMetadata: {
        originalTagsCount: tagIds.length,
        finalTagsCount: finalTagIds.length,
        countryTagIncluded: countryInjected,
        countryTagId: countryInjected ? countryTagId : null
      }
    };
  } catch (error) {
    console.error('❌ Error en searchPropertiesByTags con país:', error);
    return {
      properties: [],
      totalCount: 0,
      currentPage: page,
      hasMore: false,
      itemsPerPage: limit,
      countryInjected: false
    };
  }
}
// ✅ FUNCIÓN ACTUALIZADA: searchPropertyBySlugUrl CON COORDENADAS
async function searchPropertyBySlugUrl(supabaseClient, searchPath) {
  console.log('🔍 Búsqueda por slug_url:', searchPath);
  // ✅ CONSULTA ACTUALIZADA CON COORDENADAS
  const selectQuery = `
    id, code, name, description, agent_id, slug_url,
    sale_price, sale_currency, rental_price, rental_currency,
    temp_rental_price, temp_rental_currency, 
    furnished_rental_price, furnished_rental_currency,
    bedrooms, bathrooms, parking_spots, built_area, land_area,
    main_image_url, gallery_images_url, property_status, is_project,
    delivery_date, project_detail_id,
    exact_coordinates, show_exact_location,
    property_categories(name, description),
    cities(name, coordinates, provinces(name, coordinates)),
    sectors(name, coordinates),
    property_images(url, title, description, is_main, sort_order),
    property_amenities(amenity_id, value, amenities(name, icon, category))
  `;
  const searchVariants = [
    searchPath,
    `/${searchPath}`,
    searchPath.replace(/^\//, ''),
    `/${searchPath.replace(/^\//, '')}`
  ];
  // ✅ MEJORA: Buscar primero en propiedades publicadas
  for (const variant of searchVariants){
    const { data: property, error } = await supabaseClient.from('properties').select(selectQuery).eq('slug_url', variant).eq('availability', 1).eq('property_status', 'Publicada').single();
    if (!error && property) {
      console.log(`✅ Propiedad DISPONIBLE encontrada con slug: "${variant}"`);
      // ✅ PROCESAR Y LOGGEAR COORDENADAS
      const coordinatesInfo = processPropertyCoordinates(property);
      console.log('📍 Coordenadas procesadas:', coordinatesInfo);
      return {
        found: true,
        property: property,
        searchMethod: 'exact_slug',
        matchedVariant: variant,
        available: true,
        coordinatesInfo
      };
    }
  }
  // ✅ NUEVA FUNCIONALIDAD: Buscar en propiedades NO disponibles (vendidas/retiradas)
  console.log('🔍 Propiedad no encontrada en disponibles, buscando en no disponibles...');
  for (const variant of searchVariants){
    const { data: property, error } = await supabaseClient.from('properties').select(selectQuery).eq('slug_url', variant).single(); // Sin filtros de disponibilidad
    if (!error && property && property.property_status !== 'Publicada') {
      console.log(`⚠️ Propiedad NO DISPONIBLE encontrada con slug: "${variant}", status: ${property.property_status}`);
      // ✅ PROCESAR COORDENADAS TAMBIÉN PARA PROPIEDADES NO DISPONIBLES
      const coordinatesInfo = processPropertyCoordinates(property);
      console.log('📍 Coordenadas procesadas (no disponible):', coordinatesInfo);
      return {
        found: true,
        property: property,
        searchMethod: 'exact_slug_sold',
        matchedVariant: variant,
        available: false,
        soldStatus: property.property_status,
        coordinatesInfo
      };
    }
  }
  return {
    found: false,
    property: null,
    searchPath: searchPath,
    available: false
  };
}
// =====================================================
// ✨ FUNCIÓN DE CONTENIDO RELACIONADO MODIFICADA CON INYECCIÓN DE PAÍS
// =====================================================
// =====================================================
// ✅ SOLUCIÓN SIMPLE: DOS LLAMADAS SEPARADAS
// =====================================================
// =====================================================
// ✨ FUNCIÓN DE CONTENIDO RELACIONADO MODIFICADA CON INYECCIÓN DE PAÍS
// =====================================================
async function getRelatedContent(supabaseClient, tagIds, countryTagId, limitPerType = 10) {
  console.log('🔍 === CONTENIDO CON DOS LLAMADAS SIMPLES ===');
  if (!countryTagId) {
    console.log('⚠️ No hay país, búsqueda normal');
    return getEmptyResult();
  }
  try {
    // ✅ LLAMADA 1: PAÍS + OTROS TAGS (alta relevancia)
    console.log('🎯 LLAMADA 1: País + otros tags');
    let organizedTagIds = [
      ...tagIds
    ];
    if (!organizedTagIds.includes(countryTagId)) {
      organizedTagIds = [
        countryTagId,
        ...tagIds
      ];
    } else {
      // Reorganizar para poner país primero
      organizedTagIds = organizedTagIds.filter((id)=>id !== countryTagId);
      organizedTagIds = [
        countryTagId,
        ...organizedTagIds
      ];
    }
    const { data: specificResults } = await supabaseClient.rpc('get_all_content_by_tags', {
      tag_ids: organizedTagIds,
      limit_per_type: limitPerType
    });
    console.log('✅ Específicos:', specificResults?.length || 0);
    // ✅ LLAMADA 2: SOLO PAÍS (para rellenar)
    console.log('🔄 LLAMADA 2: Solo país para rellenar');
    const { data: fillResults } = await supabaseClient.rpc('get_all_content_by_tags', {
      tag_ids: [
        countryTagId
      ],
      limit_per_type: limitPerType * 2 // Más cantidad para opciones
    });
    console.log('✅ Relleno:', fillResults?.length || 0);
    // ✅ COMBINAR RESULTADOS SIN DUPLICADOS
    const combinedResults = combineSimple(specificResults || [], fillResults || [], limitPerType);
    console.log('🔀 Combinados:', combinedResults.length);
    // ✅ PROCESAR CONTENIDO (lógica existente)
    return await processResults(supabaseClient, combinedResults);
  } catch (error) {
    console.error('❌ Error:', error);
    return getEmptyResult();
  }
}
// =====================================================
// 🔀 COMBINAR SIMPLE
// =====================================================
function combineSimple(specificResults, fillResults, limitPerType) {
  console.log('🔀 Combinando resultados simples');
  const usedIds = new Set();
  const final = [];
  // Agrupar por tipo
  const specificByType = groupByType(specificResults);
  const fillByType = groupByType(fillResults);
  [
    'article',
    'video',
    'testimonial',
    'faq',
    'seo_content'
  ].forEach((type)=>{
    const specific = specificByType[type] || [];
    const fill = fillByType[type] || [];
    let count = 0;
    // Primero: específicos
    specific.forEach((item)=>{
      if (!usedIds.has(item.content_id) && count < limitPerType) {
        final.push({
          ...item,
          priority: 'specific'
        });
        usedIds.add(item.content_id);
        count++;
      }
    });
    // Luego: relleno
    fill.forEach((item)=>{
      if (!usedIds.has(item.content_id) && count < limitPerType) {
        final.push({
          ...item,
          priority: 'fill'
        });
        usedIds.add(item.content_id);
        count++;
      }
    });
    console.log(`📋 ${type}: específicos=${specific.length}, relleno=${count - specific.length}, total=${count}`);
  });
  return final;
}
function groupByType(results) {
  return (results || []).reduce((acc, item)=>{
    if (!acc[item.content_type]) acc[item.content_type] = [];
    acc[item.content_type].push(item);
    return acc;
  }, {});
}
// =====================================================
// 📊 PROCESAR RESULTADOS
// =====================================================
async function processResults(supabaseClient, combinedResults) {
  const groupedIds = {
    article: [],
    video: [],
    testimonial: [],
    faq: [],
    seo_content: []
  };
  const metadataMap = {};
  combinedResults.forEach((result)=>{
    const { content_id, content_type, total_weight, matched_tags, priority } = result;
    if (groupedIds[content_type]) {
      groupedIds[content_type].push(content_id);
      metadataMap[content_id] = {
        total_weight,
        matched_tags,
        content_type,
        priority,
        is_tag_related: true
      };
    }
  });
  console.log('📊 Para consultar:', {
    articles: groupedIds.article.length,
    videos: groupedIds.video.length,
    testimonials: groupedIds.testimonial.length,
    faqs: groupedIds.faq.length,
    seo_content: groupedIds.seo_content.length
  });
  const result = {
    articles: [],
    videos: [],
    testimonials: [],
    faqs: [],
    seo_content: [],
    countryInjected: true // Marcar que se inyectó país
  };
  // ✅ ARTÍCULOS
  if (groupedIds.article.length > 0) {
    const { data: articles } = await supabaseClient.from('articles').select(`
        id, title, slug, excerpt, content, featured_image,
        published_at, created_at, updated_at,
        meta_title, meta_description, read_time,
        views, featured, category, author_id,
        users!articles_author_id_fkey(
          first_name, last_name, profile_photo_url
        )
      `).in('id', groupedIds.article).eq('status', 'published').order('published_at', {
      ascending: false
    });
    if (articles) {
      result.articles = articles.map((article)=>{
        const author = {
          name: article.users ? `${article.users.first_name || ''} ${article.users.last_name || ''}`.trim() || 'Equipo CLIC' : 'Equipo CLIC',
          avatar: article.users?.profile_photo_url || '/images/team/clic-experts.jpg'
        };
        return {
          ...article,
          ...metadataMap[article.id],
          featuredImage: article.featured_image,
          publishedAt: article.published_at,
          readTime: article.read_time ? `${article.read_time} min` : '8 min',
          author: author,
          category: article.category || 'Artículos',
          views: article.views || `${Math.floor(Math.random() * 5 + 1)}.${Math.floor(Math.random() * 9 + 1)}K`,
          featured: article.featured || false
        };
      });
    }
  }
  // ✅ VIDEOS
  if (groupedIds.video.length > 0) {
    const { data: videos } = await supabaseClient.from('videos').select(`
        id, title, description, video_slug, thumbnail, video_id, 
        video_platform, duration, views, category, featured,
        meta_title, meta_description, status, published_at, 
        created_at, updated_at, subtitle
      `).in('id', groupedIds.video).eq('status', 'published').order('published_at', {
      ascending: false
    });
    if (videos) {
      result.videos = videos.map((video)=>({
          ...video,
          ...metadataMap[video.id],
          formatted_duration: formatDuration(video.duration),
          youtube_url: video.video_platform === 'youtube' && video.video_id ? `https://www.youtube.com/watch?v=${video.video_id}` : null
        }));
    }
  }
  // ✅ TESTIMONIALES
  if (groupedIds.testimonial.length > 0) {
    const { data: testimonials } = await supabaseClient.from('testimonials').select('*').in('id', groupedIds.testimonial).eq('status', 'published').order('published_at', {
      ascending: false
    });
    if (testimonials) {
      result.testimonials = testimonials.map((testimonial)=>({
          ...testimonial,
          ...metadataMap[testimonial.id]
        }));
    }
  }
  // ✅ FAQS
  if (groupedIds.faq.length > 0) {
    const { data: faqs } = await supabaseClient.from('faqs').select('*').in('id', groupedIds.faq).eq('status', 'published').order('sort_order');
    if (faqs) {
      result.faqs = faqs.map((faq)=>({
          ...faq,
          ...metadataMap[faq.id]
        }));
    }
  }
  // ✅ SEO CONTENT
  if (groupedIds.seo_content.length > 0) {
    const { data: seoContent } = await supabaseClient.from('seo_content').select('*').in('id', groupedIds.seo_content).eq('status', 'published').order('created_at', {
      ascending: false
    });
    if (seoContent) {
      result.seo_content = seoContent.map((content)=>({
          ...content,
          ...metadataMap[content.id]
        }));
    }
  }
  console.log('✅ Resultado final:', {
    articles: result.articles.length,
    videos: result.videos.length,
    testimonials: result.testimonials.length,
    faqs: result.faqs.length,
    seo_content: result.seo_content.length
  });
  return result;
}
function getEmptyResult() {
  return {
    articles: [],
    videos: [],
    testimonials: [],
    faqs: [],
    seo_content: [],
    countryInjected: false
  };
}
function formatDuration(seconds) {
  if (!seconds) return null;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor(seconds % 3600 / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
// =====================================================
// ✨ NUEVAS FUNCIONES PARA CARRUSELES DINÁMICOS
// =====================================================
async function generateDynamicThematicCarousels(supabaseClient, baseTagIds, countryTagId, limit = 8) {
  console.log('🎯 === GENERANDO CARRUSELES DINÁMICOS TEMÁTICOS ===');
  try {
    // 1. Obtener grupos activos con sus tags relacionados
    const { data: tagGroups, error: groupsError } = await supabaseClient.from('tag_groups').select(`
        id, slug, name, description, min_score, priority,
        seo_title, seo_description, icon, color,
        tag_group_tags!inner(
          tag_id, weight,
          tags!inner(id, slug, name, category)
        )
      `).eq('active', true).order('priority', {
      ascending: true
    });
    if (groupsError || !tagGroups?.length) {
      console.log('⚠️ No se encontraron grupos de tags activos');
      return [];
    }
    console.log(`📋 Encontrados ${tagGroups.length} grupos activos`);
    const carousels = [];
    // 2. Procesar cada grupo
    for (const group of tagGroups){
      console.log(`🔍 Procesando grupo: "${group.name}"`);
      // Extraer IDs de tags del grupo
      const groupTagIds = group.tag_group_tags.map((tgt)=>tgt.tag_id);
      if (groupTagIds.length === 0) {
        console.log(`⚠️ Grupo "${group.name}" sin tags`);
        continue;
      }
      // 3. Buscar propiedades con fallback progresivo
      const searchResult = await searchWithProgressiveFallback(supabaseClient, baseTagIds, groupTagIds, countryTagId, group.min_score || 4, limit);
      // 4. Verificar si cumple el mínimo
      if (searchResult.properties.length >= (group.min_score || 4)) {
        console.log(`✅ "${group.name}": ${searchResult.properties.length} propiedades`);
        carousels.push({
          id: group.id,
          title: group.name,
          subtitle: group.description || `Descubre ${group.name.toLowerCase()}`,
          properties: searchResult.properties.map(formatPropertyForCarousel),
          viewAllLink: await generateViewAllLink(supabaseClient, baseTagIds, groupTagIds),
          theme: mapGroupToTheme(group.slug, group.color),
          thematicGroup: group.slug,
          priority: group.priority,
          searchStats: {
            totalFound: searchResult.properties.length,
            fallbackLevel: searchResult.fallbackLevel,
            groupTagsCount: groupTagIds.length,
            minScoreRequired: group.min_score || 4
          },
          seo: {
            title: group.seo_title,
            description: group.seo_description
          },
          styling: {
            icon: group.icon,
            color: group.color
          }
        });
      } else {
        console.log(`❌ "${group.name}": ${searchResult.properties.length}/${group.min_score || 4} propiedades`);
      }
    }
    // 5. Ordenar por prioridad
    return carousels.sort((a, b)=>a.priority - b.priority);
  } catch (error) {
    console.error('❌ Error generando carruseles:', error);
    return [];
  }
}
async function searchWithProgressiveFallback(supabaseClient, baseTagIds, thematicTagIds, countryTagId, minResults, limit) {
  console.log('🔄 Búsqueda con fallback progresivo');
  // Obtener información de categorías de los tags base
  const { data: baseTags } = await supabaseClient.from('tags').select('id, category').in('id', baseTagIds);
  // Estrategias de fallback
  const strategies = [
    {
      level: 0,
      name: "Completo",
      filter: (tags)=>tags // Todos los tags base
    },
    {
      level: 1,
      name: "Sin sector",
      filter: (tags)=>tags.filter((t)=>t.category !== 'sector')
    },
    {
      level: 2,
      name: "Sin sector ni ciudad",
      filter: (tags)=>tags.filter((t)=>![
            'sector',
            'ciudad'
          ].includes(t.category))
    },
    {
      level: 3,
      name: "Solo esenciales",
      filter: (tags)=>tags.filter((t)=>[
            'operacion',
            'categoria'
          ].includes(t.category))
    }
  ];
  for (const strategy of strategies){
    console.log(`🎯 Nivel ${strategy.level}: ${strategy.name}`);
    const filteredBaseTags = strategy.filter(baseTags || []);
    const filteredBaseTagIds = filteredBaseTags.map((t)=>t.id);
    // Combinar: país + base filtrados + temáticos
    const finalTagIds = [
      countryTagId,
      ...filteredBaseTagIds,
      ...thematicTagIds
    ].filter(Boolean);
    console.log(`📋 Buscando con ${finalTagIds.length} tags`);
    const result = await searchPropertiesByTags(supabaseClient, finalTagIds, null, 1, limit);
    const count = result.properties?.length || 0;
    if (count >= minResults) {
      console.log(`✅ Éxito nivel ${strategy.level}: ${count} propiedades`);
      return {
        properties: result.properties,
        fallbackLevel: strategy.level,
        strategy: strategy.name
      };
    }
  }
  return {
    properties: [],
    fallbackLevel: -1,
    strategy: 'no_results'
  };
}
function formatPropertyForCarousel(property) {
  // Mapear el formato de la API al formato esperado por PropertyCarousel.astro
  return {
    slug: property.slug_url || `propiedad-${property.id}`,
    titulo: property.name,
    precio: property.pricing_unified?.display_price?.formatted || 'Precio a consultar',
    imagen: property.main_image_optimized?.url || property.main_image_url || '/placeholder.jpg',
    sector: property.location?.address || property.sectors?.name || property.cities?.name || '',
    habitaciones: property.bedrooms || 0,
    banos: property.bathrooms || 0,
    metros: property.built_area || property.land_area || 0,
    tipo: property.property_categories?.name || 'Propiedad',
    destacado: false,
    nuevo: property.is_project || false,
    descuento: null
  };
}
async function generateViewAllLink(supabaseClient, baseTagIds, thematicTagIds) {
  // Obtener slugs de todos los tags para construir URL
  const allTagIds = [
    ...baseTagIds,
    ...thematicTagIds
  ];
  const { data: tags } = await supabaseClient.from('tags').select('slug, category').in('id', allTagIds);
  if (!tags?.length) return '/comprar';
  // Ordenar por jerarquía: operacion -> categoria -> ciudad -> sector -> otros
  const hierarchy = [
    'operacion',
    'categoria',
    'ciudad',
    'sector'
  ];
  const sortedTags = tags.sort((a, b)=>{
    const aIndex = hierarchy.indexOf(a.category);
    const bIndex = hierarchy.indexOf(b.category);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
  const urlPath = sortedTags.map((t)=>t.slug).join('/');
  return `/${urlPath}`;
}
function mapGroupToTheme(groupSlug, color) {
  const themeMap = {
    'airbnb': 'investment',
    'perfectos-airbnb': 'investment',
    'familia': 'family',
    'perfectos-familia': 'family',
    'lujo': 'luxury',
    'todo-lujo': 'luxury',
    'entrega-2026': 'new',
    'en-construccion': 'new',
    'default': 'default'
  };
  return themeMap[groupSlug] || 'default';
}
// =====================================================
// FUNCIONES SEO (EXISTENTES)
// =====================================================
function generateSEOMetadata(context) {
  const { type, searchResults, property, tags, urlSegments, googlePlacesData } = context;
  let seoData = {
    title: '',
    description: '',
    keywords: [],
    h1: '',
    structured_data: {},
    og: {},
    twitter: {},
    technical: {},
    places_enrichment: null
  };
  if (type === 'single-property' || type === 'single-property-project' || type === 'property-not-available') {
    const prop = property;
    const location = prop.sectors?.name || prop.cities?.name || 'República Dominicana';
    const propertyType = prop.property_categories?.name || 'Propiedad';
    const pricing = prop.pricing_unified?.display_price;
    const price = pricing ? pricing.formatted : 'Precio disponible';
    let nearbyServices = '';
    if (googlePlacesData && googlePlacesData.featured_places?.length > 0) {
      const topServices = googlePlacesData.featured_places.slice(0, 3);
      nearbyServices = ` Cerca de ${topServices.map((s)=>s.place_name).join(', ')}.`;
    }
    // Título específico para propiedades no disponibles
    if (type === 'property-not-available') {
      seoData.title = `${prop.name} - No Disponible | Propiedades Similares | CLIC Inmobiliaria`;
      seoData.description = `${propertyType} en ${location} ya no está disponible. Descubre propiedades similares de ${prop.bedrooms} habitaciones y ${prop.bathrooms} baños.${nearbyServices}`;
    } else {
      seoData.title = `${prop.name} | ${propertyType} en ${location} | CLIC Inmobiliaria`;
      seoData.description = `${propertyType} de ${prop.bedrooms} habitaciones y ${prop.bathrooms} baños en ${location}. ${price}. ${prop.built_area}m².${nearbyServices} Ver fotos y detalles.`;
    }
    seoData.h1 = prop.name;
    seoData.keywords = [
      `${propertyType.toLowerCase()} ${location.toLowerCase()}`,
      `${prop.bedrooms} habitaciones ${location.toLowerCase()}`,
      `comprar ${propertyType.toLowerCase()} ${location.toLowerCase()}`,
      'bienes raices republica dominicana'
    ];
    if (googlePlacesData) {
      const serviceKeywords = Object.keys(googlePlacesData.places_by_category).map((category)=>`cerca de ${category.replace('_', ' ')}`).slice(0, 3);
      seoData.keywords.push(...serviceKeywords);
    }
    seoData.structured_data = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      "name": prop.name,
      "description": seoData.description,
      "url": `https://clic.do/${prop.slug_url}`,
      "image": [
        prop.main_image_optimized?.url
      ].filter(Boolean),
      "offers": {
        "@type": "Offer",
        "price": pricing?.amount,
        "priceCurrency": pricing?.currency,
        "availability": type === 'property-not-available' ? "OutOfStock" : prop.property_status === 'Publicada' ? "InStock" : "OutOfStock"
      },
      "address": {
        "@type": "PostalAddress",
        "addressLocality": location,
        "addressCountry": "DO"
      },
      "floorSize": {
        "@type": "QuantitativeValue",
        "value": prop.built_area,
        "unitCode": "MTK"
      },
      "numberOfRooms": prop.bedrooms,
      "numberOfBathroomsTotal": prop.bathrooms
    };
    if (googlePlacesData && googlePlacesData.featured_places?.length > 0) {
      seoData.structured_data.nearbyPoints = googlePlacesData.featured_places.slice(0, 5).map((place)=>({
          "@type": "Place",
          "name": place.place_name,
          "description": place.place_category,
          "address": place.address
        }));
    }
  } else if (type === 'property-list') {
    const properties = searchResults?.properties || [];
    const count = searchResults?.pagination?.totalCount || properties.length;
    const location = extractLocationFromTags(tags) || 'República Dominicana';
    const propertyType = extractPropertyTypeFromTags(tags) || 'Propiedades';
    const operation = extractOperationFromTags(tags) || 'Venta';
    const displayPrices = properties.map((p)=>p.pricing_unified?.display_price?.amount).filter((p)=>p && p > 0).sort((a, b)=>a - b);
    const minPrice = displayPrices.length > 0 ? displayPrices[0] : null;
    const maxPrice = displayPrices.length > 0 ? displayPrices[displayPrices.length - 1] : null;
    let servicesInfo = '';
    if (googlePlacesData && googlePlacesData.stats.total_places > 0) {
      const topCategories = Object.keys(googlePlacesData.places_by_category).sort((a, b)=>googlePlacesData.places_by_category[b].length - googlePlacesData.places_by_category[a].length).slice(0, 3);
      const categoryNames = {
        'banks': 'bancos',
        'hospitals': 'centros médicos',
        'schools': 'colegios',
        'supermarkets': 'supermercados',
        'shopping_malls': 'centros comerciales',
        'restaurants': 'restaurantes'
      };
      const services = topCategories.map((cat)=>categoryNames[cat] || cat).join(', ');
      servicesInfo = ` Zona con excelentes servicios: ${services}.`;
    }
    seoData.title = `${propertyType} en ${operation} en ${location} | ${count} Disponibles | CLIC Inmobiliaria`;
    let priceInfo = '';
    if (minPrice && maxPrice) {
      if (minPrice === maxPrice) {
        priceInfo = `Precio: $${minPrice.toLocaleString()}`;
      } else {
        priceInfo = `Precios desde $${minPrice.toLocaleString()} hasta $${maxPrice.toLocaleString()}`;
      }
    }
    seoData.description = `Descubre ${count} ${propertyType.toLowerCase()} en ${operation.toLowerCase()} en ${location}. ${priceInfo}.${servicesInfo} ✅ Tours virtuales ✅ Financiamiento disponible`;
    seoData.h1 = `${propertyType} en ${operation} en ${location} - ${count} Propiedades Disponibles`;
    seoData.keywords = [
      `${propertyType.toLowerCase()} ${location.toLowerCase()}`,
      `${operation.toLowerCase()} ${propertyType.toLowerCase()} ${location.toLowerCase()}`,
      `bienes raices ${location.toLowerCase()}`,
      'inmobiliaria republica dominicana',
      'propiedades republica dominicana'
    ];
    seoData.structured_data = {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      "name": seoData.title,
      "description": seoData.description,
      "url": `https://clic.do/${urlSegments?.join('/') || ''}`,
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": count,
        "itemListElement": properties.slice(0, 10).map((prop, index)=>({
            "@type": "RealEstateListing",
            "position": index + 1,
            "name": prop.name,
            "url": `https://clic.do/${prop.slug_url}`,
            "offers": {
              "@type": "Offer",
              "price": prop.pricing_unified?.display_price?.amount,
              "priceCurrency": prop.pricing_unified?.display_price?.currency
            }
          }))
      }
    };
    if (googlePlacesData) {
      seoData.places_enrichment = {
        total_services: googlePlacesData.stats.total_places,
        services_score: googlePlacesData.stats.services_score,
        avg_rating: googlePlacesData.stats.avg_rating,
        top_categories: Object.keys(googlePlacesData.places_by_category),
        featured_services: googlePlacesData.featured_places.slice(0, 5)
      };
    }
  }
  seoData.og = {
    title: seoData.title,
    description: seoData.description,
    image: type === 'single-property' || type === 'single-property-project' || type === 'property-not-available' ? property.main_image_optimized?.url : searchResults?.properties?.[0]?.main_image_optimized?.url || 'https://clic.do/default-og-image.jpg',
    url: `https://clic.do/${urlSegments?.join('/') || ''}`,
    type: "website",
    site_name: "CLIC Inmobiliaria",
    locale: "es_DO"
  };
  seoData.twitter = {
    card: "summary_large_image",
    title: seoData.title,
    description: seoData.description,
    image: seoData.og.image,
    site: "@clicinmobiliaria"
  };
  seoData.technical = {
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1
    },
    sitemap: {
      lastModified: new Date().toISOString(),
      changeFreq: type === 'single-property' || type === 'single-property-project' || type === 'property-not-available' ? "weekly" : "daily",
      priority: type === 'single-property' || type === 'single-property-project' || type === 'property-not-available' ? 0.8 : 0.6
    }
  };
  return seoData;
}
// =====================================================
// ✨ FUNCIONES DE PROPIEDADES SIMILARES CORREGIDAS CON PAÍS
// =====================================================
async function getPropertyTags(supabaseClient, propertyId) {
  try {
    console.log('🏷️ Obteniendo tags de la propiedad:', propertyId);
    const { data: contentTags, error } = await supabaseClient.from('content_tags').select(`
        tag_id,
        weight,
        tags!inner(id, name, slug, category, display_name)
      `).eq('content_id', propertyId).eq('content_type', 'property').order('weight', {
      ascending: false
    });
    if (error) {
      console.error('❌ Error obteniendo tags de propiedad:', error);
      return [];
    }
    const tags = (contentTags || []).filter((ct)=>ct.tags).map((ct)=>({
        ...ct.tags,
        weight: ct.weight || 1
      }));
    console.log('✅ Tags de propiedad obtenidos:', {
      total: tags.length,
      byCategory: tags.reduce((acc, tag)=>{
        acc[tag.category] = (acc[tag.category] || 0) + 1;
        return acc;
      }, {}),
      topWeights: tags.slice(0, 5).map((t)=>`${t.category}:${t.name}(${t.weight})`)
    });
    return tags;
  } catch (error) {
    console.error('❌ Error en getPropertyTags:', error);
    return [];
  }
}
async function getSmartSimilarProperties(supabaseClient, propertyTags, excludeId, countryTagId = null) {
  console.log('🏠 === BUSCANDO PROPIEDADES SIMILARES CON PAÍS ===');
  console.log('📋 Exclude ID:', excludeId);
  console.log('📋 Tags disponibles:', propertyTags?.length || 0);
  console.log('🌍 Country Tag ID:', countryTagId);
  if (!propertyTags || propertyTags.length === 0) {
    console.log('⚠️ No hay tags de la propiedad, usando fallback con país');
    return await getFallbackSimilarProperties(supabaseClient, excludeId, countryTagId);
  }
  try {
    // ✅ INYECCIÓN AUTOMÁTICA DE PAÍS
    let finalTagIds = propertyTags.map((t)=>t.id);
    let countryInjected = false;
    if (countryTagId) {
      const hasCountryTag = await checkIfHasCountryTag(supabaseClient, finalTagIds);
      if (!hasCountryTag) {
        finalTagIds = [
          countryTagId,
          ...finalTagIds
        ];
        countryInjected = true;
        console.log('✅ Tag de país inyectado en propiedades similares:', countryTagId);
      }
    }
    console.log('🔍 Buscando propiedades que tengan estos tag IDs:', finalTagIds);
    const { data: propertyMatches, error } = await supabaseClient.from('content_tags').select(`
        content_id,
        tag_id,
        weight,
        tags(id, name, category)
      `).eq('content_type', 'property').in('tag_id', finalTagIds).neq('content_id', excludeId);
    if (error || !propertyMatches) {
      console.error('❌ Error buscando propiedades similares:', error);
      return await getFallbackSimilarProperties(supabaseClient, excludeId, countryTagId);
    }
    console.log('📊 Property matches encontrados:', propertyMatches.length);
    const propertyScores = {};
    const categoryWeights = {
      'pais': 10,
      'operacion': 5,
      'categoria': 4,
      'ciudad': 3,
      'sector': 3,
      'provincia': 2,
      'caracteristica': 1
    };
    propertyMatches.forEach((match)=>{
      const propertyId = match.content_id;
      const tagCategory = match.tags?.category || 'caracteristica';
      const categoryWeight = categoryWeights[tagCategory] || 1;
      const tagWeight = match.weight || 1;
      if (!propertyScores[propertyId]) {
        propertyScores[propertyId] = {
          property_id: propertyId,
          total_score: 0,
          matched_tags: 0,
          categories: new Set(),
          has_country_tag: false
        };
      }
      propertyScores[propertyId].total_score += categoryWeight * tagWeight;
      propertyScores[propertyId].matched_tags += 1;
      propertyScores[propertyId].categories.add(tagCategory);
      if (tagCategory === 'pais') {
        propertyScores[propertyId].has_country_tag = true;
      }
    });
    // ✅ NUEVA LÓGICA: FORZAR QUE TODAS TENGAN TAG DE PAÍS
    let validProperties;
    if (countryTagId) {
      // ✅ OPCIÓN ESTRICTA: Solo propiedades que DEFINITIVAMENTE tienen tag de país
      validProperties = Object.values(propertyScores).filter((prop)=>prop.has_country_tag && prop.matched_tags >= 1) // ✅ OBLIGATORIO tag de país
      .sort((a, b)=>b.total_score - a.total_score).slice(0, 6);
      console.log('🔒 Filtro estricto: solo propiedades CON tag de país:', validProperties.length);
      // Si no hay suficientes con tag de país, usar fallback específico
      if (validProperties.length < 3) {
        console.log('⚠️ Muy pocas propiedades con tag de país, usando fallback específico');
        return await getFallbackSimilarProperties(supabaseClient, excludeId, countryTagId);
      }
    } else {
      // Si no hay país detectado, usar lógica original (pero esto no debería pasar)
      console.warn('⚠️ No hay countryTagId - usando lógica sin filtro de país');
      validProperties = Object.values(propertyScores).filter((prop)=>prop.matched_tags >= 2).sort((a, b)=>b.total_score - a.total_score).slice(0, 6);
    }
    console.log('📊 Propiedades similares encontradas:', {
      totalMatches: Object.keys(propertyScores).length,
      withCountryTag: validProperties.filter((p)=>p.has_country_tag).length,
      finalSelected: validProperties.length,
      countryInjected: countryInjected,
      topScores: validProperties.slice(0, 3).map((p)=>`${p.matched_tags} tags, score: ${p.total_score}, country: ${p.has_country_tag}`)
    });
    const propertyIds = validProperties.map((p)=>p.property_id);
    return await getPropertiesDetails(supabaseClient, propertyIds);
  } catch (error) {
    console.error('❌ Error en getSmartSimilarProperties:', error);
    return await getFallbackSimilarProperties(supabaseClient, excludeId, countryTagId);
  }
}
async function getFallbackSimilarProperties(supabaseClient, excludeId, countryTagId = null) {
  console.log('🔄 Usando método fallback para propiedades similares CON PAÍS');
  try {
    // ✅ SIEMPRE intentar con país primero
    if (countryTagId) {
      console.log('🎯 Buscando propiedades del mismo país como fallback');
      // Buscar IDs de propiedades con el tag del país
      const { data: contentTags } = await supabaseClient.from('content_tags').select('content_id').eq('content_type', 'property').eq('tag_id', countryTagId).neq('content_id', excludeId);
      if (contentTags && contentTags.length > 0) {
        const propertyIds = contentTags.map((ct)=>ct.content_id);
        const { data: properties, error } = await supabaseClient.from('properties').select(`
            id, code, name, sale_price, rental_price, temp_rental_price,
            furnished_rental_price, sale_currency, rental_currency,
            bedrooms, bathrooms, parking_spots, built_area, land_area,
            main_image_url, gallery_images_url, is_project, slug_url,
            property_categories(name),
            cities(name, provinces(name)),
            sectors(name),
            property_images(url, title, description, is_main, sort_order)
          `).in('id', propertyIds).eq('availability', 1).eq('property_status', 'Publicada').order('created_at', {
          ascending: false
        }).limit(6);
        if (!error && properties && properties.length > 0) {
          console.log('✅ Propiedades fallback del país obtenidas:', properties.length);
          return properties.map(formatSimilarProperty);
        }
      }
    }
    // ❌ ELIMINAR ESTE FALLBACK O HACERLO MÁS ESTRICTO
    console.warn('⚠️ NO SE ENCONTRARON PROPIEDADES SIMILARES DEL MISMO PAÍS');
    // Opción 1: Retornar array vacío (más estricto)
    return [];
  // Opción 2: Solo si es absolutamente necesario, usar fallback con warning
  // console.warn('⚠️ ÚLTIMO RECURSO: Buscando propiedades SIN filtro de país');
  // ... resto del código fallback actual
  } catch (error) {
    console.error('❌ Error en getFallbackSimilarProperties:', error);
    return [];
  }
}
async function getPropertiesDetails(supabaseClient, propertyIds) {
  if (!propertyIds || propertyIds.length === 0) return [];
  console.log('📋 Obteniendo detalles de', propertyIds.length, 'propiedades similares');
  try {
    const { data: properties, error } = await supabaseClient.from('properties').select(`
        id, code, name, sale_price, rental_price, temp_rental_price,
        furnished_rental_price, sale_currency, rental_currency,
        bedrooms, bathrooms, parking_spots, built_area, land_area,
        main_image_url, gallery_images_url, is_project, slug_url,
        property_categories(name),
        cities(name, provinces(name)),
        sectors(name),
        property_images(url, title, description, is_main, sort_order)
      `).in('id', propertyIds).eq('availability', 1).eq('property_status', 'Publicada');
    if (error) {
      console.error('❌ Error obteniendo detalles de propiedades:', error);
      return [];
    }
    const orderedProperties = propertyIds.map((id)=>properties?.find((prop)=>prop.id === id)).filter(Boolean);
    console.log('✅ Propiedades similares obtenidas:', orderedProperties.length);
    return orderedProperties.map(formatSimilarProperty);
  } catch (error) {
    console.error('❌ Error en getPropertiesDetails:', error);
    return [];
  }
}
function formatSimilarProperty(property) {
  let price = 'Precio a consultar';
  if (property.sale_price) {
    price = `${property.sale_price.toLocaleString()} ${property.sale_currency || 'USD'}`;
  } else if (property.rental_price) {
    price = `${property.rental_price.toLocaleString()} ${property.rental_currency || 'USD'}/mes`;
  } else if (property.temp_rental_price) {
    price = `${property.temp_rental_price.toLocaleString()} ${property.temp_rental_currency || 'USD'}/noche`;
  } else if (property.furnished_rental_price) {
    price = `${property.furnished_rental_price.toLocaleString()} ${property.furnished_rental_currency || 'USD'}/mes`;
  }
  let mainImage = property.main_image_url;
  if (!mainImage && property.property_images && property.property_images.length > 0) {
    const mainImg = property.property_images.find((img)=>img.is_main);
    mainImage = mainImg ? mainImg.url : property.property_images[0].url;
  }
  if (!mainImage && property.gallery_images_url) {
    if (Array.isArray(property.gallery_images_url)) {
      mainImage = property.gallery_images_url[0];
    } else if (typeof property.gallery_images_url === 'string') {
      mainImage = property.gallery_images_url.split(',')[0]?.trim();
    }
  }
  const locationParts = [
    property.sectors?.name,
    property.cities?.name
  ].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(', ') : 'Ubicación no especificada';
  return {
    id: property.id,
    title: property.name,
    price: price,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.built_area || property.land_area,
    image: mainImage || '/images/placeholder-property.jpg',
    location: location,
    type: property.property_categories?.name,
    url: property.slug_url || `/propiedad/${property.id}`,
    is_project: property.is_project,
    parking_spots: property.parking_spots
  };
}
// =====================================================
// ✨ FUNCIONES DE ASESOR Y CONTENIDO CORREGIDAS
// =====================================================
async function getAgentProperties(supabaseClient, agentId, excludePropertyId = null, limit = 20) {
  if (!agentId) {
    console.log('⚠️ No se proporcionó agent_id');
    return [];
  }
  console.log('👤 === OBTENIENDO PROPIEDADES DEL ASESOR ===');
  try {
    let query = supabaseClient.from('properties').select(`
        id, code, name, sale_price, rental_price, temp_rental_price,
        furnished_rental_price, sale_currency, rental_currency,
        bedrooms, bathrooms, parking_spots, built_area, land_area,
        main_image_url, gallery_images_url, is_project, slug_url,
        property_categories(name),
        cities(name, provinces(name)),
        sectors(name),
        property_images(url, title, description, is_main, sort_order)
      `).eq('agent_id', agentId).eq('availability', 1).eq('property_status', 'Publicada').order('created_at', {
      ascending: false
    }).limit(limit);
    if (excludePropertyId) {
      query = query.neq('id', excludePropertyId);
    }
    const { data: properties, error } = await query;
    if (error) {
      console.error('❌ Error obteniendo propiedades del asesor:', error);
      return [];
    }
    if (!properties || properties.length === 0) {
      console.log('⚠️ No se encontraron propiedades para este asesor');
      return [];
    }
    console.log('✅ Propiedades del asesor obtenidas:', properties.length);
    return properties.map(formatSimilarProperty);
  } catch (error) {
    console.error('❌ Error en getAgentProperties:', error);
    return [];
  }
}
const agentCache = new Map();
async function getPropertyAgent(supabaseClient, agentId) {
  if (!agentId) return null;
  if (agentCache.has(agentId)) {
    return agentCache.get(agentId);
  }
  try {
    const { data: agent, error } = await supabaseClient.from('users').select(`
        id, external_id, first_name, last_name, email, phone, 
        position, slug, biography, facebook_url, instagram_url, 
        twitter_url, linkedin_url, youtube_url,
        active, show_on_website, user_type, team_id,
        profile_photo_url, years_experience, specialty_description, languages
      `).eq('id', agentId).single();
    if (error) {
      console.log('❌ Error obteniendo agente:', error.message);
      return null;
    }
    agentCache.set(agentId, agent);
    setTimeout(()=>agentCache.delete(agentId), 15 * 60 * 1000);
    return agent;
  } catch (error) {
    console.error('❌ Error crítico buscando agente:', error);
    return null;
  }
}
async function getReferralAgent(supabaseClient, externalId) {
  if (!externalId) return null;
  try {
    const { data: referralAgent, error } = await supabaseClient.from('users').select(`
        id, external_id, first_name, last_name, email, phone, 
        position, slug, biography, facebook_url, instagram_url, 
        twitter_url, linkedin_url, youtube_url,
        active, show_on_website, user_type, team_id,
        profile_photo_url, years_experience, specialty_description, languages
      `).eq('external_id', externalId).eq('active', true).single();
    if (error || !referralAgent) {
      console.log('⚠️ Usuario referido no encontrado:', externalId);
      return null;
    }
    return referralAgent;
  } catch (error) {
    console.error('❌ Error buscando usuario referido:', error);
    return null;
  }
}
function formatAgent(agent, type = 'agent') {
  if (!agent) return null;
  return {
    id: agent.id,
    name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
    email: agent.email,
    phone: agent.phone,
    position: agent.position || 'Asesor Inmobiliario',
    slug: agent.slug,
    biography: agent.biography,
    external_id: agent.external_id,
    profile_photo_url: agent.profile_photo_url,
    years_experience: agent.years_experience || 0,
    specialty_description: agent.specialty_description,
    languages: agent.languages,
    social: {
      facebook: agent.facebook_url,
      instagram: agent.instagram_url,
      twitter: agent.twitter_url,
      linkedin: agent.linkedin_url,
      youtube: agent.youtube_url
    },
    active: agent.active,
    show_on_website: agent.show_on_website,
    team_id: agent.team_id,
    user_type: agent.user_type,
    agent_type: type
  };
}
async function getArticlesStats(supabaseClient) {
  try {
    const { count, error } = await supabaseClient.from('articles').select('*', {
      count: 'exact',
      head: true
    }).eq('status', 'published');
    if (error) {
      console.error('❌ Error obteniendo stats de artículos:', error);
      return {
        total_articles: 200,
        last_updated: 'Contenido actualizado semanalmente'
      };
    }
    return {
      total_articles: count || 200,
      last_updated: 'Contenido actualizado semanalmente'
    };
  } catch (error) {
    console.error('❌ Error crítico en getArticlesStats:', error);
    return {
      total_articles: 200,
      last_updated: 'Contenido actualizado semanalmente'
    };
  }
}
async function getCompleteProjectDetails(supabaseClient, projectDetailId) {
  if (!projectDetailId) return null;
  try {
    const { data: projectData, error } = await supabaseClient.from('project_details').select(`
        *,
        developers(*),
        project_typologies(*),
        project_amenities(*, amenities(*)),
        project_payment_plans(*),
        project_phases(*),
        project_availability(*, project_typologies(*)),
        project_benefits(*, project_benefits_catalog(*)),
        project_documents(*, project_documents_catalog(*))
      `).eq('id', projectDetailId).single();
    if (error) {
      console.error('❌ Error obteniendo detalles del proyecto:', error);
      return null;
    }
    return projectData;
  } catch (error) {
    console.error('❌ Error crítico en getCompleteProjectDetails:', error);
    return null;
  }
}
async function getPropertySpecificContent(supabaseClient, propertyId) {
  try {
    const { data: relations, error } = await supabaseClient.from('content_property_relations').select('content_id, content_type, relation_type, weight').eq('property_id', propertyId).order('weight', {
      ascending: false
    });
    if (error || !relations || relations.length === 0) {
      return null;
    }
    const contentByType = relations.reduce((acc, rel)=>{
      if (!acc[rel.content_type]) acc[rel.content_type] = [];
      acc[rel.content_type].push(rel.content_id);
      return acc;
    }, {});
    const [articles, videos, testimonials, faqs] = await Promise.all([
      contentByType.article ? supabaseClient.from('articles').select(`
          id, title, slug, excerpt, content, featured_image,
          published_at, created_at, updated_at,
          meta_title, meta_description, read_time,
          views, featured, category, author_id,
          users!articles_author_id_fkey(
            first_name, last_name, profile_photo_url
          )
        `).in('id', contentByType.article).eq('status', 'published') : Promise.resolve({
        data: []
      }),
      contentByType.video ? supabaseClient.from('videos').select('*').in('id', contentByType.video).eq('status', 'published') : Promise.resolve({
        data: []
      }),
      contentByType.testimonial ? supabaseClient.from('testimonials').select('*').in('id', contentByType.testimonial).eq('status', 'published') : Promise.resolve({
        data: []
      }),
      contentByType.faq ? supabaseClient.from('faqs').select('*').in('id', contentByType.faq).eq('status', 'published') : Promise.resolve({
        data: []
      })
    ]);
    const processedArticles = articles.data ? articles.data.map((article)=>{
      const author = {
        name: article.users ? `${article.users.first_name || ''} ${article.users.last_name || ''}`.trim() || 'Equipo CLIC' : 'Equipo CLIC',
        avatar: article.users?.profile_photo_url || '/images/team/clic-experts.jpg'
      };
      return {
        ...article,
        featuredImage: article.featured_image,
        publishedAt: article.published_at,
        readTime: article.read_time ? `${article.read_time} min` : '8 min',
        author: author,
        category: article.category || 'Artículos',
        views: article.views || `${Math.floor(Math.random() * 5 + 1)}.${Math.floor(Math.random() * 9 + 1)}K`,
        featured: article.featured || false
      };
    }) : [];
    return {
      articles: processedArticles,
      videos: videos.data || [],
      testimonials: testimonials.data || [],
      faqs: faqs.data || [],
      has_specific_content: true
    };
  } catch (error) {
    console.error('❌ Error obteniendo contenido específico:', error);
    return null;
  }
}
async function getDefaultRelatedContent(supabaseClient, countryTagId = null) {
  try {
    // ✅ SIEMPRE intentar con país primero
    if (countryTagId) {
      console.log('🌍 Intentando obtener contenido por defecto CON PAÍS:', countryTagId);
      const countryContent = await getRelatedContent(supabaseClient, [], countryTagId, 20); // Más contenido
      // ✅ Criterio más permisivo pero aún del mismo país
      const hasMinimumContent = countryContent.articles.length >= 1 || countryContent.videos.length >= 1 || countryContent.faqs.length >= 2 || countryContent.testimonials.length >= 1;
      if (hasMinimumContent) {
        console.log('✅ Contenido del país encontrado para default');
        return {
          ...countryContent,
          content_source: 'country_default'
        };
      }
      console.log('⚠️ Contenido del país insuficiente, intentando con menos restricciones...');
      // ✅ Segundo intento: buscar contenido del país directamente en las tablas
      const [articles, videos, faqs, testimonials] = await Promise.all([
        getContentByCountryTag(supabaseClient, 'articles', countryTagId, 5),
        getContentByCountryTag(supabaseClient, 'videos', countryTagId, 4),
        getContentByCountryTag(supabaseClient, 'faqs', countryTagId, 6),
        getContentByCountryTag(supabaseClient, 'testimonials', countryTagId, 3)
      ]);
      const hasAnyCountryContent = articles.length > 0 || videos.length > 0 || faqs.length > 0 || testimonials.length > 0;
      if (hasAnyCountryContent) {
        console.log('✅ Contenido directo del país encontrado');
        return {
          articles,
          videos,
          testimonials,
          faqs,
          content_source: 'country_direct'
        };
      }
    }
    // ❌ ADVERTENCIA CLARA cuando usa contenido global
    console.warn('⚠️ NO SE ENCONTRÓ CONTENIDO DEL PAÍS - Usando contenido global como último recurso');
    // Mantener el fallback actual pero con warning claro
    const [articles, videos, faqs, testimonials] = await Promise.all([
      supabaseClient.from('articles').select(`...`).eq('status', 'published').order('published_at', {
        ascending: false
      }).limit(5),
      supabaseClient.from('videos').select('*').eq('status', 'published').order('published_at', {
        ascending: false
      }).limit(4),
      supabaseClient.from('faqs').select('*').eq('status', 'published').order('sort_order').limit(6),
      supabaseClient.from('testimonials').select('*').eq('status', 'published').order('published_at', {
        ascending: false
      }).limit(3)
    ]);
    return {
      articles: processArticles(articles.data || []),
      videos: videos.data || [],
      testimonials: testimonials.data || [],
      faqs: faqs.data || [],
      content_source: 'global_fallback_warning' // ✅ Marcar claramente que es fallback global
    };
  } catch (error) {
    console.error('❌ Error obteniendo contenido por defecto:', error);
    return {
      articles: [],
      videos: [],
      testimonials: [],
      faqs: [],
      content_source: 'error_fallback'
    };
  }
}
// ✅ Nueva función auxiliar para buscar contenido por país
async function getContentByCountryTag(supabaseClient, contentType, countryTagId, limit) {
  try {
    const { data: contentTags } = await supabaseClient.from('content_tags').select('content_id').eq('content_type', contentType).eq('tag_id', countryTagId);
    if (!contentTags || contentTags.length === 0) return [];
    const contentIds = contentTags.map((ct)=>ct.content_id);
    let query;
    switch(contentType){
      case 'articles':
        query = supabaseClient.from('articles').select(`
          id, title, slug, excerpt, content, featured_image,
          published_at, created_at, updated_at,
          meta_title, meta_description, read_time,
          views, featured, category, author_id,
          users!articles_author_id_fkey(
            first_name, last_name, profile_photo_url
          )
        `);
        break;
      case 'videos':
        query = supabaseClient.from('videos').select('*');
        break;
      case 'faqs':
        query = supabaseClient.from('faqs').select('*');
        break;
      case 'testimonials':
        query = supabaseClient.from('testimonials').select('*');
        break;
      default:
        return [];
    }
    const { data } = await query.in('id', contentIds).eq('status', 'published').limit(limit);
    return data || [];
  } catch (error) {
    console.error(`❌ Error obteniendo ${contentType} por país:`, error);
    return [];
  }
}
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
// =====================================================
// FUNCIONES AUXILIARES
// =====================================================
function parseUrlToSlugs(pathname) {
  const systemRoutes = [
    '/property-search',
    '/api',
    '/functions',
    '/_app',
    '/admin'
  ];
  if (systemRoutes.some((route)=>pathname.startsWith(route))) {
    return [];
  }
  return pathname.replace(/^\//, '').split('/').filter((segment)=>segment.length > 0).map((segment)=>segment.toLowerCase().trim());
}
async function findTagsBySlug(supabaseClient, slugs) {
  if (slugs.length === 0) return [];
  const { data: tags, error } = await supabaseClient.from('tags').select('id, name, slug, category, display_name').in('slug', slugs);
  if (error) {
    console.error('Error buscando tags:', error);
    return [];
  }
  return tags || [];
}
function extractLocationFromTags(tags) {
  const locationTag = tags?.find((tag)=>tag.category === 'ciudad' || tag.category === 'sector' || tag.category === 'provincia');
  return locationTag?.name || null;
}
function extractPropertyTypeFromTags(tags) {
  const typeTag = tags?.find((tag)=>tag.category === 'categoria');
  return typeTag?.name || null;
}
function extractOperationFromTags(tags) {
  const operationTag = tags?.find((tag)=>tag.category === 'operacion');
  return operationTag?.name || null;
}
async function generateSmartBreadcrumbs(supabaseClient, tags, urlSegments, context = 'listing') {
  const breadcrumbs = [];
  breadcrumbs.push({
    name: 'Inicio',
    slug: '',
    url: '/',
    category: 'root',
    is_active: false,
    position: 0
  });
  if (!tags || tags.length === 0) {
    return breadcrumbs;
  }
  const tagsByCategory = {
    operacion: tags.filter((t)=>t.category === 'operacion'),
    categoria: tags.filter((t)=>t.category === 'categoria'),
    ciudad: tags.filter((t)=>t.category === 'ciudad'),
    sector: tags.filter((t)=>t.category === 'sector'),
    provincia: tags.filter((t)=>t.category === 'provincia'),
    otros: tags.filter((t)=>![
        'operacion',
        'categoria',
        'ciudad',
        'sector',
        'provincia'
      ].includes(t.category))
  };
  const hierarchyOrder = [
    'operacion',
    'categoria',
    'ciudad',
    'sector'
  ];
  let currentPath = '';
  let position = 1;
  for (const categoryKey of hierarchyOrder){
    const categoryTags = tagsByCategory[categoryKey];
    if (categoryTags.length > 0) {
      const tag = categoryTags[0];
      currentPath = currentPath ? `${currentPath}/${tag.slug}` : tag.slug;
      breadcrumbs.push({
        name: tag.display_name || tag.name,
        slug: tag.slug,
        url: `/${currentPath}`,
        category: tag.category,
        is_active: false,
        position: position,
        tag_id: tag.id,
        description: tag.description,
        icon: tag.icon
      });
      position++;
    }
  }
  if (context === 'listing' && tagsByCategory.otros.length > 0) {
    const additionalTags = tagsByCategory.otros.filter((tag)=>urlSegments.includes(tag.slug)).slice(0, 2);
    for (const tag of additionalTags){
      currentPath = `${currentPath}/${tag.slug}`;
      breadcrumbs.push({
        name: tag.display_name || tag.name,
        slug: tag.slug,
        url: `/${currentPath}`,
        category: tag.category,
        is_active: false,
        position: position,
        tag_id: tag.id,
        description: tag.description,
        icon: tag.icon
      });
      position++;
    }
  }
  if (context === 'listing' && breadcrumbs.length > 1) {
    breadcrumbs[breadcrumbs.length - 1].is_active = true;
  }
  return breadcrumbs.filter((bc)=>bc.name && bc.name.trim().length > 0);
}
async function generatePropertyBreadcrumbs(supabaseClient, property) {
  try {
    const propertyTags = await getPropertyTags(supabaseClient, property.id);
    if (propertyTags.length === 0) {
      return await generateFallbackPropertyBreadcrumbs(property);
    }
    const breadcrumbs = await generateSmartBreadcrumbs(supabaseClient, propertyTags, [], 'single');
    const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
    const finalUrl = lastBreadcrumb ? `${lastBreadcrumb.url}/${property.slug_url || property.id}` : `/${property.slug_url || property.id}`;
    breadcrumbs.push({
      name: property.name,
      slug: property.slug_url || property.id,
      url: finalUrl,
      category: 'property',
      is_active: true,
      position: breadcrumbs.length,
      is_current_page: true
    });
    return breadcrumbs;
  } catch (error) {
    console.error('❌ Error generando breadcrumbs de propiedad:', error);
    return await generateFallbackPropertyBreadcrumbs(property);
  }
}
async function generateFallbackPropertyBreadcrumbs(property) {
  const breadcrumbs = [
    {
      name: 'Inicio',
      slug: '',
      url: '/',
      category: 'root',
      is_active: false,
      position: 0
    }
  ];
  if (property.property_categories?.name) {
    const categorySlug = property.property_categories.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    breadcrumbs.push({
      name: property.property_categories.name,
      slug: categorySlug,
      url: `/${categorySlug}`,
      category: 'categoria',
      is_active: false,
      position: 1
    });
  }
  if (property.cities?.name) {
    const citySlug = property.cities.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
    const previousUrl = breadcrumbs[breadcrumbs.length - 1].url;
    const cityUrl = previousUrl === '/' ? `/${citySlug}` : `${previousUrl}/${citySlug}`;
    breadcrumbs.push({
      name: property.cities.name,
      slug: citySlug,
      url: cityUrl,
      category: 'ciudad',
      is_active: false,
      position: breadcrumbs.length
    });
  }
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  const finalUrl = `${lastBreadcrumb.url}/${property.slug_url || property.id}`;
  breadcrumbs.push({
    name: property.name,
    slug: property.slug_url || property.id,
    url: finalUrl,
    category: 'property',
    is_active: true,
    position: breadcrumbs.length,
    is_current_page: true
  });
  return breadcrumbs;
}
// =====================================================
// FUNCIÓN PRINCIPAL MODIFICADA CON INYECCIÓN AUTOMÁTICA DE PAÍS
// =====================================================
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabase = createClient('https://pacewqgypevfgjmdsorz.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2V3cWd5cGV2ZmdqbWRzb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NjU4OTksImV4cCI6MjA2NDI0MTg5OX0.Qlg-UVy-sikr76GxYmTcfCz1EnAqPHxvFeLrdqnjuWs');
    const url = new URL(req.url);
    const pathname = url.pathname;
    const pathSegments = pathname.split('/').filter((segment)=>segment.length > 0);
    const busquedaIndex = pathSegments.findIndex((segment)=>segment === 'busqueda');
    let slug = '';
    if (busquedaIndex !== -1 && busquedaIndex < pathSegments.length - 1) {
      slug = pathSegments.slice(busquedaIndex + 1).join('/');
    } else {
      slug = url.searchParams.get('url') || url.searchParams.get('slug') || '';
    }
    const refParam = url.searchParams.get('ref');
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 32;
    if (!slug) {
      return new Response(JSON.stringify({
        error: 'Invalid URL format. Expected: /function-name/busqueda/your-slug-here',
        type: 'error',
        received_path: pathname
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('🔍 Iniciando búsqueda unificada:', {
      slug,
      refParam,
      page,
      limit
    });
    // 🌍 NUEVA FUNCIONALIDAD: DETECCIÓN DE PAÍS E IDIOMA
    const urlSegments = parseUrlToSlugs(slug);
    const languageDetection = detectLanguageFromUrl(urlSegments);
    const cleanUrlSegments = languageDetection.cleanedSegments;
    const detectedLanguage = languageDetection.language;
    const countryDetection = await detectCountryByDomainAndInjectTag(supabase, req.url);
    const detectedCountry = countryDetection.country;
    const countryTag = countryDetection.countryTag;
    console.log('🌍 Configuración detectada:', {
      country: detectedCountry.name,
      language: detectedLanguage,
      countryDetectionMethod: countryDetection.detectionMethod,
      languageFromUrl: languageDetection.detectedFromUrl,
      originalSegments: urlSegments,
      cleanedSegments: cleanUrlSegments,
      countryTagFound: !!countryTag
    });
    // Obtener usuario referido si existe
    let referralAgent = null;
    if (refParam) {
      referralAgent = await getReferralAgent(supabase, refParam);
    }
    // PASO 1: Intentar búsqueda por slug_url (propiedad individual)
    const propertyResult = await searchPropertyBySlugUrl(supabase, slug);
    // ✅ CASO 1: PROPIEDAD DISPONIBLE
    if (propertyResult.found && propertyResult.property && propertyResult.available) {
      console.log('✅ Encontrada como propiedad DISPONIBLE');
      const property = propertyResult.property;
      const optimizedProperty = optimizePropertyImages(unifyPropertyPricing(property));
      const coordinatesInfo = processPropertyCoordinates(property);
      const locationData = generateLocationData(property, coordinatesInfo);
      const agentProperties = property.agent_id ? await getAgentProperties(supabase, property.agent_id, property.id, 20) : [];
      const propertyTags = await getPropertyTags(supabase, property.id);
      const similarProperties = await getSmartSimilarProperties(supabase, propertyTags, property.id, countryTag?.id);
      // ✅ NUEVA LLAMADA CON INYECCIÓN AUTOMÁTICA DE PAÍS
      console.log('🏷️ Obteniendo contenido relacionado CON INYECCIÓN AUTOMÁTICA DE PAÍS...');
      const tagIds = propertyTags.map((tag)=>tag.id);
      const tagRelatedContent = await getRelatedContent(supabase, tagIds, countryTag?.id, 10);
      // ✅ GENERAR CARRUSELES DINÁMICOS TEMÁTICOS
      console.log('🎯 Generando carruseles dinámicos temáticos...');
      // ✅ GENERAR CARRUSELES DINÁMICOS TEMÁTICOS CON DEBUG
      console.log('🎯 Intentando generar carruseles dinámicos...');
      console.log('📋 tagIds disponibles:', tagIds);
      console.log('🌍 countryTag disponible:', countryTag?.id);
      const [specificContent, defaultContent, projectDetails, agentData, googlePlacesData, articlesStats] = await Promise.all([
        getPropertySpecificContent(supabase, property.id),
        getDefaultRelatedContent(supabase, countryTag?.id),
        property.is_project && property.project_detail_id ? getCompleteProjectDetails(supabase, property.project_detail_id) : Promise.resolve(null),
        property.agent_id ? getPropertyAgent(supabase, property.agent_id) : Promise.resolve(null),
        property.sectors?.name || property.cities?.name ? getLocationGooglePlacesData(supabase, property.sectors?.name || property.cities?.name) : Promise.resolve(null),
        getArticlesStats(supabase)
      ]);
      const enhancedContent = combineContentWithTagsHierarchy(specificContent, tagRelatedContent, defaultContent);
      const responseType = property.is_project ? 'single-property-project' : 'single-property';
      const seoData = generateSEOMetadata({
        type: responseType,
        property: optimizedProperty,
        urlSegments: [
          slug
        ],
        googlePlacesData
      });
      const response = {
        type: responseType,
        available: property.property_status === 'Publicada',
        property: optimizedProperty,
        location: locationData,
        relatedContent: {
          ...enhancedContent,
          articles_stats: articlesStats
        },
        projectDetails: projectDetails || null,
        agent: formatAgent(agentData, 'agent') || null,
        referralAgent: formatAgent(referralAgent, 'referral') || null,
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
        breadcrumbs: await generatePropertyBreadcrumbs(supabase, property),
        seo: seoData,
        // 🌍 NUEVA INFORMACIÓN DE PAÍS E IDIOMA
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
          tagRelatedContentUsed: tagRelatedContent ? Object.keys(tagRelatedContent).some((key)=>tagRelatedContent[key] && tagRelatedContent[key].length > 0) : false,
          coordinatesProcessed: true,
          coordinatesSource: coordinatesInfo.source,
          showExactLocation: coordinatesInfo.showExactLocation,
          hasExactCoordinates: coordinatesInfo.hasExactCoordinates,
          locationDataGenerated: true,
          // 🌍 NUEVOS METADATOS
          countryDetected: detectedCountry.name,
          languageDetected: detectedLanguage,
          countryTagInjected: tagRelatedContent.countryInjected || false,
          timestamp: new Date().toISOString()
        }
      };
      return new Response(JSON.stringify(response), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600'
        }
      });
    }
    // ✅ CASO 2: PROPIEDAD NO DISPONIBLE
    if (propertyResult.found && propertyResult.property && !propertyResult.available) {
      console.log('⚠️ Encontrada como propiedad NO DISPONIBLE');
      const property = propertyResult.property;
      const optimizedProperty = optimizePropertyImages(unifyPropertyPricing(property));
      const coordinatesInfo = processPropertyCoordinates(property);
      const locationData = generateLocationData(property, coordinatesInfo);
      const propertyTags = await getPropertyTags(supabase, property.id);
      // ✅ PROPIEDADES SIMILARES CON PAÍS PARA PROPIEDAD VENDIDA
      const similarProperties = await getSmartSimilarProperties(supabase, propertyTags, property.id, countryTag?.id);
      // ✅ CONTENIDO RELACIONADO CON PAÍS
      const tagIds = propertyTags.map((tag)=>tag.id);
      const tagRelatedContent = await getRelatedContent(supabase, tagIds, countryTag?.id, 10);
      const [specificContent, defaultContent, projectDetails, agentData, googlePlacesData, articlesStats] = await Promise.all([
        getPropertySpecificContent(supabase, property.id),
        getDefaultRelatedContent(supabase, countryTag?.id),
        property.is_project && property.project_detail_id ? getCompleteProjectDetails(supabase, property.project_detail_id) : Promise.resolve(null),
        property.agent_id ? getPropertyAgent(supabase, property.agent_id) : Promise.resolve(null),
        property.sectors?.name || property.cities?.name ? getLocationGooglePlacesData(supabase, property.sectors?.name || property.cities?.name) : Promise.resolve(null),
        getArticlesStats(supabase)
      ]);
      const enhancedContent = combineContentWithTagsHierarchy(specificContent, tagRelatedContent, defaultContent);
      enhancedContent.carousels = dynamicCarousels;
      const seoData = generateSEOMetadata({
        type: 'property-not-available',
        property: optimizedProperty,
        urlSegments: [
          slug
        ],
        googlePlacesData
      });
      const response = {
        type: 'property-not-available',
        available: false,
        soldStatus: propertyResult.soldStatus,
        property: optimizedProperty,
        location: locationData,
        relatedContent: {
          ...enhancedContent,
          articles_stats: articlesStats
        },
        projectDetails: projectDetails || null,
        agent: formatAgent(agentData, 'agent') || null,
        referralAgent: formatAgent(referralAgent, 'referral') || null,
        similarProperties: similarProperties,
        similarPropertiesDebug: {
          total_found: similarProperties.length,
          tags_used: propertyTags.length,
          search_method: propertyTags.length > 0 ? 'smart_tags' : 'fallback',
          filtered_by_country: !!countryTag
        },
        breadcrumbs: await generatePropertyBreadcrumbs(supabase, property),
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
          ...corsHeaders,
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=1800'
        }
      });
    }
    // PASO 2: Búsqueda por tags con inyección automática de país
    console.log('🔍 Procesando como listado por tags CON INYECCIÓN AUTOMÁTICA DE PAÍS');
    const tags = await findTagsBySlug(supabase, cleanUrlSegments);
    const tagIds = tags.map((t)=>t.id);
    let dynamicCarousels = [];
    try {
      dynamicCarousels = await generateDynamicThematicCarousels(supabase, tagIds, countryTag?.id, 8 // Máximo propiedades por carrusel
      );
      console.log(`📊 Carruseles dinámicos generados: ${dynamicCarousels.length}`);
    } catch (error) {
      console.error('❌ Error generando carruseles dinámicos:', error);
      dynamicCarousels = [];
    }
    console.log(`📊 Carruseles dinámicos generados: ${dynamicCarousels.length}`);
    // ✅ NUEVA LLAMADA CON INYECCIÓN AUTOMÁTICA DE PAÍS
    const searchResults = await searchPropertiesByTags(supabase, tagIds, countryTag?.id, page, limit);
    // Procesar propiedades con coordenadas
    const enrichedProperties = await Promise.all((searchResults.properties || []).map(async (property)=>{
      const optimizedProperty = optimizePropertyImages(unifyPropertyPricing(property));
      const coordinatesInfo = processPropertyCoordinates(property);
      const locationData = generateLocationData(property, coordinatesInfo);
      const [projectDetails, agentData] = await Promise.all([
        property.is_project && property.project_detail_id ? getCompleteProjectDetails(supabase, property.project_detail_id) : Promise.resolve(null),
        property.agent_id ? getPropertyAgent(supabase, property.agent_id) : Promise.resolve(null)
      ]);
      return {
        ...optimizedProperty,
        location: locationData,
        projectDetails: projectDetails || null,
        agent: formatAgent(agentData, 'agent') || null
      };
    }));
    // ✅ NUEVA LLAMADA CON INYECCIÓN AUTOMÁTICA DE PAÍS
    const tagRelatedContent = tagIds.length > 0 ? await getRelatedContent(supabase, tagIds, countryTag?.id, 10) : {
      articles: [],
      videos: [],
      testimonials: [],
      faqs: [],
      seo_content: [],
      countryInjected: false
    };
    const defaultContent = await getDefaultRelatedContent(supabase, countryTag?.id);
    const [googlePlacesData, articlesStats] = await Promise.all([
      extractLocationFromTags(tags) ? getLocationGooglePlacesData(supabase, extractLocationFromTags(tags)) : null,
      getArticlesStats(supabase)
    ]);
    const enhancedListingContent = combineContentWithTagsHierarchy(null, tagRelatedContent, defaultContent);
    enhancedListingContent.articles_stats = articlesStats;
    // ✅ AGREGAR CARRUSELES DINÁMICOS
    enhancedListingContent.carousels = dynamicCarousels;
    const seoData = generateSEOMetadata({
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
      relatedContent: {
        ...enhancedListingContent,
        articles_stats: articlesStats
      },
      referralAgent: formatAgent(referralAgent, 'referral') || null,
      breadcrumbs: await generateSmartBreadcrumbs(supabase, tags, cleanUrlSegments, 'listing'),
      seo: seoData,
      // 🌍 NUEVA INFORMACIÓN DE PAÍS E IDIOMA
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
        contentHierarchy: enhancedListingContent.hierarchy_info,
        contentSource: enhancedListingContent.content_source,
        tagRelatedContentUsed: tagRelatedContent ? Object.keys(tagRelatedContent).some((key)=>tagRelatedContent[key] && tagRelatedContent[key].length > 0) : false,
        tagCount: tagIds.length,
        propertiesWithCoordinates: enrichedProperties.filter((p)=>p.location?.coordinates).length,
        coordinatesProcessedForAll: true,
        // 🌍 NUEVOS METADATOS
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
        ...corsHeaders,
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
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
