// ============================================================================
// SEARCH TAGS HANDLER - Versión optimizada y balanceada
// ============================================================================
export async function getSearchTagsHandler({ supabase, countryTag, validatedTags, language, pathToAnalyze, trackingString }) {
  try {
    console.log('Search Tags Handler: Starting processing');
    if (!countryTag?.id) {
      throw new Error('Invalid countryTag structure');
    }
    // ============================================================================
    // PASO 1: Helper para localización
    // ============================================================================
    const getLocalizedField = (row, baseField)=>{
      if (language === 'en' && row[`${baseField}_en`]) return row[`${baseField}_en`];
      if (language === 'fr' && row[`${baseField}_fr`]) return row[`${baseField}_fr`];
      return row[baseField];
    };
    // ============================================================================
    // PASO 2: Obtener datos en paralelo
    // ============================================================================
    const [locationResult, amenitiesResult, otherTagsResult, categoryTagsResult, priceRangesResult] = await Promise.allSettled([
      supabase.rpc('get_location_hierarchy_with_counts', {
        target_country_tag_id: countryTag.id
      }),
      supabase.rpc('get_filterable_amenities_with_counts', {
        target_country_tag_id: countryTag.id
      }),
      supabase.from('tags').select(`
          id, slug, slug_en, slug_fr, category,
          display_name, display_name_en, display_name_fr,
          icon, sort_order
        `).in('category', [
        'operacion',
        'habitaciones',
        'banos',
        'parqueos',
        'area'
      ]).contains('country_tag_ids', [
        countryTag.country_tag_id
      ]).eq('active', true),
      supabase.rpc('get_category_tags_with_counts', {
        target_country_tag_id: countryTag.id
      }),
      supabase.from('price_ranges').select(`
          id, range_slug, range_slug_en, range_slug_fr,
          base_tag_id, operation_tag_id, operation, currency,
          display_label, display_label_en, display_label_fr,
          min_value, max_value, sort_order
        `).eq('country_tag_id', countryTag.id).eq('active', true).order('operation, currency, sort_order')
    ]);
    // Procesar resultados con manejo de errores
    const locationHierarchy = locationResult.status === 'fulfilled' ? locationResult.value.data : [];
    const filterableAmenities = amenitiesResult.status === 'fulfilled' ? amenitiesResult.value.data : [];
    const otherTags = otherTagsResult.status === 'fulfilled' ? otherTagsResult.value.data : [];
    const categoryTags = categoryTagsResult.status === 'fulfilled' ? categoryTagsResult.value.data : [];
    const priceRanges = priceRangesResult.status === 'fulfilled' ? priceRangesResult.value.data : [];
    // ============================================================================
    // PASO 3: Crear lookup maps (SOLO para extracción de URL - no se envían)
    // ============================================================================
    console.log('🔧 DEBUG: Datos para lookup maps:', {
      categoryTags: categoryTags?.length || 0,
      categoryOperacion: categoryTags?.filter((t)=>t.category === 'operacion').length || 0,
      otherTags: otherTags?.length || 0,
      otherOperacion: otherTags?.filter((t)=>t.category === 'operacion').length || 0,
      allOperacionTags: [
        ...categoryTags?.filter((t)=>t.category === 'operacion') || [],
        ...otherTags?.filter((t)=>t.category === 'operacion') || []
      ].map((t)=>({
          slug: t.slug,
          slug_en: t.slug_en,
          slug_fr: t.slug_fr
        }))
    });
    const lookupMaps = createLookupMaps(locationHierarchy, filterableAmenities, categoryTags, otherTags, priceRanges);
    console.log('🔧 DEBUG: Lookup map de operacion creado:', {
      size: lookupMaps.operacion.size,
      keys: Array.from(lookupMaps.operacion.keys())
    });
    // ============================================================================
    // PASO 4: Estructurar price ranges
    // ============================================================================
    const preciosEstructurados = structurePriceRanges(priceRanges, language, getLocalizedField);
    // ============================================================================
    // PASO 5: Procesar y agrupar tags (SOLO campos que usa el componente)
    // ============================================================================
    const groupedTags = {
      accion: processSimpleTags(categoryTags, 'operacion', language, getLocalizedField),
      tipo: processSimpleTags(categoryTags, 'categoria', language, getLocalizedField),
      provincia: processLocationTags(locationHierarchy, 'provincia', language, getLocalizedField),
      ciudad: processLocationTags(locationHierarchy, 'ciudad', language, getLocalizedField),
      sector: processLocationTags(locationHierarchy, 'sector', language, getLocalizedField),
      precio: preciosEstructurados,
      habitaciones: processSimpleTags(otherTags, 'habitaciones', language, getLocalizedField),
      banos: processSimpleTags(otherTags, 'banos', language, getLocalizedField),
      parqueos: processSimpleTags(otherTags, 'parqueos', language, getLocalizedField),
      area: processSimpleTags(otherTags, 'area', language, getLocalizedField),
      amenity: processAmenityTags(filterableAmenities, 'amenity', language, getLocalizedField),
      feature: processAmenityTags(filterableAmenities, 'feature', language, getLocalizedField),
      custom_list: processAmenityTags(filterableAmenities, 'custom-list', language, getLocalizedField)
    };
    // ============================================================================
    // PASO 6: Jerarquía de ubicación
    // ============================================================================
    const locationData = buildLocationHierarchy(locationHierarchy);
    // ============================================================================
    // PASO 7: Extraer filtros de URL
    // ============================================================================
    console.log('🔧 DEBUG: Extrayendo filtros de URL:', {
      pathToAnalyze,
      segments: pathToAnalyze.split('/').filter(Boolean)
    });
    const extractedFilters = extractFiltersFromURL(pathToAnalyze, lookupMaps, locationHierarchy);
    console.log('🔧 DEBUG: Filtros extraídos:', extractedFilters);
    // ============================================================================
    // PASO 8: Monedas disponibles
    // ============================================================================
    const currencies = determineCurrencies(preciosEstructurados, countryTag);
    // ============================================================================
    // PASO 9: Preselected con auto-complete
    // ============================================================================
    let preselected = {
      accion: extractedFilters.accion,
      tipo: extractedFilters.tipo || '',
      provincia: '',
      ciudad: extractedFilters.ubicacion || '',
      sector: extractedFilters.sector || '',
      precio: extractedFilters.precio || '',
      moneda: extractedFilters.moneda || currencies.default,
      habitaciones: extractedFilters.habitaciones || '',
      banos: extractedFilters.banos || '',
      parqueos: extractedFilters.parqueos || '',
      area: extractedFilters.area || '',
      caracteristicas: extractedFilters.caracteristicas || []
    };
    preselected = autoCompleteLocationHierarchy(preselected, locationHierarchy, language);
    console.log('Handler completed successfully');
    return {
      success: true,
      data: {
        tags: groupedTags,
        locationHierarchy: locationData,
        currencies,
        preselected
      }
    };
  } catch (error) {
    console.error('Error in getSearchTagsHandler:', error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred'
    };
  }
}
// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================
/**
 * Procesa tags simples - SOLO campos que usa MiniSearchBar
 * Usa: id, slug, display_name
 */ function processSimpleTags(tags, category, language, getLocalizedField) {
  return tags.filter((tag)=>tag.category === category).map((tag)=>({
      id: tag.tag_id,
      slug: getLocalizedField(tag, 'slug'),
      display_name: getLocalizedField(tag, 'display_name')
    })).sort((a, b)=>a.display_name.localeCompare(b.display_name));
}
/**
 * Procesa tags de ubicación - SOLO campos que usa MiniSearchBar
 * Usa: id, slug, display_name, parent_ids (CRÍTICO para sectores)
 */ function processLocationTags(locationHierarchy, category, language, getLocalizedField) {
  return locationHierarchy.filter((tag)=>tag.category === category).map((tag)=>({
      id: tag.tag_id,
      slug: getLocalizedField(tag, 'slug'),
      display_name: getLocalizedField(tag, 'display_name'),
      parent_ids: tag.parent_ids || [] // CRÍTICO: necesario para filtrar sectores
    })).sort((a, b)=>a.display_name.localeCompare(b.display_name));
}
/**
 * Procesa amenities/features - SOLO campos que usa MiniSearchBar
 * Usa: id, slug, display_name, priority, is_featured, icon
 */ function processAmenityTags(amenities, category, language, getLocalizedField) {
  return amenities.filter((tag)=>tag.category === category).map((tag)=>({
      id: tag.tag_id,
      slug: getLocalizedField(tag, 'slug'),
      display_name: getLocalizedField(tag, 'display_name'),
      priority: tag.priority || 999,
      is_featured: tag.is_featured || false,
      icon: tag.icon || 'fas fa-check-circle' // CRÍTICO: se usa en el grid
    })).sort((a, b)=>{
    if (a.is_featured !== b.is_featured) return b.is_featured - a.is_featured;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.display_name.localeCompare(b.display_name);
  });
}
/**
 * Estructura price ranges por operación y moneda
 * SOLO campos necesarios: id, slug, display_name, currency
 */ function structurePriceRanges(priceRanges, language, getLocalizedField) {
  const structured = {
    sale: {},
    rent: {}
  };
  priceRanges.forEach((range)=>{
    const operation = range.operation;
    const currency = range.currency;
    if (!structured[operation][currency]) {
      structured[operation][currency] = [];
    }
    structured[operation][currency].push({
      id: range.base_tag_id,
      slug: getLocalizedField(range, 'range_slug'),
      display_name: getLocalizedField(range, 'display_label'),
      currency: range.currency
    });
  });
  return structured;
}
/**
 * Construye jerarquía de ubicación (parent-child relationships)
 */ function buildLocationHierarchy(locationHierarchy) {
  const parentChildMap = {};
  locationHierarchy.forEach((tag)=>{
    if (tag.parent_ids?.length > 0) {
      tag.parent_ids.forEach((parentId)=>{
        if (!parentChildMap[parentId]) {
          parentChildMap[parentId] = [];
        }
        parentChildMap[parentId].push(tag.tag_id);
      });
    }
  });
  return {
    parentChildMap
  };
}
/**
 * Crea lookup maps SOLO para extracción de URL (uso interno)
 * Incluye TODOS los idiomas para reconocer URLs en cualquier idioma
 */ function createLookupMaps(locationHierarchy, amenities, categoryTags, otherTags, priceRanges) {
  const maps = {
    operacion: new Map(),
    categoria: new Map(),
    provincia: new Map(),
    ciudad: new Map(),
    sector: new Map(),
    precio: new Map(),
    area: new Map(),
    habitaciones: new Map(),
    banos: new Map(),
    parqueos: new Map(),
    caracteristicas: new Map()
  };
  const addAllLanguages = (map, tag)=>{
    map.set(tag.slug, tag);
    if (tag.slug_en) map.set(tag.slug_en, tag);
    if (tag.slug_fr) map.set(tag.slug_fr, tag);
  };
  locationHierarchy.forEach((tag)=>{
    if (tag.category === 'provincia') addAllLanguages(maps.provincia, tag);
    if (tag.category === 'ciudad') addAllLanguages(maps.ciudad, tag);
    if (tag.category === 'sector') addAllLanguages(maps.sector, tag);
  });
  // Buscar tags de operación en AMBOS arrays (categoryTags y otherTags)
  [
    ...categoryTags,
    ...otherTags
  ].forEach((tag)=>{
    if (tag.category === 'operacion') addAllLanguages(maps.operacion, tag);
    if (tag.category === 'categoria') addAllLanguages(maps.categoria, tag);
  });
  otherTags.forEach((tag)=>{
    if (tag.category === 'area') addAllLanguages(maps.area, tag);
    if (tag.category === 'habitaciones') addAllLanguages(maps.habitaciones, tag);
    if (tag.category === 'banos') addAllLanguages(maps.banos, tag);
    if (tag.category === 'parqueos') addAllLanguages(maps.parqueos, tag);
  });
  amenities.forEach((tag)=>{
    addAllLanguages(maps.caracteristicas, tag);
  });
  priceRanges.forEach((range)=>{
    const priceData = {
      slug_base: range.range_slug,
      currency: range.currency,
      operation: range.operation
    };
    maps.precio.set(range.range_slug, priceData);
    if (range.range_slug_en) maps.precio.set(range.range_slug_en, priceData);
    if (range.range_slug_fr) maps.precio.set(range.range_slug_fr, priceData);
  });
  return maps;
}
/**
 * Extrae filtros de URL usando lookup maps
 */ function extractFiltersFromURL(pathname, lookupMaps, locationHierarchy) {
  const segments = pathname.split('/').filter(Boolean);
  const filters = {
    accion: '',
    moneda: 'USD',
    ubicacion: '',
    sector: '',
    tipo: '',
    habitaciones: '',
    banos: '',
    parqueos: '',
    precio: '',
    area: '',
    caracteristicas: []
  };
  // Si no hay segmentos (homepage), retornar filtros vacíos
  if (segments.length === 0) {
    console.log('📍 Homepage detectada - sin filtros');
    return filters;
  }
  let startIndex = [
    'en',
    'fr'
  ].includes(segments[0]) ? 1 : 0;
  // Si solo hay prefijo de idioma, también retornar vacío
  if (segments.length === 1 && [
    'en',
    'fr'
  ].includes(segments[0])) {
    console.log('📍 Solo prefijo de idioma - sin filtros');
    return filters;
  }
  console.log('🔧 DEBUG extractFiltersFromURL:', {
    pathname,
    segments,
    startIndex,
    checking: segments[startIndex],
    operacionMapHasIt: lookupMaps.operacion.has(segments[startIndex])
  });
  if (segments.length > startIndex && lookupMaps.operacion.has(segments[startIndex])) {
    filters.accion = segments[startIndex];
    console.log('✅ Acción detectada:', filters.accion);
    startIndex++;
  } else if (segments.length > startIndex) {
    console.log('❌ NO detectada. Segmento:', segments[startIndex], 'Map keys:', Array.from(lookupMaps.operacion.keys()));
  }
  for(let i = startIndex; i < segments.length; i++){
    const segment = segments[i];
    if (lookupMaps.categoria.has(segment) && !filters.tipo) {
      filters.tipo = segment;
    } else if (lookupMaps.provincia.has(segment) && !filters.ubicacion) {
      filters.ubicacion = segment;
    } else if (lookupMaps.ciudad.has(segment) && !filters.ubicacion) {
      filters.ubicacion = segment;
    } else if (lookupMaps.sector.has(segment) && !filters.sector) {
      const sectorTag = lookupMaps.sector.get(segment);
      if (filters.ubicacion) {
        const ubicacionTag = lookupMaps.ciudad.get(filters.ubicacion) || lookupMaps.provincia.get(filters.ubicacion);
        if (ubicacionTag && sectorTag.parent_ids?.includes(ubicacionTag.tag_id)) {
          filters.sector = segment;
        }
      } else {
        filters.sector = segment;
      }
    } else if (lookupMaps.precio.has(segment) && !filters.precio) {
      const priceTag = lookupMaps.precio.get(segment);
      filters.precio = segment;
      filters.moneda = priceTag.currency;
    } else if (lookupMaps.habitaciones.has(segment)) {
      filters.habitaciones = segment;
    } else if (lookupMaps.banos.has(segment)) {
      filters.banos = segment;
    } else if (lookupMaps.parqueos.has(segment)) {
      filters.parqueos = segment;
    } else if (lookupMaps.area.has(segment)) {
      filters.area = segment;
    } else if (lookupMaps.caracteristicas.has(segment)) {
      filters.caracteristicas.push(segment);
    }
  }
  return filters;
}
/**
 * Determina monedas disponibles y default
 */ function determineCurrencies(preciosEstructurados, countryTag) {
  const todasLasMonedas = new Set();
  Object.values(preciosEstructurados).forEach((operationRanges)=>{
    Object.keys(operationRanges).forEach((currency)=>{
      todasLasMonedas.add(currency);
    });
  });
  const currencyPriority = [
    'USD',
    'DOP'
  ];
  const sortedCurrencies = [
    ...currencyPriority.filter((c)=>todasLasMonedas.has(c)),
    ...Array.from(todasLasMonedas).filter((c)=>!currencyPriority.includes(c))
  ];
  const available = sortedCurrencies.slice(0, 2);
  let defaultCurrency = available[0] || 'USD';
  if (available.includes('DOP') && countryTag.country_tag_id === 'e21da0f2-6f5a-4ae0-ac65-d98d00d770fd') {
    defaultCurrency = 'DOP';
  }
  return {
    available,
    default: defaultCurrency
  };
}
/**
 * Auto-completa jerarquía de ubicación
 */ function autoCompleteLocationHierarchy(preselected, locationHierarchy, language) {
  const updated = {
    ...preselected
  };
  const getSlugForLanguage = (tag)=>{
    if (language === 'en' && tag.slug_en) return tag.slug_en;
    if (language === 'fr' && tag.slug_fr) return tag.slug_fr;
    return tag.slug;
  };
  if (preselected.sector && !preselected.ciudad) {
    const sectorTag = locationHierarchy.find((tag)=>tag.category === 'sector' && (tag.slug === preselected.sector || tag.slug_en === preselected.sector || tag.slug_fr === preselected.sector));
    if (sectorTag?.parent_ids?.length > 0) {
      const parentCityTag = locationHierarchy.find((tag)=>tag.category === 'ciudad' && sectorTag.parent_ids.includes(tag.tag_id));
      if (parentCityTag) {
        updated.ciudad = getSlugForLanguage(parentCityTag);
      }
    }
  }
  if (updated.ciudad && !updated.provincia) {
    const cityTag = locationHierarchy.find((tag)=>tag.category === 'ciudad' && (tag.slug === updated.ciudad || tag.slug_en === updated.ciudad || tag.slug_fr === updated.ciudad));
    if (cityTag?.parent_ids?.length > 0) {
      const parentProvinceTag = locationHierarchy.find((tag)=>tag.category === 'provincia' && cityTag.parent_ids.includes(tag.tag_id));
      if (parentProvinceTag) {
        updated.provincia = getSlugForLanguage(parentProvinceTag);
      }
    }
  }
  return updated;
}
