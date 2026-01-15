import { getUIText } from './ui-texts.ts';

// ============================================================================
// HELPER FUNCTIONS - FORMATO COMPATIBLE CON BACKEND
// ============================================================================

function safeArray(arr) {
  return Array.isArray(arr) ? arr : [];
}

function safeObject(obj) {
  return obj && typeof obj === 'object' ? obj : {};
}

function processGalleryImages(galleryImagesUrl) {
  if (!galleryImagesUrl) return [];
  if (Array.isArray(galleryImagesUrl)) return galleryImagesUrl.filter(Boolean);
  if (typeof galleryImagesUrl === 'string') {
    try {
      const parsed = JSON.parse(galleryImagesUrl);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch (e) { return []; }
  }
  return [];
}

function buildFinalImagesArray(mainImageUrl, galleryImages) {
  const safeGalleryImages = safeArray(galleryImages);
  const mainImage = mainImageUrl || (safeGalleryImages.length > 0 ? safeGalleryImages[0] : 'https://via.placeholder.com/800x600/e5e7eb/9ca3af?text=Sin+Imagen');
  let finalImages = [];
  if (mainImageUrl && !safeGalleryImages.includes(mainImageUrl)) {
    finalImages.push(mainImageUrl);
  }
  finalImages = [...finalImages, ...safeGalleryImages];
  if (finalImages.length === 0) {
    finalImages.push(mainImage);
  }
  return { mainImage, finalImages };
}

function formatPropertyPrice(prop, language) {
  let price = null;
  let currency = 'USD';
  let operationType = 'sale';

  if (prop.sale_price && prop.sale_price > 0) {
    price = prop.sale_price;
    currency = prop.sale_currency || 'USD';
    operationType = 'sale';
  } else if (prop.rental_price && prop.rental_price > 0) {
    price = prop.rental_price;
    currency = prop.rental_currency || 'USD';
    operationType = 'rental';
  } else if (prop.furnished_rental_price && prop.furnished_rental_price > 0) {
    price = prop.furnished_rental_price;
    currency = prop.furnished_rental_currency || 'USD';
    operationType = 'furnished_rental';
  } else if (prop.temp_rental_price && prop.temp_rental_price > 0) {
    price = prop.temp_rental_price;
    currency = prop.temp_rental_currency || 'USD';
    operationType = 'temp_rental';
  }

  if (!price || price === 0) {
    return language === 'en' ? 'Price on request' : language === 'fr' ? 'Prix sur demande' : 'Precio a consultar';
  }

  const currencySymbol = currency === 'USD' ? 'USD$' : currency === 'DOP' ? 'DOP$' : `${currency}$`;
  const formattedAmount = new Intl.NumberFormat('es-DO').format(price);
  const rentalSuffix = (operationType === 'rental' || operationType === 'furnished_rental' || operationType === 'temp_rental')
    ? (language === 'en' ? '/month' : language === 'fr' ? '/mois' : '/mes')
    : '';

  return `${currencySymbol}${formattedAmount}${rentalSuffix}`;
}

async function fetchRelatedDataCurated(supabase, propertyIds, categoryIds, sectorIds, cityIds) {
  const safePropertyIds = safeArray(propertyIds);
  const safeCategoryIds = safeArray(categoryIds);
  const safeSectorIds = safeArray(sectorIds);
  const safeCityIds = safeArray(cityIds);

  const [sectorsData, citiesData, categoriesData, amenitiesData] = await Promise.all([
    safeSectorIds.length > 0 ? supabase.from('sectors').select('id, name').in('id', safeSectorIds) : Promise.resolve({ data: [] }),
    safeCityIds.length > 0 ? supabase.from('cities').select('id, name').in('id', safeCityIds) : Promise.resolve({ data: [] }),
    safeCategoryIds.length > 0 ? supabase.from('property_categories').select('id, name, name_en, name_fr').in('id', safeCategoryIds) : Promise.resolve({ data: [] }),
    safePropertyIds.length > 0 ? supabase.from('property_amenities').select(`
          property_id,
          amenities:amenity_id(id, name, name_en, name_fr, icon, category, active)
        `).in('property_id', safePropertyIds).eq('amenities.active', true) : Promise.resolve({ data: [] })
  ]);

  return { sectorsData, citiesData, categoriesData, amenitiesData };
}

function getCategoryName(category, language) {
  if (!category) return '';
  if (language === 'en' && category.name_en) return category.name_en;
  if (language === 'fr' && category.name_fr) return category.name_fr;
  return category.name || '';
}

function getSmartAmenityBadges(propertyId, amenitiesMap, property, language) {
  const amenities = amenitiesMap.get(propertyId) || [];
  if (amenities.length === 0) return [];

  const priorityAmenities = ['piscina', 'pool', 'piscine', 'gimnasio', 'gym', 'salle-de-sport', 'seguridad-24-7', 'security', 'sécurité', 'planta-electrica', 'generator', 'générateur', 'vista-al-mar', 'ocean-view', 'vue-mer'];
  const badges = [];

  for (const amenity of amenities) {
    if (!amenity || !amenity.active) continue;
    const amenityName = (language === 'en' && amenity.name_en) ? amenity.name_en : (language === 'fr' && amenity.name_fr) ? amenity.name_fr : amenity.name;
    const isPriority = priorityAmenities.some(p => amenity.name?.toLowerCase().includes(p.toLowerCase()) || amenity.name_en?.toLowerCase().includes(p.toLowerCase()) || amenity.name_fr?.toLowerCase().includes(p.toLowerCase()));

    if (isPriority) {
      badges.push({ text: amenityName, icon: amenity.icon || 'check-circle', category: amenity.category || 'amenity' });
    }
    if (badges.length >= 3) break;
  }
  return badges;
}

//============================================================================
// CURATED LISTINGS HANDLER - LISTADOS CURADOS
// ============================================================================
async function handleCuratedListingsMain(params) {
  const { supabase, language, trackingString } = params;
  console.log('📋 Handling curated listings main page');

  // Obtener todos los tag_groups activos
  const { data: tagGroups, error: tagGroupsError } = await supabase
    .from('tag_groups')
    .select('*')
    .eq('active', true)
    .order('priority', { ascending: false })
    .order('name', { ascending: true });

  console.log('🔍 DEBUG tag_groups query:', {
    count: tagGroups?.length || 0,
    error: tagGroupsError,
    hasData: !!tagGroups,
    sample: tagGroups?.[0]
  });

  // Procesar listados curados
  const processedListings = (tagGroups || []).map((group) => {
    // Procesar contenido multilingüe
    let displayName = group.name;
    let displaySlug = group.slug;
    let displayDescription = group.description || '';

    if (language === 'en' && group.content_en) {
      const contentEn = typeof group.content_en === 'string' ? JSON.parse(group.content_en) : group.content_en;
      displayName = contentEn.name || group.name;
      displaySlug = group.slug_en || group.slug;
      displayDescription = contentEn.description || group.description || '';
    } else if (language === 'fr' && group.content_fr) {
      const contentFr = typeof group.content_fr === 'string' ? JSON.parse(group.content_fr) : group.content_fr;
      displayName = contentFr.name || group.name;
      displaySlug = group.slug_fr || group.slug;
      displayDescription = contentFr.description || group.description || '';
    }

    const basePath = language === 'es' ? 'listados-de' : language === 'en' ? 'listings-of' : 'listes-de';
    const url = language === 'es' ? `/${basePath}/${displaySlug}` : `/${language}/${basePath}/${displaySlug}`;

    return {
      id: group.id,
      tagId: group.tag_id,
      title: displayName,
      slug: displaySlug,
      description: displayDescription,
      icon: group.icon || '🏠',
      color: group.color,
      priority: group.priority || 1,
      url: url + trackingString
    };
  });

  // Todos los listados (ordenados por priority ya)
  const featuredListings = processedListings.slice(0, 6);
  const allListings = processedListings;
  const regularListings = processedListings.slice(6); // Resto después de los primeros 6

  // SEO
  const seo = {
    title: language === 'en' ? 'Curated Property Listings | CLIC Inmobiliaria' : language === 'fr' ? 'Listes de Propriétés Sélectionnées | CLIC Inmobiliaria' : 'Listados de Propiedades Curados | CLIC Inmobiliaria',
    description: language === 'en' ? 'Discover our expertly curated property collections. Find the perfect property for your specific needs in Dominican Republic.' : language === 'fr' ? 'Découvrez nos collections de propriétés soigneusement sélectionnées. Trouvez la propriété parfaite pour vos besoins spécifiques en République Dominicaine.' : 'Descubre nuestras colecciones de propiedades cuidadosamente seleccionadas. Encuentra la propiedad perfecta para tus necesidades específicas en República Dominicana.',
    h1: language === 'en' ? 'Curated Property Collections' : language === 'fr' ? 'Collections de Propriétés Sélectionnées' : 'Colecciones de Propiedades Curadas',
    h2: language === 'en' ? 'Find properties perfectly matched to your goals' : language === 'fr' ? 'Trouvez des propriétés parfaitement adaptées à vos objectifs' : 'Encuentra propiedades perfectamente adaptadas a tus objetivos',
    canonical_url: language === 'es' ? '/listados-de' : `/${language}/listings-of`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: language === 'en' ? 'Curated Listings' : language === 'fr' ? 'Listes Sélectionnées' : 'Listados Curados',
        url: language === 'es' ? '/listados-de' : `/${language}/listings-of`
      }
    ]
  };

  return {
    type: 'curated-listings-main',
    pageType: 'curated-listings-main',
    language,
    seo,
    featuredListings,
    allListings,
    regularListings,
    stats: {
      totalListings: allListings.length,
      featuredCount: featuredListings.length
    }
  };
}
async function handleCuratedListingsSingle(params) {
  const { supabase, language, contentSegments, trackingString, queryParams } = params;
  if (contentSegments.length === 0) {
    throw new Error('Collection slug required');
  }
  const collectionSlug = contentSegments[0];
  console.log('🏷️ Handling single curated collection:', collectionSlug);
  // Buscar la colección
  const slugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
  const { data: collection } = await supabase.from('curated_collections').select(`
      id, title, description, slug, slug_en, slug_fr, featured_image, 
      property_count, collection_type, featured, content_en, content_fr,
      seo_title, seo_description, created_at, updated_at,
      curator_notes, investment_highlights, area_insights
    `).eq(slugField, collectionSlug).eq('status', 'published').eq('active', true).single();
  if (!collection) {
    throw new Error(`Curated collection "${collectionSlug}" not found`);
  }
  // Obtener propiedades de la colección
  const page = parseInt(queryParams.get('page') || '1');
  const limit = 12;
  const offset = (page - 1) * limit;
  const { data: collectionProperties, count } = await supabase.from('curated_collection_properties').select(`
      sort_order, featured_in_collection, curator_notes,
      properties!inner(
        id, name, description, main_image_url, sale_price, rental_price,
        bedrooms, bathrooms, area, slug_url, featured, status, operation,
        property_type, city, sector, currency, amenities, gallery_images,
        users:users!properties_agent_id_fkey(first_name, last_name, profile_photo_url, slug, position)
      )
    `, {
    count: 'exact'
  }).eq('collection_id', collection.id).eq('properties.status', 'active').order('featured_in_collection', {
    ascending: false
  }).order('sort_order', {
    ascending: true
  }).range(offset, offset + limit - 1);
  // Procesar colección con contenido multiidioma
  const processedCollection = processCuratedCollection(collection, language, trackingString);

  // Obtener IDs para fetchear datos relacionados
  const collectionPropIds = (collectionProperties || []).map(item => item.properties?.id).filter(Boolean);
  const collectionCategoryIds = [...new Set((collectionProperties || []).map(item => item.properties?.category_id).filter(Boolean))];
  const collectionSectorIds = [...new Set((collectionProperties || []).map(item => item.properties?.sector_id).filter(Boolean))];
  const collectionCityIds = [...new Set((collectionProperties || []).map(item => item.properties?.city_id).filter(Boolean))];

  // Fetch related data
  const collectionRelatedData = await fetchRelatedDataCurated(
    supabase,
    collectionPropIds,
    collectionCategoryIds,
    collectionSectorIds,
    collectionCityIds
  );

  // Construir Maps
  const sectorsMap = new Map((collectionRelatedData.sectorsData?.data || []).map(s => [s.id, s.name]));
  const citiesMap = new Map((collectionRelatedData.citiesData?.data || []).map(c => [c.id, c.name]));
  const categoriesMap = new Map((collectionRelatedData.categoriesData?.data || []).map(cat => [cat.id, getCategoryName(cat, language)]));
  const amenitiesMap = new Map();
  (collectionRelatedData.amenitiesData?.data || []).forEach(pa => {
    if (!amenitiesMap.has(pa.property_id)) {
      amenitiesMap.set(pa.property_id, []);
    }
    if (pa.amenities) {
      amenitiesMap.get(pa.property_id).push(pa.amenities);
    }
  });

  const relatedData = { sectorsMap, citiesMap, categoriesMap, amenitiesMap };

  // Procesar propiedades con datos relacionados
  const processedProperties = (collectionProperties || []).map((item)=>({
      ...processCollectionProperty(item.properties, relatedData, language, trackingString),
      curatorNotes: item.curator_notes,
      featuredInCollection: item.featured_in_collection,
      sortOrder: item.sort_order
    }));
  // Obtener colecciones relacionadas
  const { data: relatedCollections } = await supabase.from('curated_collections').select(`
      id, title, description, slug, slug_en, slug_fr, featured_image, 
      property_count, collection_type, content_en, content_fr
    `).eq('collection_type', collection.collection_type).neq('id', collection.id).eq('status', 'published').eq('active', true).order('featured', {
    ascending: false
  }).limit(3);
  const processedRelated = (relatedCollections || []).map((c)=>processCuratedCollection(c, language, trackingString));
  // Construir paginación
  const totalPages = Math.ceil((count || 0) / limit);
  const pagination = {
    page,
    limit,
    total: count || 0,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
  const seo = {
    title: processedCollection.seoTitle || `${processedCollection.title} | CLIC Inmobiliaria`,
    description: processedCollection.seoDescription || processedCollection.description,
    h1: processedCollection.title,
    h2: `${count || 0} ${language === 'en' ? 'selected properties' : language === 'fr' ? 'propriétés sélectionnées' : 'propiedades seleccionadas'}`,
    canonical_url: processedCollection.url.replace(trackingString, ''),
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: language === 'en' ? 'Curated Listings' : language === 'fr' ? 'Listes Sélectionnées' : 'Listados Curados',
        url: language === 'es' ? '/listados-de' : `/${language}/listings-of`
      },
      {
        name: processedCollection.title,
        url: processedCollection.url
      }
    ]
  };
  return {
    type: 'curated-listings-single',
    pageType: 'curated-listings-single',
    seo,
    collection: processedCollection,
    properties: processedProperties,
    relatedCollections: processedRelated,
    pagination,
    stats: {
      totalProperties: count || 0,
      averagePrice: calculateAveragePrice(processedProperties),
      priceRange: calculatePriceRange(processedProperties),
      propertyTypes: getPropertyTypeBreakdown(processedProperties, language)
    }
  };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function processCuratedCollection(collection, language, trackingString) {
  // Procesar contenido multiidioma
  let processedTitle = collection.title;
  let processedDescription = collection.description;
  let processedSeoTitle = collection.seo_title;
  let processedSeoDescription = collection.seo_description;
  if (language === 'en' && collection.content_en) {
    try {
      const contentEn = typeof collection.content_en === 'string' ? JSON.parse(collection.content_en) : collection.content_en;
      if (contentEn.title) processedTitle = contentEn.title;
      if (contentEn.description) processedDescription = contentEn.description;
      if (contentEn.seo_title) processedSeoTitle = contentEn.seo_title;
      if (contentEn.seo_description) processedSeoDescription = contentEn.seo_description;
    } catch (e) {
      console.warn('Failed to parse EN content for collection:', e);
    }
  } else if (language === 'fr' && collection.content_fr) {
    try {
      const contentFr = typeof collection.content_fr === 'string' ? JSON.parse(collection.content_fr) : collection.content_fr;
      if (contentFr.title) processedTitle = contentFr.title;
      if (contentFr.description) processedDescription = contentFr.description;
      if (contentFr.seo_title) processedSeoTitle = contentFr.seo_title;
      if (contentFr.seo_description) processedSeoDescription = contentFr.seo_description;
    } catch (e) {
      console.warn('Failed to parse FR content for collection:', e);
    }
  }
  // Construir URL
  const slug = language === 'en' && collection.slug_en ? collection.slug_en : language === 'fr' && collection.slug_fr ? collection.slug_fr : collection.slug;
  const basePath = language === 'es' ? 'listados-de' : language === 'en' ? 'listings-of' : 'listes-de';
  let url = `${basePath}/${slug}`;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  return {
    id: collection.id,
    title: processedTitle,
    description: processedDescription,
    seoTitle: processedSeoTitle,
    seoDescription: processedSeoDescription,
    featuredImage: collection.featured_image,
    propertyCount: collection.property_count || 0,
    collectionType: collection.collection_type,
    featured: collection.featured || false,
    url: `/${url}${trackingString}`,
    slug,
    slug_en: collection.slug_en,
    slug_fr: collection.slug_fr,
    createdAt: collection.created_at,
    updatedAt: collection.updated_at,
    curatorNotes: collection.curator_notes,
    investmentHighlights: collection.investment_highlights,
    areaInsights: collection.area_insights
  };
}
function processCollectionProperty(prop, relatedData, language, trackingString) {
  if (!prop) {
    console.error('processCollectionProperty: prop is null/undefined');
    return null;
  }

  console.log('Processing property:', { id: prop.id, name: prop.name, relatedDataKeys: Object.keys(relatedData || {}) });

  // Process multilingual content
  let processedName = prop.name || '';
  let processedDescription = prop.description || '';
  const multilingualContent = processMultilingualContent(prop, language, 'content');
  if (multilingualContent.name || multilingualContent.title) {
    processedName = multilingualContent.name || multilingualContent.title;
  }
  if (multilingualContent.description) {
    processedDescription = multilingualContent.description;
  }

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

  // Get related data
  const sectorsMap = relatedData?.sectorsMap || new Map();
  const citiesMap = relatedData?.citiesMap || new Map();
  const categoriesMap = relatedData?.categoriesMap || new Map();
  const amenitiesMap = relatedData?.amenitiesMap || new Map();

  // Get smart badges
  const amenityBadges = getSmartAmenityBadges(prop.id, amenitiesMap, prop, language);

  // Build property object con formato completo compatible
  return {
    // API fields
    id: prop.id,
    code: prop.code,
    name: processedName,
    description: processedDescription,
    sale_price: prop.sale_price,
    sale_currency: prop.sale_currency,
    rental_price: prop.rental_price,
    rental_currency: prop.rental_currency,
    temp_rental_price: prop.temp_rental_price,
    temp_rental_currency: prop.temp_rental_currency,
    furnished_rental_price: prop.furnished_rental_price,
    furnished_rental_currency: prop.furnished_rental_currency,
    separation_price: prop.separation_price,
    separation_currency: prop.separation_currency,
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

    // PropertyList component fields (formato compatible)
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
    project_badges: prop.is_project ? [getUIText('PROJECT', language)] : amenityBadges.slice(0, 1).map(badge => badge.text),
    habitaciones_rango: prop.is_project && prop.bedrooms ? `${prop.bedrooms}${getUIText('BEDROOMS_RANGE', language)}` : null,
    banos_rango: prop.is_project && prop.bathrooms ? `${prop.bathrooms}${getUIText('BATHROOMS_RANGE', language)}` : null,
    metros_rango: prop.is_project && prop.built_area ? `${prop.built_area}${getUIText('AREA_RANGE', language)}` : null
  };
}
function buildCuratedCategoryUrl(type, language, trackingString) {
  const basePath = language === 'es' ? 'listados-de' : language === 'en' ? 'listings-of' : 'listes-de';
  let url = `${basePath}?type=${type}`;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  return `/${url}${trackingString}`;
}
function formatCollectionTypeName(type, language) {
  const typeNames = {
    luxury: {
      es: 'Lujo',
      en: 'Luxury',
      fr: 'Luxe'
    },
    investment: {
      es: 'Inversión',
      en: 'Investment',
      fr: 'Investissement'
    },
    beachfront: {
      es: 'Frente al Mar',
      en: 'Beachfront',
      fr: 'Front de Mer'
    },
    new_developments: {
      es: 'Nuevos Desarrollos',
      en: 'New Developments',
      fr: 'Nouveaux Développements'
    },
    vacation_homes: {
      es: 'Casas Vacacionales',
      en: 'Vacation Homes',
      fr: 'Maisons de Vacances'
    }
  };
  return typeNames[type]?.[language] || typeNames[type]?.es || type;
}
function calculateAveragePrice(properties) {
  if (!properties.length) return 0;
  const validPrices = properties.map((p)=>p.salePrice || p.rentalPrice).filter((price)=>price && price > 0);
  if (!validPrices.length) return 0;
  const total = validPrices.reduce((sum, price)=>sum + price, 0);
  return Math.round(total / validPrices.length);
}
function calculatePriceRange(properties) {
  if (!properties.length) return {
    min: 0,
    max: 0
  };
  const validPrices = properties.map((p)=>p.salePrice || p.rentalPrice).filter((price)=>price && price > 0);
  if (!validPrices.length) return {
    min: 0,
    max: 0
  };
  return {
    min: Math.min(...validPrices),
    max: Math.max(...validPrices)
  };
}
function getPropertyTypeBreakdown(properties, language) {
  const typeCount = {};
  properties.forEach((property)=>{
    const type = property.propertyType || 'other';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });
  return Object.entries(typeCount).map(([type, count])=>({
      type,
      name: formatPropertyTypeName(type, language),
      count,
      percentage: Math.round(count / properties.length * 100)
    }));
}
function formatPropertyTypeName(type, language) {
  const typeNames = {
    apartment: {
      es: 'Apartamento',
      en: 'Apartment',
      fr: 'Appartement'
    },
    house: {
      es: 'Casa',
      en: 'House',
      fr: 'Maison'
    },
    villa: {
      es: 'Villa',
      en: 'Villa',
      fr: 'Villa'
    },
    condo: {
      es: 'Condominio',
      en: 'Condo',
      fr: 'Condo'
    },
    penthouse: {
      es: 'Penthouse',
      en: 'Penthouse',
      fr: 'Penthouse'
    },
    land: {
      es: 'Terreno',
      en: 'Land',
      fr: 'Terrain'
    }
  };
  return typeNames[type]?.[language] || typeNames[type]?.es || type;
}
// ============================================================================
// MAIN EXPORT HANDLER
// ============================================================================
export async function handleCuratedListings(params) {
  try {
    const { contentSegments, supabase, language, trackingString, baseData, queryParams } = params;
    const countryTag = baseData?.countryTag;
    console.log(`🔍 Handling curated listings with ${contentSegments.length} segments:`, contentSegments);
    // Caso 1: Sin segmentos - Listado principal
    if (contentSegments.length === 0) {
      return await handleCuratedListingsMain(params);
    }
    // Caso 2: Un segmento - Verificar si es una colección curada predefinida
    if (contentSegments.length === 1) {
      const segment = contentSegments[0];
      const slugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
      // Primero verificamos si es una colección predefinida
      const { data: collection } = await supabase.from('curated_collections').select('id').eq(slugField, segment).eq('status', 'published').eq('active', true).single();
      if (collection) {
        console.log(`Found predefined collection for segment: ${segment}`);
        return await handleCuratedListingsSingle(params);
      }
      // Si no es colección predefinida, tratar como filtrado dinámico
      return await handleCuratedListingsFiltered(params);
    }
    // Caso 3: Múltiples segmentos - Tratar como filtros combinados
    console.log(`Processing ${contentSegments.length} segments as combined filters`);
    return await handleCuratedListingsFiltered(params);
  } catch (error) {
    console.error('Error in curated listings handler:', error);
    throw error;
  }
}
async function handleCuratedListingsFiltered(params) {
  const { supabase, language, contentSegments, trackingString, baseData, queryParams } = params;
  const countryTag = baseData?.countryTag;
  console.log(`🏷️ Handling filtered curated listings with segments:`, contentSegments);
  // Paso 1: Inicializar variables para los diferentes tipos de tags
  let propertyTypeTag = null;
  let customListTag = null;
  let locationTag = null;
  let cityTag = null;
  // Determinar el tipo de cada segmento
  if (contentSegments.length > 0) {
    console.log('DEBUG: Content segments received:', contentSegments);
    // Obtener los tipos de segmentos
    const tagTypes = await identifySegmentTypes(supabase, contentSegments);
    console.log('DEBUG: Segment types identified:', tagTypes);
    // Asignar cada segmento a su tipo correspondiente
    for(let i = 0; i < contentSegments.length; i++){
      const segment = contentSegments[i];
      const type = tagTypes[i];
      console.log(`DEBUG: Assigning segment "${segment}" with type "${type}"`);
      if (segment === 'propiedades') continue; // Ignorar el segmento genérico "propiedades"
      if (type === 'property_type' && !propertyTypeTag) {
        propertyTypeTag = segment;
      } else if ((type === 'custom_list' || type === 'custom-list') && !customListTag) {
        customListTag = segment;
        console.log(`DEBUG: Assigned customListTag = "${segment}"`);
      } else if (type === 'city' && !cityTag) {
        cityTag = segment;
      } else if ((type === 'sector' || type === 'location') && !locationTag) {
        locationTag = segment;
      }
    }
  }
  console.log('Analyzed segments:', {
    propertyType: propertyTypeTag,
    customList: customListTag,
    location: locationTag,
    city: cityTag
  });
  // Paso 2: Obtener información de los tags seleccionados
  const requiredTagIds = [];
  let optionalGroupTagIds = [];
  let customListInfo = null;
  let propertyTypeInfo = null;
  let locationInfo = null;
  let cityInfo = null;
  // Incluir el tag del país (siempre requerido)
  if (countryTag && countryTag.id) {
    requiredTagIds.push(countryTag.id);
    console.log(`Added country tag ID: ${countryTag.id}`);
  }
  // Obtener ID y detalles del tag de tipo de propiedad
  if (propertyTypeTag && propertyTypeTag !== 'propiedades') {
    const { data: propertyTypeData } = await supabase.from('tags').select('id, slug, slug_en, slug_fr, display_name, display_name_en, display_name_fr, category').eq('category', 'property_type').or(`slug.eq.${propertyTypeTag},slug_en.eq.${propertyTypeTag},slug_fr.eq.${propertyTypeTag}`).limit(1);
    if (propertyTypeData && propertyTypeData.length > 0) {
      requiredTagIds.push(propertyTypeData[0].id);
      console.log(`Added property type tag ID: ${propertyTypeData[0].id}`);
      propertyTypeInfo = {
        id: propertyTypeData[0].id,
        slug: propertyTypeTag,
        displayName: getTagDisplayName(propertyTypeData[0], language),
        category: 'property_type'
      };
    }
  }
  // Obtener ID y detalles del tag de ciudad
  if (cityTag) {
    const { data: cityData } = await supabase.from('tags').select('id, slug, slug_en, slug_fr, display_name, display_name_en, display_name_fr, category').eq('category', 'city').or(`slug.eq.${cityTag},slug_en.eq.${cityTag},slug_fr.eq.${cityTag}`).limit(1);
    if (cityData && cityData.length > 0) {
      requiredTagIds.push(cityData[0].id);
      console.log(`Added city tag ID: ${cityData[0].id}`);
      cityInfo = {
        id: cityData[0].id,
        slug: cityTag,
        displayName: getTagDisplayName(cityData[0], language),
        category: 'city'
      };
    }
  }
  // Obtener ID y detalles del tag de sector/ubicación
  if (locationTag) {
    const { data: locationData } = await supabase.from('tags').select('id, slug, slug_en, slug_fr, display_name, display_name_en, display_name_fr, category').eq('category', cityTag ? 'sector' : 'location').or(`slug.eq.${locationTag},slug_en.eq.${locationTag},slug_fr.eq.${locationTag}`).limit(1);
    if (locationData && locationData.length > 0) {
      requiredTagIds.push(locationData[0].id);
      console.log(`Added location tag ID: ${locationData[0].id}`);
      locationInfo = {
        id: locationData[0].id,
        slug: locationTag,
        displayName: getTagDisplayName(locationData[0], language),
        category: locationData[0].category
      };
    }
  }
  // Obtener ID y tags relacionados del custom-list
  if (customListTag) {
    console.log(`DEBUG: Looking for tag_group with slug: "${customListTag}"`);
    // Primero obtener el ID del grupo (tag_group) por su slug
    const { data: customListData, error: groupError } = await supabase.from('tag_groups').select('id, tag_id, name, slug, slug_en, slug_fr, description, icon, color, seo_title, seo_description, content_en, content_fr, min_tags, min_pillars').or(`slug.eq.${customListTag},slug_en.eq.${customListTag},slug_fr.eq.${customListTag}`).limit(1);

    console.log('DEBUG: tag_groups query result:', {
      found: customListData?.length || 0,
      error: groupError,
      data: customListData?.[0]
    });

    if (customListData && customListData.length > 0) {
      const groupId = customListData[0].id;
      const groupTagId = customListData[0].tag_id; // Tag principal del grupo para artículos/videos
      console.log(`DEBUG: Found tag_group with ID: ${groupId}, tag_id: ${groupTagId}`);

      // Obtener todos los tags asociados al grupo (para filtrar propiedades)
      const { data: groupTagsData, error: groupTagsError } = await supabase.from('tag_group_tags').select('tag_id').eq('group_id', groupId);

      console.log('DEBUG: tag_group_tags query result:', {
        count: groupTagsData?.length || 0,
        error: groupTagsError,
        tagIds: groupTagsData?.map(t => t.tag_id)
      });

      if (groupTagsData && groupTagsData.length > 0) {
        optionalGroupTagIds = groupTagsData.map((gt)=>gt.tag_id);
        console.log(`Found ${optionalGroupTagIds.length} tags for custom-list '${customListTag}'`);
        // Obtener detalles de los tags para mostrar en la UI
        const { data: tagDetails } = await supabase.from('tags').select('id, slug, display_name, display_name_en, display_name_fr, category').in('id', optionalGroupTagIds).limit(20);
        // Procesar información multilingüe del grupo
        const groupContent = processMultilingualContent(customListData[0], language);
        const groupName = groupContent.name || groupContent.seo_title || customListData[0].name || customListData[0].seo_title;
        const groupDescription = groupContent.description || groupContent.seo_description || customListData[0].description || customListData[0].seo_description;
        customListInfo = {
          id: groupId,
          tagId: groupTagId, // Tag principal del grupo para content
          slug: customListTag,
          displayName: groupName,
          description: groupDescription,
          icon: customListData[0].icon,
          color: customListData[0].color,
          minTags: customListData[0].min_tags || 1,
          minPillars: customListData[0].min_pillars || 1,
          tags: tagDetails
        };
      }
    }
  }
  // Generar información de tipo de propiedad por defecto si no se encontró
  if (!propertyTypeInfo && propertyTypeTag === 'propiedades') {
    propertyTypeInfo = {
      slug: 'propiedades',
      displayName: language === 'en' ? 'Properties' : language === 'fr' ? 'Propriétés' : 'Propiedades',
      category: 'property_type'
    };
  }
  // Paso 3: Obtener propiedades paginadas usando la RPC
  let properties = [];
  let totalCount = 0;
  // Parámetros de paginación
  const page = parseInt(queryParams.get('page') || '1');
  const pageSize = 32; // Establecido en 32 propiedades por página

  console.log('DEBUG: Starting property fetch. requiredTagIds:', requiredTagIds.length, 'optionalGroupTagIds:', optionalGroupTagIds.length);

  if (requiredTagIds.length > 0 && optionalGroupTagIds.length > 0) {
    console.log('DEBUG: Has required and optional tags, using find_properties_with_tag_count...');

    // Usar min_tags del grupo (como hace carousel-handler)
    const minTagMatches = customListInfo?.minTags || 1;
    console.log(`DEBUG: Using min_tag_matches: ${minTagMatches} (from tag_group.min_tags)`);

    // Obtener TODAS las propiedades que coincidan (sin paginación en RPC)
    const { data: taggedProperties, error: rpcError } = await supabase.rpc('find_properties_with_tag_count', {
      required_tag_ids: requiredTagIds,
      optional_tag_ids: optionalGroupTagIds,
      min_tag_matches: minTagMatches,
      result_limit: 1000 // Límite alto para obtener todas
    });

    console.log('DEBUG: find_properties_with_tag_count result:', {
      count: taggedProperties?.length || 0,
      error: rpcError
    });

    if (taggedProperties && taggedProperties.length > 0) {
      // Conteo total
      totalCount = taggedProperties.length;

      // Paginación manual (como hace carousel, pero aquí sí paginamos)
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedResults = taggedProperties.slice(startIndex, endIndex);

      console.log(`DEBUG: Total properties: ${totalCount}, Page: ${page}, Showing: ${paginatedResults.length}`);

      if (paginatedResults.length > 0) {
        const propertyIds = paginatedResults.map((p)=>p.property_id);
        console.log(`Found ${totalCount} total properties, displaying ${propertyIds.length} for page ${page}`);
        // Obtener detalles completos de las propiedades
        const { data: propertyDetails, error: propError } = await supabase.from('properties').select(`
            id, code, name, description, content_en, content_fr,
            main_image_url, sale_price, rental_price, sale_currency, rental_currency,
            furnished_rental_price, furnished_rental_currency, temp_rental_price, temp_rental_currency,
            bedrooms, bathrooms, built_area, land_area, parking_spots, is_project,
            slug_url, slug_en, slug_fr, property_status, availability,
            sector_id, city_id, category_id, gallery_images_url,
            users:agent_id(first_name, last_name, profile_photo_url, slug, position)
          `).in('id', propertyIds).eq('property_status', 'Publicada').eq('availability', 1);

        console.log('DEBUG: propertyDetails query result:', {
          count: propertyDetails?.length || 0,
          error: propError,
          hasData: !!propertyDetails
        });

        if (propertyDetails && propertyDetails.length > 0) {
          console.log('About to process propertyDetails, count:', propertyDetails.length);
          // Obtener IDs para fetchear datos relacionados
          const filteredPropIds = propertyDetails.map(p => p.id).filter(Boolean);
          const filteredCategoryIds = [...new Set(propertyDetails.map(p => p.category_id).filter(Boolean))];
          const filteredSectorIds = [...new Set(propertyDetails.map(p => p.sector_id).filter(Boolean))];
          const filteredCityIds = [...new Set(propertyDetails.map(p => p.city_id).filter(Boolean))];

          console.log('Fetching related data for:', { propIds: filteredPropIds.length, categories: filteredCategoryIds.length });

          // Fetch related data
          const filteredRelatedData = await fetchRelatedDataCurated(
            supabase,
            filteredPropIds,
            filteredCategoryIds,
            filteredSectorIds,
            filteredCityIds
          );

          console.log('Related data fetched:', {
            sectors: filteredRelatedData.sectorsData?.data?.length || 0,
            cities: filteredRelatedData.citiesData?.data?.length || 0,
            categories: filteredRelatedData.categoriesData?.data?.length || 0,
            amenities: filteredRelatedData.amenitiesData?.data?.length || 0
          });

          // Construir Maps
          const sectorsMap = new Map((filteredRelatedData.sectorsData?.data || []).map(s => [s.id, s.name]));
          const citiesMap = new Map((filteredRelatedData.citiesData?.data || []).map(c => [c.id, c.name]));
          const categoriesMap = new Map((filteredRelatedData.categoriesData?.data || []).map(cat => [cat.id, getCategoryName(cat, language)]));
          const amenitiesMap = new Map();
          (filteredRelatedData.amenitiesData?.data || []).forEach(pa => {
            if (!amenitiesMap.has(pa.property_id)) {
              amenitiesMap.set(pa.property_id, []);
            }
            if (pa.amenities) {
              amenitiesMap.get(pa.property_id).push(pa.amenities);
            }
          });

          const relatedData = { sectorsMap, citiesMap, categoriesMap, amenitiesMap };

          // Procesar propiedades con formato completo
          properties = propertyDetails.map((property)=>{
            // Encontrar información de coincidencia de tags para esta propiedad
            const matchInfo = paginatedResults.find((p)=>p.property_id === property.id);
            const tagMatches = matchInfo ? matchInfo.tag_match_count : 0;
            // Procesar la propiedad con datos relacionados
            const processedProperty = processCollectionProperty(property, relatedData, language, trackingString);
            if (!processedProperty) {
              console.error('processCollectionProperty returned null for property:', property.id);
              return null;
            }
            // Agregar información de coincidencias de tags
            return {
              ...processedProperty,
              tagMatches: tagMatches,
              matchScore: tagMatches
            };
          }).filter(Boolean);
          // Ordenar por número de coincidencias (mayor primero)
          properties.sort((a, b)=>b.tagMatches - a.tagMatches);
          console.log(`Processed ${properties.length} properties for display`);
        }
      }
    } else {
      // Si no hay custom-list, hacer una búsqueda más simple con solo tags requeridos
      const { data: propertiesData, count } = await supabase.from('content_tags').select('content_id', {
        count: 'exact',
        distinct: true
      }).eq('content_type', 'property').in('tag_id', requiredTagIds).order('content_id', {
        ascending: true
      }).range((page - 1) * pageSize, page * pageSize - 1);
      totalCount = count || 0;
      if (propertiesData && propertiesData.length > 0) {
        const propertyIds = propertiesData.map((p)=>p.content_id);
        console.log(`Found ${totalCount} total properties with required tags, displaying ${propertyIds.length} for page ${page}`);
        // Obtener detalles completos de las propiedades
        const { data: propertyDetails } = await supabase.from('properties').select(`
            id, code, name, description, content_en, content_fr,
            main_image_url, sale_price, rental_price, sale_currency, rental_currency,
            furnished_rental_price, furnished_rental_currency, temp_rental_price, temp_rental_currency,
            bedrooms, bathrooms, built_area, land_area, parking_spots, is_project,
            slug_url, slug_en, slug_fr, property_status, availability,
            sector_id, city_id, category_id, gallery_images_url,
            users:agent_id(first_name, last_name, profile_photo_url, slug, position)
          `).in('id', propertyIds).eq('property_status', 'Publicada').eq('availability', 1);
        if (propertyDetails && propertyDetails.length > 0) {
          // Obtener IDs para fetchear datos relacionados
          const simplePropIds = propertyDetails.map(p => p.id).filter(Boolean);
          const simpleCategoryIds = [...new Set(propertyDetails.map(p => p.category_id).filter(Boolean))];
          const simpleSectorIds = [...new Set(propertyDetails.map(p => p.sector_id).filter(Boolean))];
          const simpleCityIds = [...new Set(propertyDetails.map(p => p.city_id).filter(Boolean))];

          // Fetch related data
          const simpleRelatedData = await fetchRelatedDataCurated(
            supabase,
            simplePropIds,
            simpleCategoryIds,
            simpleSectorIds,
            simpleCityIds
          );

          // Construir Maps
          const sectorsMap = new Map((simpleRelatedData.sectorsData?.data || []).map(s => [s.id, s.name]));
          const citiesMap = new Map((simpleRelatedData.citiesData?.data || []).map(c => [c.id, c.name]));
          const categoriesMap = new Map((simpleRelatedData.categoriesData?.data || []).map(cat => [cat.id, getCategoryName(cat, language)]));
          const amenitiesMap = new Map();
          (simpleRelatedData.amenitiesData?.data || []).forEach(pa => {
            if (!amenitiesMap.has(pa.property_id)) {
              amenitiesMap.set(pa.property_id, []);
            }
            if (pa.amenities) {
              amenitiesMap.get(pa.property_id).push(pa.amenities);
            }
          });

          const relatedData = { sectorsMap, citiesMap, categoriesMap, amenitiesMap };

          properties = propertyDetails.map((property)=>processCollectionProperty(property, relatedData, language, trackingString));
          console.log(`Processed ${properties.length} properties for display`);
        }
      }
    }
  }
  // Paso 4: Generar información SEO
  const countryName = baseData?.country?.name || getCountryName(language);
  const seoInfo = buildSEOInfo(language, propertyTypeInfo, customListInfo, locationInfo, cityInfo, countryName, properties.length, totalCount);
  // Paso 5: Construir breadcrumbs
  const breadcrumbs = buildBreadcrumbs(language, propertyTypeInfo, customListInfo, cityInfo, locationInfo, contentSegments, trackingString);
  // Paso 6: Construir paginación
  const totalPages = Math.ceil(totalCount / pageSize);
  const pagination = {
    page,
    limit: pageSize,
    total: totalCount,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
  // Paso 7: Obtener TODOS los listados curados disponibles para navegación
  const { data: allTagGroups } = await supabase
    .from('tag_groups')
    .select('id, name, name_en, name_fr, slug, slug_en, slug_fr, description, description_en, description_fr, active')
    .eq('active', true)
    .order('name', { ascending: true });

  const availableCuratedListings = (allTagGroups || []).map(group => {
    let displayName = group.name;
    let displaySlug = group.slug;
    let displayDescription = group.description || '';

    if (language === 'en') {
      displayName = group.name_en || group.name;
      displaySlug = group.slug_en || group.slug;
      displayDescription = group.description_en || group.description || '';
    } else if (language === 'fr') {
      displayName = group.name_fr || group.name;
      displaySlug = group.slug_fr || group.slug;
      displayDescription = group.description_fr || group.description || '';
    }

    // Construir URL completa
    let url = '';
    if (propertyTypeInfo) {
      const basePath = language === 'es' ? 'listados-de' : language === 'en' ? 'listings-of' : 'listes-de';
      url = `/${basePath}/${propertyTypeInfo.slug}/${displaySlug}`;
      if (language !== 'es') url = `/${language}${url}`;
    }

    return {
      id: group.id,
      name: displayName,
      slug: displaySlug,
      description: displayDescription,
      url: url + trackingString,
      isActive: customListInfo?.id === group.id
    };
  });

  // Paso 7b: Obtener colecciones relacionadas (mantener para compatibilidad)
  const relatedCollections = await getRelatedCollections(supabase, requiredTagIds, optionalGroupTagIds, language, trackingString);

  // Paso 7c: Obtener artículos, videos, seo_content y faqs que tengan el TAG DEL GRUPO (no los tags internos)
  let relatedArticles = [];
  let relatedVideos = [];
  let relatedSeoContent = [];
  let relatedFaqs = [];

  if (customListInfo && customListInfo.tagId) {
    // Usar directamente el tag_id del grupo para búsqueda más rápida
    const groupTagId = customListInfo.tagId;

    console.log(`DEBUG: Fetching articles, videos, seo_content and faqs for tag_id: ${groupTagId}`);

    if (groupTagId) {
    // Paso 1: Obtener IDs de artículos que tienen este tag
    const { data: articleIds } = await supabase
      .from('content_tags')
      .select('content_id')
      .eq('content_type', 'article')
      .eq('tag_id', groupTagId);

    console.log('DEBUG: Article IDs with tag:', articleIds?.length || 0);

    // Paso 2: Si hay artículos, obtener sus detalles
    if (articleIds && articleIds.length > 0) {
      const ids = articleIds.map(item => item.content_id);
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles')
        .select(`
          id, title, slug, slug_en, slug_fr, excerpt, featured_image, published_at, read_time, views, category,
          users:users!articles_author_id_fkey(first_name, last_name, profile_photo_url)
        `)
        .in('id', ids)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(6);

      console.log('DEBUG: Articles query result:', {
        count: articlesData?.length || 0,
        error: articlesError
      });

      relatedArticles = (articlesData || []).map(article => {
        const slug = language === 'en' ? (article.slug_en || article.slug) :
                     language === 'fr' ? (article.slug_fr || article.slug) :
                     article.slug;

        // El slug ya incluye el basePath completo (ej: "articulos/categoria/titulo")
        const url = language === 'es' ? `/${slug}` : `/${language}/${slug}`;

        return {
          id: article.id,
          title: article.title,
          excerpt: article.excerpt,
          featuredImage: article.featured_image,
          publishedAt: article.published_at,
          readTime: article.read_time,
          views: article.views,
          category: article.category,
          url: url + trackingString,
          author: article.users ? {
            name: `${article.users.first_name || ''} ${article.users.last_name || ''}`.trim() || 'Equipo CLIC',
            avatar: article.users.profile_photo_url || '/images/team/clic-experts.jpg'
          } : {
            name: 'Equipo CLIC',
            avatar: '/images/team/clic-experts.jpg'
          }
        };
      });
    }

    // Paso 3: Obtener IDs de videos que tienen este tag
    const { data: videoIds } = await supabase
      .from('content_tags')
      .select('content_id')
      .eq('content_type', 'video')
      .eq('tag_id', groupTagId);

    console.log('DEBUG: Video IDs with tag:', videoIds?.length || 0);

    // Paso 4: Si hay videos, obtener sus detalles
    if (videoIds && videoIds.length > 0) {
      const ids = videoIds.map(item => item.content_id);
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('id, title, description, video_slug, slug_en, slug_fr, thumbnail, video_id, video_platform, duration, views, published_at, category')
        .in('id', ids)
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(6);

      console.log('DEBUG: Videos query result:', {
        count: videosData?.length || 0,
        error: videosError
      });

      relatedVideos = (videosData || []).map(video => {
        const slug = language === 'en' ? (video.slug_en || video.video_slug) :
                     language === 'fr' ? (video.slug_fr || video.video_slug) :
                     video.video_slug;

        // El slug ya incluye el basePath completo (ej: "videos/categoria/titulo")
        const url = language === 'es' ? `/${slug}` : `/${language}/${slug}`;

        return {
          id: video.id,
          title: video.title,
          description: video.description,
          thumbnail: video.thumbnail,
          videoId: video.video_id,
          videoPlatform: video.video_platform,
          duration: video.duration,
          views: video.views,
          publishedAt: video.published_at,
          category: video.category,
          url: url + trackingString
        };
      });
    }

    // Paso 5: Obtener IDs de seo_content que tienen este tag
    const { data: seoContentIds } = await supabase
      .from('content_tags')
      .select('content_id')
      .eq('content_type', 'seo_content')
      .eq('tag_id', groupTagId);

    console.log('DEBUG: SEO Content IDs with tag:', seoContentIds?.length || 0);

    // Paso 6: Si hay seo_content, obtener sus detalles
    if (seoContentIds && seoContentIds.length > 0) {
      const ids = seoContentIds.map(item => item.content_id);
      const { data: seoContentData, error: seoContentError } = await supabase
        .from('seo_content')
        .select('id, title, description, h1_title, h2_subtitle, seo_content, seo_sections, slug, meta_title, meta_description, canonical_url, content_en, content_fr')
        .in('id', ids)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(6);

      console.log('DEBUG: SEO Content query result:', {
        count: seoContentData?.length || 0,
        error: seoContentError
      });

      relatedSeoContent = (seoContentData || []).map(content => {
        // Procesar contenido multilingüe si existe
        let displayTitle = content.title;
        let displayDescription = content.description;

        if (language === 'en' && content.content_en) {
          const contentEn = typeof content.content_en === 'string' ? JSON.parse(content.content_en) : content.content_en;
          displayTitle = contentEn.title || content.title;
          displayDescription = contentEn.description || content.description;
        } else if (language === 'fr' && content.content_fr) {
          const contentFr = typeof content.content_fr === 'string' ? JSON.parse(content.content_fr) : content.content_fr;
          displayTitle = contentFr.title || content.title;
          displayDescription = contentFr.description || content.description;
        }

        // El slug ya está completo
        const url = content.canonical_url || (language === 'es' ? `/${content.slug}` : `/${language}/${content.slug}`);

        // Procesar seo_sections si existe
        let sections = [];
        if (content.seo_sections) {
          try {
            sections = typeof content.seo_sections === 'string'
              ? JSON.parse(content.seo_sections)
              : content.seo_sections;

            // Asegurar que sea un array
            if (!Array.isArray(sections)) {
              sections = [];
            }

            // Ordenar por order field si existe
            sections.sort((a, b) => (a.order || 0) - (b.order || 0));
          } catch (e) {
            console.error('Error parsing seo_sections:', e);
            sections = [];
          }
        }

        return {
          id: content.id,
          title: displayTitle,
          description: displayDescription,
          h1: content.h1_title,
          h2: content.h2_subtitle,
          content: content.seo_content,
          sections: sections,
          slug: content.slug,
          metaTitle: content.meta_title,
          metaDescription: content.meta_description,
          url: url + trackingString
        };
      });
    }

    // Paso 7: Obtener IDs de faqs que tienen este tag
    const { data: faqIds } = await supabase
      .from('content_tags')
      .select('content_id')
      .eq('content_type', 'faq')
      .eq('tag_id', groupTagId);

    console.log('DEBUG: FAQ IDs with tag:', faqIds?.length || 0);

    // Paso 8: Si hay faqs, obtener sus detalles
    if (faqIds && faqIds.length > 0) {
      const ids = faqIds.map(item => item.content_id);
      const { data: faqsData, error: faqsError } = await supabase
        .from('faqs')
        .select('id, question, answer, category, slug, sort_order, featured, views, content_en, content_fr')
        .in('id', ids)
        .eq('status', 'published')
        .order('featured', { ascending: false })
        .order('sort_order', { ascending: true })
        .limit(10);

      console.log('DEBUG: FAQs query result:', {
        count: faqsData?.length || 0,
        error: faqsError
      });

      relatedFaqs = (faqsData || []).map(faq => {
        // Procesar contenido multilingüe si existe
        let displayQuestion = faq.question;
        let displayAnswer = faq.answer;

        if (language === 'en' && faq.content_en) {
          const contentEn = typeof faq.content_en === 'string' ? JSON.parse(faq.content_en) : faq.content_en;
          displayQuestion = contentEn.question || faq.question;
          displayAnswer = contentEn.answer || faq.answer;
        } else if (language === 'fr' && faq.content_fr) {
          const contentFr = typeof faq.content_fr === 'string' ? JSON.parse(faq.content_fr) : faq.content_fr;
          displayQuestion = contentFr.question || faq.question;
          displayAnswer = contentFr.answer || faq.answer;
        }

        return {
          id: faq.id,
          question: displayQuestion,
          answer: displayAnswer,
          category: faq.category,
          slug: faq.slug,
          featured: faq.featured,
          views: faq.views
        };
      });
    }
    }
  }

  // Paso 8: Calcular estadísticas
  const stats = {
    totalProperties: totalCount,
    displayedProperties: properties.length,
    tags: {
      propertyType: propertyTypeInfo?.displayName,
      customList: customListInfo?.displayName,
      location: locationInfo?.displayName,
      city: cityInfo?.displayName
    }
  };
  // Paso 9: Construir respuesta final
  const canonicalPath = `/${contentSegments.join('/')}`;
  const canonicalUrl = language === 'es' ? canonicalPath : `/${language}${canonicalPath}`;

  console.log('DEBUG: Final response being built with properties count:', properties.length);

  const response = {
    type: 'curated-listings-single',
    pageType: 'curated-listings-single',
    language,
    seo: {
      title: seoInfo.title,
      description: seoInfo.description,
      h1: seoInfo.h1,
      h2: seoInfo.h2,
      canonical_url: canonicalUrl,
      breadcrumbs
    },
    listing: {
      title: seoInfo.h1,
      subtitle: seoInfo.h2,
      description: seoInfo.description,
      stats: {
        propertiesCount: properties.length,
        avgRoi: stats.avgRoi || 'N/A',
        occupancyRate: stats.occupancyRate || 'N/A',
        avgNightly: stats.avgNightly || 'N/A'
      },
      benefits: []
    },
    properties,
    availableCuratedListings,
    relatedCollections,
    relatedArticles,
    relatedVideos,
    relatedSeoContent,
    relatedFaqs,
    pagination,
    tags: {
      propertyType: propertyTypeInfo,
      customList: customListInfo,
      location: locationInfo,
      city: cityInfo
    },
    stats,
    segments: contentSegments
  };

  console.log('DEBUG: Response properties count:', response.properties?.length);

  return response;
}
// Función para identificar el tipo de cada segmento
async function identifySegmentTypes(supabase, segments) {
  if (!segments || segments.length === 0) return [];
  const segmentTypes = [];
  for (const segment of segments){
    if (segment === 'propiedades') {
      segmentTypes.push('all_properties');
      continue;
    }
    // Buscar el segmento en diferentes categorías de tags
    const { data: tagData } = await supabase.from('tags').select('category').or(`slug.eq.${segment},slug_en.eq.${segment},slug_fr.eq.${segment}`).limit(1);
    if (tagData && tagData.length > 0) {
      segmentTypes.push(tagData[0].category);
    } else {
      // Buscar como grupo de tags (custom list)
      const { data: groupData } = await supabase.from('tag_groups').select('id').or(`slug.eq.${segment},slug_en.eq.${segment},slug_fr.eq.${segment}`).limit(1);
      if (groupData && groupData.length > 0) {
        segmentTypes.push('custom_list');
      } else {
        // Si no encontramos el tag, intentamos adivinar por patrones comunes
        if ([
          'apartamentos',
          'casas',
          'villas',
          'terrenos',
          'apartments',
          'houses',
          'lands'
        ].includes(segment)) {
          segmentTypes.push('property_type');
        } else if (segment.includes('-para-') || segment.includes('-con-') || segment.includes('-for-') || segment.includes('-with-')) {
          segmentTypes.push('custom_list');
        } else {
          // Fallback genérico
          segmentTypes.push('unknown');
        }
      }
    }
  }
  return segmentTypes;
}
// Función auxiliar para obtener nombre de display del tag según idioma
function getTagDisplayName(tag, language) {
  if (!tag) return '';
  if (language === 'en' && tag.display_name_en) {
    return tag.display_name_en;
  } else if (language === 'fr' && tag.display_name_fr) {
    return tag.display_name_fr;
  }
  return tag.display_name || tag.name || '';
}
// Función para construir información SEO
function buildSEOInfo(language, propertyTypeInfo, customListInfo, locationInfo, cityInfo, countryName, propertiesCount, totalCount) {
  let title = '';
  let description = '';
  let h1 = '';
  let h2 = '';
  // Obtener nombres para SEO
  const propertyTypeName = propertyTypeInfo?.displayName || '';
  const customListName = customListInfo?.displayName || '';
  const locationName = locationInfo?.displayName || '';
  const cityName = cityInfo?.displayName || '';
  // Construir títulos y descripciones basados en los tags
  if (propertyTypeName && customListName && locationName && cityName) {
    title = `${propertyTypeName} ${customListName} en ${locationName}, ${cityName} | CLIC Inmobiliaria`;
    h1 = `${propertyTypeName} ${customListName} en ${locationName}, ${cityName}`;
    description = `Descubre nuestra selección de ${propertyTypeName.toLowerCase()} ${customListName.toLowerCase()} en ${locationName}, ${cityName}, ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  } else if (propertyTypeName && customListName && locationName) {
    title = `${propertyTypeName} ${customListName} en ${locationName} | CLIC Inmobiliaria`;
    h1 = `${propertyTypeName} ${customListName} en ${locationName}`;
    description = `Descubre nuestra selección de ${propertyTypeName.toLowerCase()} ${customListName.toLowerCase()} en ${locationName}, ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  } else if (propertyTypeName && customListName) {
    title = `${propertyTypeName} ${customListName} en ${countryName} | CLIC Inmobiliaria`;
    h1 = `${propertyTypeName} ${customListName}`;
    description = `Descubre nuestra selección de ${propertyTypeName.toLowerCase()} ${customListName.toLowerCase()} en ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  } else if (propertyTypeName) {
    title = `${propertyTypeName} en ${countryName} | CLIC Inmobiliaria`;
    h1 = `${propertyTypeName} en ${countryName}`;
    description = `Descubre nuestra selección de ${propertyTypeName.toLowerCase()} en ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  } else if (customListName) {
    title = `Propiedades ${customListName} en ${countryName} | CLIC Inmobiliaria`;
    h1 = `Propiedades ${customListName} en ${countryName}`;
    description = `Descubre nuestra selección de propiedades ${customListName.toLowerCase()} en ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  } else {
    title = `Propiedades Curadas en ${countryName} | CLIC Inmobiliaria`;
    h1 = `Propiedades Curadas en ${countryName}`;
    description = `Descubre nuestra selección de propiedades curadas en ${countryName}. Propiedades seleccionadas para inversión inmobiliaria.`;
    h2 = `${totalCount} propiedades disponibles`;
  }
  // Traducir según el idioma
  if (language === 'en') {
    title = title.replace('en', 'in').replace('Propiedades', 'Properties').replace('disponibles', 'available');
    description = description.replace('Descubre', 'Discover').replace('nuestra selección', 'our selection').replace('propiedades seleccionadas', 'properties selected').replace('inversión inmobiliaria', 'real estate investment');
    h2 = h2.replace('propiedades disponibles', 'properties available');
  } else if (language === 'fr') {
    title = title.replace('en', 'à').replace('Propiedades', 'Propriétés').replace('disponibles', 'disponibles');
    description = description.replace('Descubre', 'Découvrez').replace('nuestra selección', 'notre sélection').replace('propiedades seleccionadas', 'propriétés sélectionnées').replace('inversión inmobiliaria', 'investissement immobilier');
    h2 = h2.replace('propiedades disponibles', 'propriétés disponibles');
  }
  return {
    title,
    description,
    h1,
    h2
  };
}
// Función para construir breadcrumbs
function buildBreadcrumbs(language, propertyTypeInfo, customListInfo, cityInfo, locationInfo, contentSegments, trackingString) {
  let breadcrumbs = [
    {
      name: getUIText('HOME', language),
      url: language === 'es' ? '/' : `/${language}/`
    },
    {
      name: language === 'en' ? 'Curated Listings' : language === 'fr' ? 'Listes Sélectionnées' : 'Listados Curados',
      url: language === 'es' ? '/listados-de' : `/${language}/${language === 'en' ? 'listings-of' : 'listes-de'}`
    }
  ];
  // Agregar nivel de propiedad si existe
  if (propertyTypeInfo) {
    const propertyTypeUrl = language === 'es' ? `/listados-de/${propertyTypeInfo.slug}` : `/${language}/${language === 'en' ? 'listings-of' : 'listes-de'}/${propertyTypeInfo.slug}`;
    breadcrumbs.push({
      name: propertyTypeInfo.displayName,
      url: propertyTypeUrl + trackingString
    });
  }
  // Agregar nivel de lista personalizada si existe
  if (customListInfo) {
    const baseUrl = breadcrumbs[breadcrumbs.length - 1].url.replace(trackingString, '');
    const customListUrl = propertyTypeInfo ? `${baseUrl}/${customListInfo.slug}` : `${breadcrumbs[1].url}/${customListInfo.slug}`;
    breadcrumbs.push({
      name: customListInfo.displayName,
      url: customListUrl + trackingString
    });
  }
  // Agregar nivel de ciudad si existe
  if (cityInfo) {
    const baseUrl = breadcrumbs[breadcrumbs.length - 1].url.replace(trackingString, '');
    const cityUrl = `${baseUrl}/${cityInfo.slug}`;
    breadcrumbs.push({
      name: cityInfo.displayName,
      url: cityUrl + trackingString
    });
  }
  // Agregar nivel de ubicación/sector si existe
  if (locationInfo && !breadcrumbs.some((b)=>b.name === locationInfo.displayName)) {
    const baseUrl = breadcrumbs[breadcrumbs.length - 1].url.replace(trackingString, '');
    const locationUrl = `${baseUrl}/${locationInfo.slug}`;
    breadcrumbs.push({
      name: locationInfo.displayName,
      url: locationUrl + trackingString
    });
  }
  return breadcrumbs;
}
// Función para obtener colecciones relacionadas
async function getRelatedCollections(supabase, requiredTagIds, optionalTagIds, language, trackingString) {
  // Buscar colecciones relacionadas con los mismos tags o temas
  const tagIds = [
    ...requiredTagIds,
    ...optionalTagIds
  ].slice(0, 5); // Limitar para evitar consultas muy grandes
  if (tagIds.length === 0) {
    // Si no hay tags, obtener colecciones destacadas
    const { data: featuredCollections } = await supabase.from('curated_collections').select(`
        id, title, description, slug, slug_en, slug_fr, featured_image, 
        property_count, collection_type, content_en, content_fr
      `).eq('status', 'published').eq('active', true).eq('featured', true).limit(3);
    if (featuredCollections && featuredCollections.length > 0) {
      return featuredCollections.map((collection)=>processCuratedCollection(collection, language, trackingString));
    }
    return [];
  }
  // Buscar colecciones con tags similares
  const { data: collectionTags } = await supabase.from('content_tags').select('content_id').eq('content_type', 'collection').in('tag_id', tagIds).limit(20);
  if (collectionTags && collectionTags.length > 0) {
    const collectionIds = [
      ...new Set(collectionTags.map((ct)=>ct.content_id))
    ];
    const { data: collections } = await supabase.from('curated_collections').select(`
        id, title, description, slug, slug_en, slug_fr, featured_image, 
        property_count, collection_type, content_en, content_fr
      `).in('id', collectionIds).eq('status', 'published').eq('active', true).limit(3);
    if (collections && collections.length > 0) {
      return collections.map((collection)=>processCuratedCollection(collection, language, trackingString));
    }
  }
  // Si no se encuentran colecciones relacionadas, devolver colecciones recientes
  const { data: recentCollections } = await supabase.from('curated_collections').select(`
      id, title, description, slug, slug_en, slug_fr, featured_image, 
      property_count, collection_type, content_en, content_fr
    `).eq('status', 'published').eq('active', true).order('created_at', {
    ascending: false
  }).limit(3);
  if (recentCollections && recentCollections.length > 0) {
    return recentCollections.map((collection)=>processCuratedCollection(collection, language, trackingString));
  }
  return [];
}
// Función para obtener nombre del país
function getCountryName(language) {
  if (language === 'en') return 'Dominican Republic';
  if (language === 'fr') return 'République Dominicaine';
  return 'República Dominicana';
}
// Función para procesar contenido multilingüe
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
// Función auxiliar para obtener nombre legible de un tag
async function getReadableTagName(supabase, slug, category, language) {
  if (!slug) return null;
  // Casos especiales
  if (slug === 'propiedades') {
    return language === 'en' ? 'Properties' : language === 'fr' ? 'Propriétés' : 'Propiedades';
  }
  const { data: tagData } = await supabase.from('tags').select('display_name, display_name_en, display_name_fr').eq('category', category).or(`slug.eq.${slug},slug_en.eq.${slug},slug_fr.eq.${slug}`).limit(1);
  if (tagData && tagData.length > 0) {
    if (language === 'en' && tagData[0].display_name_en) {
      return tagData[0].display_name_en;
    } else if (language === 'fr' && tagData[0].display_name_fr) {
      return tagData[0].display_name_fr;
    }
    return tagData[0].display_name;
  }
  // Si no encuentra el tag, devuelve el slug formateado
  return slug.replace(/-/g, ' ').replace(/\b\w/g, (l)=>l.toUpperCase());
}
