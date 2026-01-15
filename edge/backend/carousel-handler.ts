// carousel-handler.ts - MÃ³dulo independiente para lÃ³gica de carruseles
import { getUIText } from './ui-texts.ts';
// ============================================================================
// FUNCIONES AUXILIARES PARA CARRUSELES
// ============================================================================
// Extraer solo los 4 pilares fundamentales
function extractCoreTags(userTagsDetails) {
  const corePillars = [
    'operacion',
    'categoria',
    'ciudad',
    'sector'
  ];
  const coreTags = {
    operacion: [],
    categoria: [],
    ciudad: [],
    sector: []
  };
  if (!userTagsDetails?.length) return coreTags;
  userTagsDetails.forEach((tag)=>{
    if (corePillars.includes(tag.category)) {
      coreTags[tag.category].push({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        slug_en: tag.slug_en,
        slug_fr: tag.slug_fr,
        display_name: tag.display_name,
        display_name_en: tag.display_name_en,
        display_name_fr: tag.display_name_fr,
        category: tag.category
      });
    }
  });
  return coreTags;
}
// ValidaciÃ³n contextual mejorada usando slugs espaÃ±oles
function validateContextualRequirements(requirements, coreTags, language) {
  if (!requirements) return true;
  try {
    const reqObj = typeof requirements === 'string' ? JSON.parse(requirements) : requirements;
    const { category = [], location = [], operation = [], match_type = 'any' } = reqObj;
    const checks = [];
    // Validar categorÃ­as usando slug espaÃ±ol
    if (category.length > 0) {
      const userCategories = coreTags.categoria.map((tag)=>tag.slug?.toLowerCase() || '').filter(Boolean);
      const categoryMatch = category.some((reqCat)=>userCategories.some((userCat)=>userCat === reqCat.toLowerCase() || userCat.includes(reqCat.toLowerCase()) || reqCat.toLowerCase().includes(userCat)));
      checks.push(categoryMatch);
      console.log(`Category check: ${categoryMatch} (required: ${category}, user: ${userCategories})`);
    }
    // Validar operaciones usando slug espaÃ±ol
    if (operation.length > 0) {
      const userOperations = coreTags.operacion.map((tag)=>tag.slug?.toLowerCase() || '').filter(Boolean);
      const operationMatch = operation.some((reqOp)=>userOperations.some((userOp)=>userOp === reqOp.toLowerCase() || userOp.includes(reqOp.toLowerCase()) || reqOp.toLowerCase().includes(userOp)));
      checks.push(operationMatch);
      console.log(`Operation check: ${operationMatch} (required: ${operation}, user: ${userOperations})`);
    }
    // Validar ubicaciones usando slug espaÃ±ol (ciudad + sector)
    if (location.length > 0) {
      const userLocations = [
        ...coreTags.ciudad.map((tag)=>tag.slug?.toLowerCase() || ''),
        ...coreTags.sector.map((tag)=>tag.slug?.toLowerCase() || '')
      ].filter(Boolean);
      const locationMatch = location.some((reqLoc)=>userLocations.some((userLoc)=>userLoc === reqLoc.toLowerCase() || userLoc.includes(reqLoc.toLowerCase()) || reqLoc.toLowerCase().includes(userLoc)));
      checks.push(locationMatch);
      console.log(`Location check: ${locationMatch} (required: ${location}, user: ${userLocations})`);
    }
    if (checks.length === 0) return true;
    const result = match_type === 'all' ? checks.every(Boolean) : checks.some(Boolean);
    console.log(`Final validation result: ${result} (match_type: ${match_type})`);
    return result;
  } catch (e) {
    console.warn('Error validating requirements:', e);
    return true;
  }
}
// Pre-filtrar grupos por contexto y pilares (NUEVA FUNCIÃ"N)
function getRelevantGroups(allGroups, userTagsDetails, coreTags, language) {
  const userPillarCount = Object.values(coreTags).reduce((count, pillar)=>count + (pillar.length > 0 ? 1 : 0), 0);
  console.log(`DEBUG: User has ${userPillarCount} pillars available`);
  // Solo grupos que pueden ejecutarse con los pilares disponibles
  const eligibleGroups = allGroups.filter((group)=>{
    // Debe tener min_pillars suficientes
    if (group.min_pillars && group.min_pillars > userPillarCount) {
      console.log(`Group "${group.name}" needs ${group.min_pillars} pillars, user has ${userPillarCount}`);
      return false;
    }
    // Y pasar validaciÃ³n contextual bÃ¡sica
    const isValid = validateContextualRequirements(group.requirements, coreTags, language);
    if (!isValid) {
      console.log(`Group "${group.name}" failed contextual validation`);
      return false;
    }
    console.log(`Group "${group.name}" is eligible (needs ${group.min_pillars || 1} pillars, has ${userPillarCount})`);
    return true;
  });
  // Ordenar por prioridad DENTRO del grupo elegible
  const sortedGroups = eligibleGroups.sort((a, b)=>a.priority - b.priority);
  console.log(`DEBUG: ${eligibleGroups.length}/${allGroups.length} groups are eligible after pre-filtering`);
  console.log(`DEBUG: Top eligible groups:`, sortedGroups.slice(0, 5).map((g)=>`${g.name} (priority: ${g.priority})`));
  return sortedGroups;
}
// Construir niveles de bÃºsqueda jerÃ¡rquica con degradaciÃ³n de derecha a izquierda
function buildSearchLevels(coreTags, countryTagId) {
  const levels = [];
  // Siempre incluir country tag como base
  const baseTagIds = countryTagId ? [
    countryTagId
  ] : [];
  // Extraer IDs de cada pilar
  const operacionIds = coreTags.operacion.map((t)=>t.id).filter(Boolean);
  const categoriaIds = coreTags.categoria.map((t)=>t.id).filter(Boolean);
  const ciudadIds = coreTags.ciudad.map((t)=>t.id).filter(Boolean);
  const sectorIds = coreTags.sector.map((t)=>t.id).filter(Boolean);
  // Nivel 1: Contexto completo (operacion + categoria + ciudad + sector + paÃ­s)
  if (operacionIds.length && categoriaIds.length && ciudadIds.length && sectorIds.length) {
    levels.push({
      name: 'full_context',
      tagIds: [
        ...baseTagIds,
        ...operacionIds,
        ...categoriaIds,
        ...ciudadIds,
        ...sectorIds
      ],
      priority: 1,
      contextInfo: {
        hasOperation: true,
        hasCategory: true,
        hasCity: true,
        hasSector: true,
        pillarsUsed: [
          'operacion',
          'categoria',
          'ciudad',
          'sector'
        ]
      }
    });
  }
  // Nivel 2: Sin sector (operacion + categoria + ciudad + paÃ­s)
  if (operacionIds.length && categoriaIds.length && ciudadIds.length) {
    levels.push({
      name: 'without_sector',
      tagIds: [
        ...baseTagIds,
        ...operacionIds,
        ...categoriaIds,
        ...ciudadIds
      ],
      priority: 2,
      contextInfo: {
        hasOperation: true,
        hasCategory: true,
        hasCity: true,
        hasSector: false,
        pillarsUsed: [
          'operacion',
          'categoria',
          'ciudad'
        ]
      }
    });
  }
  // Nivel 3: Sin ubicaciÃ³n (operacion + categoria + paÃ­s)
  if (operacionIds.length && categoriaIds.length) {
    levels.push({
      name: 'operation_category',
      tagIds: [
        ...baseTagIds,
        ...operacionIds,
        ...categoriaIds
      ],
      priority: 3,
      contextInfo: {
        hasOperation: true,
        hasCategory: true,
        hasCity: false,
        hasSector: false,
        pillarsUsed: [
          'operacion',
          'categoria'
        ]
      }
    });
  }
  // Nivel 4: Solo operaciÃ³n (operacion + paÃ­s) - IntenciÃ³n principal
  if (operacionIds.length) {
    levels.push({
      name: 'operation_only',
      tagIds: [
        ...baseTagIds,
        ...operacionIds
      ],
      priority: 4,
      contextInfo: {
        hasOperation: true,
        hasCategory: false,
        hasCity: false,
        hasSector: false,
        pillarsUsed: [
          'operacion'
        ]
      }
    });
  }
  console.log('Built search levels with context:', levels.map((l)=>({
      name: l.name,
      tagCount: l.tagIds.length,
      pillars: l.contextInfo.pillarsUsed
    })));
  return levels;
}
// Determinar contexto real basado en el nivel de degradaciÃ³n usado
function determineActualContext(coreTags, usedLevel) {
  // Crear contexto base con todos los tags originales
  const baseContext = {
    operacion: coreTags.operacion || [],
    categoria: coreTags.categoria || [],
    ciudad: coreTags.ciudad || [],
    sector: coreTags.sector || []
  };
  // Determinar quÃ© contexto usar basado en el nivel real empleado
  switch(usedLevel){
    case 'full_context':
      return {
        ...baseContext,
        contextLevel: 'full',
        hasFullLocation: true,
        hasCity: true,
        hasCategory: true,
        hasOperation: true
      };
    case 'without_sector':
      return {
        ...baseContext,
        sector: [],
        contextLevel: 'city',
        hasFullLocation: false,
        hasCity: true,
        hasCategory: true,
        hasOperation: true
      };
    case 'operation_category':
      return {
        ...baseContext,
        ciudad: [],
        sector: [],
        contextLevel: 'category',
        hasFullLocation: false,
        hasCity: false,
        hasCategory: true,
        hasOperation: true
      };
    case 'operation_only':
      return {
        ...baseContext,
        categoria: [],
        ciudad: [],
        sector: [],
        contextLevel: 'operation',
        hasFullLocation: false,
        hasCity: false,
        hasCategory: false,
        hasOperation: true
      };
    default:
      return {
        ...baseContext,
        contextLevel: 'full',
        hasFullLocation: true,
        hasCity: true,
        hasCategory: true,
        hasOperation: true
      };
  }
}
// Buscar propiedades por conteo de tags
async function findPropertiesWithTagCount(supabase, requiredTagIds, optionalTagIds, minTagMatches, limit) {
  if (!requiredTagIds.length || !optionalTagIds.length) return [];
  console.log(`Searching properties with: ${requiredTagIds.length} required tags, ${optionalTagIds.length} optional tags, min ${minTagMatches} matches`);
  const { data: results, error } = await supabase.rpc('find_properties_with_tag_count', {
    required_tag_ids: requiredTagIds,
    optional_tag_ids: optionalTagIds,
    min_tag_matches: minTagMatches,
    result_limit: limit
  });
  if (error) {
    console.error('Tag count search error:', error);
    return [];
  }
  console.log(`Found ${results?.length || 0} properties meeting tag count criteria`);
  return results || [];
}
// ============================================================================
// FUNCIONES SEO CONTEXTUALES CON MULTIIDIOMA
// ============================================================================
// Hash simple para consistencia en selecciÃ³n de templates
function hashCode(str) {
  let hash = 0;
  if (str.length === 0) return hash;
  for(let i = 0; i < str.length; i++){
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}
// Procesar contenido multiidioma
function processMultilingualContent(item, language, contentField = 'content') {
  let processed = {};
  if (!item) return processed;
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
  return processed;
}
// Obtener tÃ­tulo del grupo con soporte multiidioma
function getGroupTitle(group, language) {
  const groupContent = processMultilingualContent(group, language);
  if (groupContent.seo_title && groupContent.seo_title.trim()) {
    return groupContent.seo_title;
  }
  if (groupContent.name && groupContent.name.trim()) {
    return groupContent.name;
  }
  if (group.seo_title && group.seo_title.trim()) {
    return group.seo_title;
  }
  return group.name || getUIText('FEATURED_PROPERTIES', language);
}
// Pluralizar categorÃ­as
function pluralizeCategory(categoryName, language) {
  const plurals = {
    es: {
      'apartamento': 'Apartamentos',
      'casa': 'Casas',
      'villa': 'Villas',
      'penthouse': 'Penthouses',
      'terreno': 'Terrenos',
      'local-comercial': 'Locales Comerciales',
      'oficina': 'Oficinas'
    },
    en: {
      'apartamento': 'Apartments',
      'casa': 'Houses',
      'villa': 'Villas',
      'penthouse': 'Penthouses',
      'terreno': 'Land Plots',
      'local-comercial': 'Commercial Spaces',
      'oficina': 'Offices'
    },
    fr: {
      'apartamento': 'Appartements',
      'casa': 'Maisons',
      'villa': 'Villas',
      'penthouse': 'Penthouses',
      'terreno': 'Terrains',
      'local-comercial': 'Locaux Commerciaux',
      'oficina': 'Bureaux'
    }
  };
  return plurals[language]?.[categoryName] || categoryName;
}
// Construir contexto de ubicaciÃ³n desde el contexto actual
function buildLocationContextFromActual(actualContext, language) {
  if (actualContext.hasSector && actualContext.sector.length > 0) {
    const sectorName = actualContext.sector[0].display_name || actualContext.sector[0].name;
    return `${getUIText('LOCATION_IN', language)} ${sectorName}`;
  }
  if (actualContext.hasCity && actualContext.ciudad.length > 0) {
    const cityName = actualContext.ciudad[0].display_name || actualContext.ciudad[0].name;
    return `${getUIText('LOCATION_IN', language)} ${cityName}`;
  }
  return null;
}
// Construir contexto de categorÃ­a desde el contexto actual
function buildCategoryOperationContextFromActual(actualContext, language) {
  if (!actualContext.hasCategory || actualContext.categoria.length === 0) return null;
  const categoryTag = actualContext.categoria[0];
  // Usar display_name traducido segÃºn idioma
  const categoryName = language === 'en' && categoryTag.display_name_en ? categoryTag.display_name_en : language === 'fr' && categoryTag.display_name_fr ? categoryTag.display_name_fr : categoryTag.display_name || categoryTag.name;
  return pluralizeCategory(categoryName, language);
}
// Construir contexto solo de operaciÃ³n para mÃ¡xima generalizaciÃ³n
function buildOperationOnlyContext(actualContext, language) {
  if (actualContext.operacion.length === 0) {
    return getUIText('PROPERTIES', language);
  }
  const operationName = actualContext.operacion[0].name;
  if (operationName.toLowerCase().includes('venta') || operationName.toLowerCase().includes('comprar')) {
    return getUIText('PROPERTIES_FOR_SALE', language);
  } else if (operationName.toLowerCase().includes('alquiler') || operationName.toLowerCase().includes('renta')) {
    return getUIText('PROPERTIES_FOR_RENT', language);
  }
  return getUIText('PROPERTIES', language);
}
// Agregar prefijo de descubrimiento de forma más natural
function addDiscoveryPrefix(title, language, contextLevel, groupId) {
  const prefixTemplates = {
    es: {
      full_context: [
        'Descubre',
        'Explora nuestros',
        'Encuentra'
      ],
      city: [
        'Descubre',
        'Explora',
        'Ve nuestros'
      ],
      category: [
        'Mira nuestros',
        'Descubre',
        'Encuentra'
      ],
      operation: [
        'Explora',
        'Descubre'
      ]
    },
    en: {
      full_context: [
        'Discover',
        'Explore Our',
        'Find'
      ],
      city: [
        'Discover',
        'Explore',
        'See Our'
      ],
      category: [
        'Browse Our',
        'Discover',
        'Find'
      ],
      operation: [
        'Explore',
        'Discover'
      ]
    },
    fr: {
      full_context: [
        'Découvrez',
        'Explorez nos',
        'Trouvez'
      ],
      city: [
        'Découvrez',
        'Explorez',
        'Voir nos'
      ],
      category: [
        'Parcourez nos',
        'Découvrez',
        'Trouvez'
      ],
      operation: [
        'Explorez',
        'Découvrez'
      ]
    }
  };
  const templates = prefixTemplates[language] || prefixTemplates.es;
  const availablePrefixes = templates[contextLevel] || templates.full_context;
  const selectedPrefix = availablePrefixes[Math.abs(hashCode(groupId)) % availablePrefixes.length];
  // Aplicar prefijo de forma natural según el idioma
  if (language === 'es') {
    if (selectedPrefix === 'Descubre' || selectedPrefix === 'Encuentra') {
      return `${selectedPrefix} ${title}`;
    } else {
      return `${selectedPrefix} ${title}`;
    }
  } else if (language === 'en') {
    if (selectedPrefix.includes('Our')) {
      return `${selectedPrefix} ${title}`;
    } else {
      return `${selectedPrefix} ${title}`;
    }
  } else if (language === 'fr') {
    if (selectedPrefix.includes('nos')) {
      return `${selectedPrefix} ${title}`;
    } else {
      return `${selectedPrefix} ${title}`;
    }
  }
  return `${selectedPrefix} ${title}`;
}
// Generar tÃ­tulo contextual del carrusel basado en el contexto REAL usado
function buildContextualCarouselTitle(group, actualContext, language) {
  const locationContext = buildLocationContextFromActual(actualContext, language);
  const categoryContext = buildCategoryOperationContextFromActual(actualContext, language);
  const baseTitle = getGroupTitle(group, language);
  let contextualTitle = '';
  if (actualContext.contextLevel === 'full' && categoryContext && locationContext) {
    contextualTitle = `${categoryContext} ${baseTitle} ${locationContext}`;
  } else if (actualContext.contextLevel === 'city' && categoryContext && locationContext) {
    contextualTitle = `${categoryContext} ${baseTitle} ${locationContext}`;
  } else if (actualContext.contextLevel === 'category' && categoryContext) {
    contextualTitle = `${categoryContext} ${baseTitle}`;
  } else if (actualContext.contextLevel === 'operation') {
    const operationContext = buildOperationOnlyContext(actualContext, language);
    contextualTitle = `${operationContext} ${baseTitle}`;
  } else if (categoryContext) {
    contextualTitle = `${categoryContext} ${baseTitle}`;
  } else {
    contextualTitle = baseTitle;
  }
  // Agregar prefijo de descubrimiento
  const finalTitle = addDiscoveryPrefix(contextualTitle, language, actualContext.contextLevel, group.id);
  console.log(`Contextual title built for level ${actualContext.contextLevel}: "${finalTitle}"`);
  return finalTitle;
}
// Templates para "Ver todos"
function getViewAllTemplates(language) {
  const templates = {
    es: [
      getUIText('VIEW_COMPLETE_LISTING', language),
      getUIText('SEE_SELECTION', language),
      getUIText('DISCOVER_COMPLETE_SELECTION', language),
      getUIText('EXPLORE_CATALOG', language),
      getUIText('BROWSE_COLLECTION', language),
      getUIText('FIND_MORE', language)
    ],
    en: [
      getUIText('VIEW_COMPLETE_LISTING', language),
      getUIText('SEE_SELECTION', language),
      getUIText('DISCOVER_COMPLETE_SELECTION', language),
      getUIText('EXPLORE_CATALOG', language),
      getUIText('BROWSE_COLLECTION', language),
      getUIText('FIND_MORE', language)
    ],
    fr: [
      getUIText('VIEW_COMPLETE_LISTING', language),
      getUIText('SEE_SELECTION', language),
      getUIText('DISCOVER_COMPLETE_SELECTION', language),
      getUIText('EXPLORE_CATALOG', language),
      getUIText('BROWSE_COLLECTION', language),
      getUIText('FIND_MORE', language)
    ]
  };
  return templates[language] || templates.es;
}
// Generar CTAs variados para "Ver todos" basado en contexto real
function buildVariedViewAllCTA(group, actualContext, language, totalProperties = 0) {
  const templates = getViewAllTemplates(language);
  const templateIndex = Math.abs(hashCode(group.id)) % templates.length;
  const selectedTemplate = templates[templateIndex];
  const groupTitle = getGroupTitle(group, language).toLowerCase();
  const locationContext = buildLocationContextFromActual(actualContext, language);
  const categoryContext = buildCategoryOperationContextFromActual(actualContext, language);
  let cta = '';
  if (actualContext.contextLevel === 'full' && locationContext && categoryContext) {
    cta = `${selectedTemplate} ${groupTitle} ${locationContext}`;
  } else if (actualContext.contextLevel === 'city' && locationContext && categoryContext) {
    cta = `${selectedTemplate} ${groupTitle} ${locationContext}`;
  } else if (actualContext.contextLevel === 'category' && categoryContext) {
    cta = `${selectedTemplate} ${groupTitle}`;
  } else if (actualContext.contextLevel === 'operation') {
    const operationContext = buildOperationOnlyContext(actualContext, language);
    cta = `${selectedTemplate} ${groupTitle}`;
  } else {
    cta = `${selectedTemplate} ${groupTitle}`;
  }
  cta = cta.replace(/\s+/g, ' ').trim();
  if (totalProperties > 20) {
    const moreText = `(${totalProperties - 20}+ ${getUIText('MORE_PROPERTIES', language)})`;
    cta += ` ${moreText}`;
  }
  console.log(`View All CTA for level ${actualContext.contextLevel}: "${cta}"`);
  return cta;
}
// Generar descripciÃ³n contextual basada en el contexto real
function buildContextualDescription(group, actualContext, language) {
  const groupContent = processMultilingualContent(group, language);
  let baseDescription = '';
  if (groupContent.seo_description) {
    baseDescription = groupContent.seo_description;
  } else if (groupContent.description) {
    baseDescription = groupContent.description;
  } else if (group.seo_description) {
    baseDescription = group.seo_description;
  } else if (group.description) {
    baseDescription = group.description;
  }
  console.log(`SEO Description for ${group.name} (${language}):`, baseDescription);
  if (baseDescription && baseDescription.trim()) {
    return baseDescription;
  }
  // Generar descripciÃ³n automÃ¡tica contextual usando getUIText
  const groupTitle = getGroupTitle(group, language);
  const locationContext = buildLocationContextFromActual(actualContext, language);
  const categoryContext = buildCategoryOperationContextFromActual(actualContext, language);
  if (actualContext.contextLevel === 'full' && categoryContext && locationContext) {
    return `${getUIText('DISCOVER', language)} ${groupTitle.toLowerCase()} ${locationContext}. ${getUIText('HANDPICKED_SELECTION', language)}.`;
  } else if (actualContext.contextLevel === 'city' && categoryContext && locationContext) {
    return `${getUIText('EXPLORE', language)} ${groupTitle.toLowerCase()} ${locationContext}. ${getUIText('CURATED_COLLECTION', language)}.`;
  } else if (actualContext.contextLevel === 'category' && categoryContext) {
    return `${getUIText('FIND', language)} ${groupTitle.toLowerCase()} ${categoryContext.toLowerCase()}. ${getUIText('DIVERSE_OPTIONS', language)}.`;
  } else {
    return `${getUIText('DISCOVER', language)} ${groupTitle.toLowerCase()}. ${getUIText('QUALITY_PORTFOLIO', language)}.`;
  }
}
// FunciÃ³n principal que integra todo con contexto real
function buildCarouselSEO(group, coreTags, language, totalProperties, usedLevel) {
  const actualContext = determineActualContext(coreTags, usedLevel);
  const title = buildContextualCarouselTitle(group, actualContext, language);
  const viewAllCTA = buildVariedViewAllCTA(group, actualContext, language, totalProperties);
  const description = buildContextualDescription(group, actualContext, language);
  console.log(`Building SEO for ${group.name} with level ${usedLevel}:`);
  console.log(`- Context level: ${actualContext.contextLevel}`);
  console.log(`- Has location: ${actualContext.hasCity || actualContext.hasSector}`);
  console.log(`- Has category: ${actualContext.hasCategory}`);
  console.log(`- Title: "${title}"`);
  return {
    title,
    description,
    viewAllCTA,
    contextInfo: {
      usedLevel: usedLevel,
      contextLevel: actualContext.contextLevel,
      hasFullLocation: actualContext.hasFullLocation,
      hasCity: actualContext.hasCity,
      hasCategory: actualContext.hasCategory,
      hasOperation: actualContext.hasOperation,
      pillarsUsed: actualContext.contextLevel === 'full' ? 4 : actualContext.contextLevel === 'city' ? 3 : actualContext.contextLevel === 'category' ? 2 : 1,
      templateUsed: Math.abs(hashCode(group.id)) % getViewAllTemplates(language).length
    }
  };
}
// ============================================================================
// FUNCIONES AUXILIARES ADICIONALES NECESARIAS PARA PROCESAR PROPIEDADES
// ============================================================================
function safeArray(input, defaultValue = []) {
  return Array.isArray(input) ? input : defaultValue;
}
function getCategoryName(category, language) {
  if (!category) return '';
  if (language === 'en' && category.name_en) return category.name_en;
  if (language === 'fr' && category.name_fr) return category.name_fr;
  return category.name || '';
}
function getTagDisplayName(tag, language) {
  if (!tag) return null;
  if (language === 'en' && tag.display_name_en) return tag.display_name_en;
  if (language === 'fr' && tag.display_name_fr) return tag.display_name_fr;
  return tag.display_name || tag.name;
}
function getAmenityName(amenity, language) {
  if (!amenity) return '';
  if (language === 'en' && amenity.name_en) return amenity.name_en;
  if (language === 'fr' && amenity.name_fr) return amenity.name_fr;
  return amenity.name || '';
}
function processGalleryImages(galleryImagesUrl) {
  let galleryImages = [];
  if (!galleryImagesUrl) return galleryImages;
  if (Array.isArray(galleryImagesUrl)) {
    galleryImages = galleryImagesUrl.filter((img)=>img && typeof img === 'string' && img.trim() !== '');
  } else if (typeof galleryImagesUrl === 'string') {
    galleryImages = galleryImagesUrl.split(',').map((img)=>img.trim()).filter((img)=>img.length > 0);
  } else {
    try {
      const parsed = JSON.parse(galleryImagesUrl);
      if (Array.isArray(parsed)) {
        galleryImages = parsed.filter((img)=>img && typeof img === 'string' && img.trim() !== '');
      }
    } catch (e) {
      galleryImages = [];
    }
  }
  return galleryImages;
}
function buildFinalImagesArray(mainImageUrl, galleryImages) {
  const fallbackImage = 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Sin+Imagen';
  const mainImage = mainImageUrl?.trim() || fallbackImage;
  const safeGalleryImages = safeArray(galleryImages);
  const finalImages = [
    mainImage,
    ...safeGalleryImages.filter((img)=>img !== mainImage)
  ];
  return {
    mainImage,
    finalImages
  };
}
function getSmartAmenityBadges(propertyId, propertyAmenitiesMap, prop, userTags, language) {
  const badges = [];
  const safeUserTags = safeArray(userTags);
  const propertyAmenities = propertyAmenitiesMap.get(propertyId) || [];
  const priorityAmenities = [
    'piscina',
    'pool',
    'alberca',
    'gym',
    'gimnasio',
    'fitness',
    'seguridad',
    'security',
    'vigilancia',
    'área social',
    'social area',
    'salon',
    'elevador',
    'elevator',
    'ascensor',
    'parqueo',
    'parking',
    'garaje'
  ];
  // Buscar amenidades prioritarias
  for (const amenity of propertyAmenities){
    if (badges.length >= 2) break;
    const amenityName = getAmenityName(amenity, language).toLowerCase();
    const isHighPriority = priorityAmenities.some((priority)=>amenityName.includes(priority.toLowerCase()) || amenity.category === 'Seguridad' || amenity.category === 'Deporte' || amenity.category === 'Entretenimiento');
    if (isHighPriority) {
      badges.push({
        text: getAmenityName(amenity, language),
        icon: amenity.icon,
        category: amenity.category
      });
    }
  }
  // Agregar otras amenidades si hay espacio
  if (badges.length < 2) {
    for (const amenity of propertyAmenities){
      if (badges.length >= 2) break;
      const amenityText = getAmenityName(amenity, language);
      if (!badges.some((badge)=>badge.text === amenityText)) {
        badges.push({
          text: amenityText,
          icon: amenity.icon,
          category: amenity.category
        });
      }
    }
  }
  // FALLBACK: Si no hay amenidades, usar caracterÃ­sticas inteligentes
  if (badges.length === 0) {
    const hasOperation = safeUserTags.some((tag)=>tag.category === 'operacion');
    const hasCategory = safeUserTags.some((tag)=>tag.category === 'categoria');
    if (!hasOperation && hasCategory) {
      if (prop.sale_price) {
        badges.push({
          text: getUIText('FOR_SALE', language),
          icon: 'fas fa-tag',
          category: 'Operación'
        });
      } else if (prop.rental_price) {
        badges.push({
          text: getUIText('FOR_RENT', language),
          icon: 'fas fa-home',
          category: 'Operación'
        });
      }
    } else if (hasOperation && !hasCategory) {
      badges.push({
        text: prop.category_name || getUIText('PROPERTY', language),
        icon: 'fas fa-building',
        category: 'Tipo'
      });
    } else {
      if (prop.is_project) {
        badges.push({
          text: getUIText('PROJECT', language),
          icon: 'fas fa-hammer',
          category: 'Tipo'
        });
      } else if (prop.furnished_rental_price) {
        badges.push({
          text: getUIText('FURNISHED', language),
          icon: 'fas fa-couch',
          category: 'Característica'
        });
      } else if (prop.temp_rental_price) {
        badges.push({
          text: getUIText('SHORT_TERM', language),
          icon: 'fas fa-calendar',
          category: 'Característica'
        });
      } else {
        badges.push({
          text: prop.category_name || getUIText('PROPERTY', language),
          icon: 'fas fa-building',
          category: 'Tipo'
        });
      }
    }
  }
  return badges.slice(0, 2);
}
function formatPropertyPrice(property, language) {
  if (!property) return getUIText('PRICE_ON_CONSULTATION', language);
  let formattedPrice = getUIText('PRICE_ON_CONSULTATION', language);
  if (property.sale_price && property.sale_currency) {
    formattedPrice = formatPrice(property.sale_price, property.sale_currency, 'sale', language);
  } else if (property.rental_price && property.rental_currency) {
    formattedPrice = formatPrice(property.rental_price, property.rental_currency, 'rental', language);
  } else if (property.temp_rental_price && property.temp_rental_currency) {
    formattedPrice = formatPrice(property.temp_rental_price, property.temp_rental_currency, 'temp_rental', language);
  } else if (property.furnished_rental_price && property.furnished_rental_currency) {
    formattedPrice = formatPrice(property.furnished_rental_price, property.furnished_rental_currency, 'furnished_rental', language);
  }
  return formattedPrice;
}
// Agregar formatPrice function (importada desde ui-texts.ts pero necesaria aquí)
function formatPrice(price, currency, type = 'sale', language = 'es') {
  if (!price || !currency) {
    return getUIText('PRICE_ON_CONSULTATION', language);
  }
  const currencySymbol = currency === 'USD' ? 'USD$' : 'RD$';
  const formattedAmount = `${currencySymbol}${price.toLocaleString()}`;
  if (type === 'rental' || type === 'furnished_rental') {
    return `${formattedAmount}${getUIText('MONTHLY_RENT', language)}`;
  } else if (type === 'temp_rental') {
    return `${formattedAmount}${getUIText('NIGHTLY_RATE', language)}`;
  }
  return formattedAmount;
}
// ============================================================================
// FUNCIONES DE DATOS RELACIONADOS Y PROCESAMIENTO DE PROPIEDADES
// ============================================================================
async function fetchRelatedData(supabase, propertyIds, categoryIds, sectorIds, cityIds) {
  const safePropertyIds = safeArray(propertyIds);
  const safeCategoryIds = safeArray(categoryIds);
  const safeSectorIds = safeArray(sectorIds);
  const safeCityIds = safeArray(cityIds);
  const [sectorsData, citiesData, categoriesData, amenitiesData] = await Promise.all([
    safeSectorIds.length > 0 ? supabase.from('sectors').select('id, name').in('id', safeSectorIds) : Promise.resolve({
      data: []
    }),
    safeCityIds.length > 0 ? supabase.from('cities').select('id, name').in('id', safeCityIds) : Promise.resolve({
      data: []
    }),
    safeCategoryIds.length > 0 ? supabase.from('property_categories').select('id, name, name_en, name_fr').in('id', safeCategoryIds) : Promise.resolve({
      data: []
    }),
    safePropertyIds.length > 0 ? supabase.from('property_amenities').select(`
        property_id,
        amenities(id, name, name_en, name_fr, icon, category, active)
      `).in('property_id', safePropertyIds) : Promise.resolve({
      data: []
    })
  ]);
  return {
    sectorsData,
    citiesData,
    categoriesData,
    amenitiesData
  };
}
async function processProperties(propertiesData, relatedData, validatedTags, language, trackingString) {
  const safePropertiesData = safeArray(propertiesData);
  const safeValidatedTags = safeArray(validatedTags);
  if (safePropertiesData.length === 0) {
    return [];
  }
  if (!relatedData) {
    console.warn('processProperties: relatedData is undefined');
    return [];
  }
  const { sectorsData, citiesData, categoriesData, amenitiesData } = relatedData;
  // Create lookup maps with protection
  const sectorsMap = new Map(safeArray(sectorsData?.data).map((s)=>[
      s.id,
      s.name
    ]));
  const citiesMap = new Map(safeArray(citiesData?.data).map((c)=>[
      c.id,
      c.name
    ]));
  const categoriesMap = new Map(safeArray(categoriesData?.data).map((cat)=>[
      cat.id,
      getCategoryName(cat, language)
    ]));
  // Create amenities map
  const amenitiesMap = new Map();
  safeArray(amenitiesData?.data).forEach((pa)=>{
    if (pa.amenities && pa.amenities.active) {
      if (!amenitiesMap.has(pa.property_id)) {
        amenitiesMap.set(pa.property_id, []);
      }
      amenitiesMap.get(pa.property_id).push(pa.amenities);
    }
  });
  console.log('Carousel amenities map created with', amenitiesMap.size, 'properties having amenities');
  const processedProperties = [];
  for (const prop of safePropertiesData){
    if (!prop) continue;
    // Process multilingual content
    let processedName = prop.name || '';
    let processedDescription = prop.description || '';
    const multilingualContent = processMultilingualContent(prop, language);
    if (multilingualContent.name) processedName = multilingualContent.name;
    if (multilingualContent.description) processedDescription = multilingualContent.description;
    // Build URLs with tracking
    let propertySlug = prop.slug_url || '';
    if (language === 'en' && prop.slug_en) propertySlug = prop.slug_en;
    if (language === 'fr' && prop.slug_fr) propertySlug = prop.slug_fr;
    let propertyUrl = propertySlug;
    if (language === 'en') propertyUrl = `en/${propertySlug}`;
    if (language === 'fr') propertyUrl = `fr/${propertySlug}`;
    // Format price
    const formattedPrice = formatPropertyPrice(prop, language);
    // Process images
    const galleryImages = processGalleryImages(prop.gallery_images_url);
    const { mainImage, finalImages } = buildFinalImagesArray(prop.main_image_url, galleryImages);
    // Get smart badges
    const amenityBadges = getSmartAmenityBadges(prop.id, amenitiesMap, {
      ...prop,
      category_name: categoriesMap.get(prop.category_id)
    }, safeValidatedTags, language);
    // Build property object
    const processedProperty = {
      // API fields
      id: prop.id,
      code: prop.code,
      name: processedName,
      description: processedDescription,
      sale_price: prop.sale_price,
      sale_currency: prop.sale_currency,
      rental_price: prop.rental_price,
      rental_currency: prop.rental_currency,
      separation_price: prop.separation_price,
      separation_currency: prop.separation_currency,
      furnished_rental_price: prop.furnished_rental_price,
      furnished_rental_currency: prop.furnished_rental_currency,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      built_area: prop.built_area,
      land_area: prop.land_area,
      parking_spots: prop.parking_spots,
      nivel: prop.nivel,
      is_project: prop.is_project,
      main_image_url: prop.main_image_url,
      gallery_images_url: finalImages,
      sector: sectorsMap.get(prop.sector_id) || null,
      city: citiesMap.get(prop.city_id) || null,
      category: categoriesMap.get(prop.category_id) || null,
      slug_url: propertySlug,
      url: `/${propertyUrl}${trackingString || ''}`,
      // PropertyList component fields
      slug: propertySlug,
      titulo: processedName,
      precio: formattedPrice,
      imagen: mainImage,
      imagenes: finalImages,
      habitaciones: prop.bedrooms || 0,
      banos: prop.bathrooms || 0,
      metros: prop.built_area || 0,
      metros_terreno: prop.land_area || 0,
      parqueos: prop.parking_spots || 0,
      nivel: prop.nivel || null,
      tipo: categoriesMap.get(prop.category_id) || getUIText('PROPERTY', language),
      isFormattedByProvider: true,
      // Smart badges system
      amenity_badges: amenityBadges,
      project_badges: prop.is_project ? [
        getUIText('PROJECT', language)
      ] : amenityBadges.slice(0, 1).map((badge)=>badge.text),
      habitaciones_rango: prop.is_project && prop.bedrooms ? `${prop.bedrooms}${getUIText('BEDROOMS_RANGE', language)}` : null,
      banos_rango: prop.is_project && prop.bathrooms ? `${prop.bathrooms}${getUIText('BATHROOMS_RANGE', language)}` : null,
      metros_rango: prop.is_project && prop.built_area ? `${prop.built_area}${getUIText('AREA_RANGE', language)}` : null,
      reserva_desde: prop.separation_price && prop.separation_currency ? `desde ${formatPrice(prop.separation_price, prop.separation_currency, 'sale', language)}` : prop.is_project ? getUIText('RESERVATION_FROM', language) : null
    };
    processedProperties.push(processedProperty);
  }
  return processedProperties;
}
// ============================================================================
// FUNCIONES PRINCIPALES DE PROCESAMIENTO
// ============================================================================
// FunciÃ³n de construcciÃ³n de carrusel individual con debugging y degradaciÃ³n limitada
async function buildTagCountCarousel(supabase, group, searchLevels, language, trackingString, coreTags, maxDegradationLevels = 1) {
  console.log(`DEBUG: === Starting carousel for ${group.name} ===`);
  try {
    console.log(`DEBUG: Group details:`, {
      id: group.id,
      name: group.name,
      min_tags: group.min_tags,
      min_pillars: group.min_pillars,
      priority: group.priority
    });
    const { data: groupTagsData, error: groupTagsError } = await supabase.from('tag_group_tags').select('tag_id').eq('group_id', group.id);
    if (groupTagsError) {
      console.error(`Error fetching group tags for ${group.name}:`, groupTagsError);
      return null;
    }
    if (!groupTagsData?.length) {
      console.log(`Group ${group.name} has no associated tags, skipping`);
      return null;
    }
    const groupTagIds = groupTagsData.map((gt)=>gt.tag_id);
    console.log(`DEBUG: Group ${group.name} has ${groupTagIds.length} associated tags`);
    let finalProperties = [];
    let usedLevel = null;
    // Limitar niveles de degradaciÃ³n
    const limitedSearchLevels = searchLevels.slice(0, maxDegradationLevels + 1);
    console.log(`DEBUG: Trying ${limitedSearchLevels.length} search levels (limited to ${maxDegradationLevels + 1})`);
    for (const level of limitedSearchLevels){
      console.log(`DEBUG: Trying level: ${level.name} with ${level.tagIds.length} core tags`);
      const properties = await findPropertiesWithTagCount(supabase, level.tagIds, groupTagIds, group.min_tags || 1, 20);
      console.log(`DEBUG: Level ${level.name} found ${properties.length} properties`);
      if (properties.length >= 6) {
        finalProperties = properties;
        usedLevel = level.name;
        console.log(`DEBUG: Using level ${level.name} with ${properties.length} properties`);
        console.log('DEBUG: Sample property matches:', properties.slice(0, 3).map((p)=>`Property ${p.property_id}: ${p.optional_matches} matches`));
        break;
      }
    }
    if (finalProperties.length < 6) {
      console.log(`Group ${group.name} insufficient properties (${finalProperties.length}), skipping`);
      return null;
    }
    // Procesar propiedades del carrusel CON FORMATO COMPLETO
    console.log(`DEBUG: Processing ${finalProperties.length} properties for carousel`);
    const propertyIds = finalProperties.map((p)=>p.property_id);
    const { data: carouselProperties } = await supabase.from('properties').select(`
        id, code, name, description, content_en, content_fr, 
        sale_price, sale_currency, rental_price, rental_currency, 
        temp_rental_price, temp_rental_currency, furnished_rental_price, furnished_rental_currency,
        separation_price, separation_currency,
        bedrooms, bathrooms, built_area, land_area, parking_spots, nivel,
        is_project, main_image_url, gallery_images_url, 
        slug_url, slug_en, slug_fr, sector_id, city_id, category_id
      `).in('id', propertyIds).eq('property_status', 'Publicada').eq('availability', 1);
    if (!carouselProperties?.length) {
      console.log(`No valid properties found after filtering for group ${group.name}`);
      return null;
    }
    console.log(`DEBUG: Successfully fetched ${carouselProperties.length} property details`);
    // NUEVO: Procesar propiedades CON FORMATO COMPLETO
    // Obtener IDs únicos para datos relacionados
    const sectorIds = [
      ...new Set(carouselProperties.map((p)=>p.sector_id).filter(Boolean))
    ];
    const cityIds = [
      ...new Set(carouselProperties.map((p)=>p.city_id).filter(Boolean))
    ];
    const categoryIds = [
      ...new Set(carouselProperties.map((p)=>p.category_id).filter(Boolean))
    ];
    // Obtener datos relacionados
    const relatedData = await fetchRelatedData(supabase, propertyIds, categoryIds, sectorIds, cityIds);
    // Procesar propiedades con formato completo
    const processedCarouselProperties = await processProperties(carouselProperties, relatedData, Object.values(coreTags).flat(), language, trackingString);
    console.log(`DEBUG: Successfully processed ${processedCarouselProperties.length} properties for carousel`);
    // Procesar contenido SEO contextual del grupo CON CONTEXTO REAL
    console.log(`DEBUG: About to call buildCarouselSEO`);
    console.log(`DEBUG: usedLevel: "${usedLevel}"`);
    let carouselSEO;
    try {
      carouselSEO = buildCarouselSEO(group, coreTags, language, finalProperties.length + 20, usedLevel);
      console.log(`DEBUG: SEO processed successfully for level ${usedLevel}`);
      console.log(`DEBUG: SEO title: "${carouselSEO.title}"`);
      console.log(`DEBUG: SEO CTA: "${carouselSEO.viewAllCTA}"`);
      console.log(`DEBUG: Context level used: ${carouselSEO.contextInfo.contextLevel}`);
    } catch (seoError) {
      console.error(`Error in buildCarouselSEO for ${group.name}:`, seoError);
      carouselSEO = {
        title: group.seo_title || group.name || getUIText('FEATURED_PROPERTIES', language),
        description: group.seo_description || group.description || '',
        viewAllCTA: getUIText('VIEW_ALL', language),
        contextInfo: {
          error: seoError.message,
          usedLevel: usedLevel,
          contextLevel: 'fallback'
        }
      };
    }
    // Construir URL del carrusel
    const groupSlug = language === 'en' && group.slug_en ? group.slug_en : language === 'fr' && group.slug_fr ? group.slug_fr : group.slug;
    let viewAllUrl = `listados-de/${groupSlug}`;
    if (language === 'en') viewAllUrl = `en/listings-of/${groupSlug}`;
    if (language === 'fr') viewAllUrl = `fr/listes-de/${groupSlug}`;
    viewAllUrl = `/${viewAllUrl}${trackingString}`;
    console.log(`DEBUG: Built viewAll URL: ${viewAllUrl}`);
    const result = {
      group_id: group.id,
      title: carouselSEO.title,
      description: carouselSEO.description,
      subtitle: carouselSEO.description,
      viewAllText: carouselSEO.viewAllCTA,
      icon: group.icon,
      color: group.color,
      carousel_url: viewAllUrl,
      viewAllLink: viewAllUrl,
      properties: processedCarouselProperties,
      matchingStrategy: usedLevel,
      minTags: group.min_tags,
      minPillars: group.min_pillars,
      groupTagsCount: groupTagIds.length,
      avgTagMatches: finalProperties.reduce((sum, p)=>sum + p.optional_matches, 0) / finalProperties.length,
      seoContext: carouselSEO.contextInfo,
      degradationLevel: usedLevel === searchLevels[0]?.name ? 0 : 1
    };
    console.log(`DEBUG: Successfully built carousel for ${group.name}`);
    return result;
  } catch (error) {
    console.error(`FATAL: Error in buildTagCountCarousel for ${group.name}:`, error);
    console.error(`Error stack:`, error.stack);
    return null;
  }
}
// ============================================================================
// FUNCIÓN PRINCIPAL EXPORTADA
// ============================================================================
export async function getCarouselsOptimized(supabase, countryTagId, userTagsDetails, tags, trackingString, language, domainInfo) {
  const startTime = Date.now(); // INICIO DEL MEDIDOR
  try {
    console.log('⏱️ === CAROUSEL PERFORMANCE START ===');
    console.log('🚀 Starting carousel optimization process...');
    console.log('countryTagId:', countryTagId);
    console.log('userTagsDetails:', userTagsDetails?.length || 0);
    console.log('tags from URL:', tags);
    // PASO 1: Extraer solo los 4 pilares fundamentales
    const coreTags = extractCoreTags(userTagsDetails);
    console.log('DEBUG: Core tags extracted:', coreTags);
    // PASO 2: Buscar tag groups activos incluyendo min_pillars
    const { data: tagGroups, error: tagGroupsError } = await supabase.from('tag_groups').select(`
        id, slug, slug_en, slug_fr, name, description, icon, color, 
        seo_title, seo_description, content_en, content_fr, requirements,
        min_tags, min_pillars, priority
      `).eq('active', true).order('priority');
    if (tagGroupsError || !tagGroups?.length) {
      console.log('No tag groups found or error:', tagGroupsError);
      return [];
    }
    console.log(`DEBUG: Found ${tagGroups.length} total tag groups`);
    // PASO 3: Pre-filtrar grupos por contexto y pilares
    const relevantGroups = getRelevantGroups(tagGroups, userTagsDetails, coreTags, language);
    if (relevantGroups.length === 0) {
      console.log('No groups passed pre-filtering');
      return [];
    }
    // PASO 4: Construir niveles de búsqueda
    const searchLevels = buildSearchLevels(coreTags, countryTagId);
    console.log('DEBUG: Search levels built:', searchLevels.map((l)=>({
        name: l.name,
        tagCount: l.tagIds.length
      })));
    // PASO 5: Procesar grupos relevantes con degradación limitada
    console.log(`DEBUG: Starting ${Math.min(relevantGroups.length, 8)} carousel promises`);
    const carouselPromises = relevantGroups.slice(0, 8).map(async (group)=>{
      console.log(`DEBUG: Processing group: ${group.name}`);
      return await buildTagCountCarousel(supabase, group, searchLevels, language, trackingString, coreTags, 1 // Máximo 1 nivel de degradación
      );
    });
    const carouselResults = await Promise.all(carouselPromises);
    console.log(`DEBUG: Carousel results received: ${carouselResults.length}`);
    console.log(`DEBUG: Valid results (not null): ${carouselResults.filter(Boolean).length}`);
    // PASO 6: Filtrar y ordenar carruseles válidos
    const validCarousels = carouselResults.filter((carousel)=>{
      if (!carousel) {
        console.log('DEBUG: Filtering out null carousel');
        return false;
      }
      if (carousel.properties.length < 6) {
        console.log(`DEBUG: Filtering out carousel "${carousel.title}" - only ${carousel.properties.length} properties`);
        return false;
      }
      console.log(`DEBUG: Keeping carousel "${carousel.title}" - ${carousel.properties.length} properties`);
      return true;
    }).sort((a, b)=>{
      // Ordenar: sin degradación primero, luego con degradación
      if (a.degradationLevel !== b.degradationLevel) {
        return a.degradationLevel - b.degradationLevel;
      }
      // Desempate por cantidad de propiedades
      return b.properties.length - a.properties.length;
    }).slice(0, 5);
    console.log(`=== OPTIMIZED CAROUSEL DEBUG END === Returning ${validCarousels.length} carousels`);
    return validCarousels;
  } catch (error) {
    console.error('FATAL: Carousel optimization error:', error);
    console.error('Error stack:', error.stack);
    return [];
  }
}
