import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleSingleProperty } from './single-property-handler.ts';
import { getCarouselsOptimized } from './carousel-handler.ts';
import { getSearchTagsHandler } from './search-tags-handler.ts';
import { calculatePropertyAggregations, generateAdvancedStructuredData, generateTwitterCardMeta, generateSEOKeywords, generateAdditionalMetaTags } from './seo-utils.ts';
import { detectCountryAndDomain } from './country-detector.ts';
import { extractTrackingString } from './tracking-utils.ts';
import { getUIText, formatPrice } from './ui-texts.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// ============================================================================
// UTILITY FUNCTIONS FOR URL BUILDING
// ============================================================================
function buildUrlWithTracking(basePath, language, trackingString) {
  let url = basePath || '';
  // Add language prefix if not Spanish
  if (language !== 'es' && language && url) {
    url = `${language}/${url}`;
  }
  // Ensure leading slash
  if (url && !url.startsWith('/')) {
    url = `/${url}`;
  }
  // Handle empty URL case
  if (!url || url === '/') {
    return trackingString ? `/${trackingString.substring(1)}` : '/';
  }
  // Add tracking string
  return url + trackingString;
}
function ensureTrackingOnUrl(url, trackingString) {
  if (!url) return trackingString ? `/${trackingString.substring(1)}` : '/';
  if (!url.startsWith('/')) url = `/${url}`;
  return url + trackingString;
}
// ============================================================================
// HELPER FUNCTIONS WITH DEFENSIVE PROGRAMMING
// ============================================================================
function safeArray(input, defaultValue = []) {
  return Array.isArray(input) ? input : defaultValue;
}
function safeString(input, defaultValue = '') {
  return typeof input === 'string' ? input : defaultValue;
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
  // FALLBACK: Si no hay amenidades, usar características inteligentes
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
function validateTagGroupRequirements(requirements, userTagsDetails) {
  if (!requirements) return true;
  try {
    const reqObj = typeof requirements === 'string' ? JSON.parse(requirements) : requirements;
    const { category = [], location = [], operation = [], match_type = 'any' } = reqObj;
    const safeUserTagsDetails = safeArray(userTagsDetails);
    const userCategories = safeUserTagsDetails.filter((tag)=>tag.category === 'categoria').map((tag)=>tag.name) || [];
    const userOperations = safeUserTagsDetails.filter((tag)=>tag.category === 'operacion').map((tag)=>tag.name) || [];
    const userLocations = safeUserTagsDetails.filter((tag)=>tag.category === 'ciudad' || tag.category === 'sector').map((tag)=>tag.name) || [];
    const checks = [];
    // Validar categorías
    if (Array.isArray(category) && category.length > 0) {
      const categoryMatch = category.some((reqCat)=>userCategories.some((userCat)=>userCat.toLowerCase().includes(reqCat.toLowerCase()) || reqCat.toLowerCase().includes(userCat.toLowerCase())));
      checks.push(categoryMatch);
    }
    // Validar operaciones
    if (Array.isArray(operation) && operation.length > 0) {
      const operationMatch = operation.some((reqOp)=>userOperations.some((userOp)=>userOp.toLowerCase().includes(reqOp.toLowerCase()) || reqOp.toLowerCase().includes(userOp.toLowerCase())));
      checks.push(operationMatch);
    }
    // Validar ubicaciones
    if (Array.isArray(location) && location.length > 0) {
      const locationMatch = location.some((reqLoc)=>userLocations.some((userLoc)=>userLoc.toLowerCase().includes(reqLoc.toLowerCase()) || reqLoc.toLowerCase().includes(userLoc.toLowerCase())));
      checks.push(locationMatch);
    }
    // Si no hay requirements específicos, aceptar
    if (checks.length === 0) return true;
    // Aplicar lógica de match_type
    return match_type === 'all' ? checks.every(Boolean) : checks.some(Boolean);
  } catch (e) {
    console.warn('Error parsing requirements:', e);
    return true;
  }
}
function buildCarouselViewAllUrl(tagGroup, userTagsDetails, language, trackingString) {
  const userTagSlugs = [];
  const priorityOrder = [
    'operacion',
    'categoria',
    'ciudad',
    'sector',
    'precio',
    'habitaciones',
    'banos',
    'parqueos'
  ];
  const safeUserTagsDetails = safeArray(userTagsDetails);
  if (safeUserTagsDetails.length > 0) {
    const filteredTags = safeUserTagsDetails.filter((tag)=>tag.category !== 'pais' && tag.category !== 'custom-list');
    const sortedTags = filteredTags.sort((a, b)=>{
      const aPriority = priorityOrder.indexOf(a.category);
      const bPriority = priorityOrder.indexOf(b.category);
      if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      return 0;
    });
    sortedTags.forEach((tag)=>{
      const tagSlug = language === 'en' && tag.slug_en ? tag.slug_en : language === 'fr' && tag.slug_fr ? tag.slug_fr : tag.slug;
      if (tagSlug) {
        userTagSlugs.push(tagSlug);
      }
    });
  }
  // Agregar slug del tag group
  if (tagGroup) {
    const groupSlug = language === 'en' && tagGroup.slug_en ? tagGroup.slug_en : language === 'fr' && tagGroup.slug_fr ? tagGroup.slug_fr : tagGroup.slug;
    if (groupSlug) {
      userTagSlugs.push(groupSlug);
    }
  }
  // Construir URL
  let url = userTagSlugs.join('/');
  if (language !== 'es') {
    url = `${language}/${url}`;
  }
  return `/${url}${trackingString || ''}`;
}
// ============================================================================
// FUNCIÓN PARA PROCESAR CONFIGURACIÓN DEL PAÍS
// ============================================================================
function processCountryConfig(config, language, trackingString) {
  if (!config) return null;
  const processedConfig = JSON.parse(JSON.stringify(config)); // Deep clone
  // Procesar URLs del header
  if (processedConfig.features?.header?.sections) {
    Object.keys(processedConfig.features.header.sections).forEach((sectionKey)=>{
      const section = processedConfig.features.header.sections[sectionKey];
      if (section.urls) {
        Object.keys(section.urls).forEach((lang)=>{
          section.urls[lang] = ensureTrackingOnUrl(section.urls[lang], trackingString);
        });
        if (section.urls[language]) {
          section.currentUrl = section.urls[language];
        }
      }
    });
  }
  // Procesar URLs del footer
  if (processedConfig.footer_links) {
    [
      'properties_by_zone',
      'services',
      'resources'
    ].forEach((linkType)=>{
      if (processedConfig.footer_links[linkType] && Array.isArray(processedConfig.footer_links[linkType])) {
        processedConfig.footer_links[linkType] = processedConfig.footer_links[linkType].map((item)=>{
          const baseUrl = item.urls?.[language] || item.urls?.es || '';
          const finalUrl = baseUrl === '' ? `/${trackingString ? trackingString.substring(1) : ''}` : ensureTrackingOnUrl(baseUrl, trackingString);
          return {
            ...item,
            label: item.label?.[language] || item.label?.es || item.label,
            url: finalUrl
          };
        });
      }
    });
  }
  const translations = processedConfig.translations?.[language] || processedConfig.translations?.es || {};
  return {
    country: processedConfig.country || 'DO',
    language: language,
    contact: processedConfig.contact || {},
    social: processedConfig.social || {},
    legal: processedConfig.legal || {},
    team: processedConfig.team || {},
    features: processedConfig.features || {},
    footer_links: processedConfig.footer_links || {},
    office: processedConfig.office || {},
    seo: processedConfig.seo || {},
    certifications: processedConfig.certifications || [],
    translations: translations
  };
}
// ============================================================================
// MAIN DATA FETCHING FUNCTIONS WITH DEFENSIVE PROGRAMMING
// ============================================================================
async function getCountryAndTags(supabase, tags, language, domainInfo) {
  const countryData = domainInfo.country;
  const countryTag = countryData?.tags;
  let validatedTags = [];
  const safeTags = safeArray(tags);
  if (safeTags.length > 0) {
    // Detectar si contiene patrones de precio
    const isPricePattern = (segment)=>{
      // Detectar cualquier slug que empiece con precio/price/prix
      if (segment.startsWith('precio-') || segment.startsWith('price-') || segment.startsWith('prix-')) {
        return true;
      }
      // Detectar patrones numéricos de rango
      if (/desde-\d+/.test(segment) || /hasta-\d+/.test(segment) || /-\d+-a-\d+-/.test(segment)) {
        return true;
      }
      return false;
    };
    // Separar tags normales de tags de precio
    const normalTags = [];
    const priceTags = [];
    safeTags.forEach((tag)=>{
      if (isPricePattern(tag)) {
        priceTags.push(tag);
      } else {
        normalTags.push(tag);
      }
    });
    console.log('Tags separated:', {
      normalTags,
      priceTags
    });
    // 1. PROCESAR TAGS NORMALES
    let normalValidatedTags = [];
    if (normalTags.length > 0) {
      let slugField = 'slug';
      if (language === 'en') slugField = 'slug_en';
      if (language === 'fr') slugField = 'slug_fr';
      const { data: tagResults, error: tagError } = await supabase.from('tags').select('id, slug, slug_en, slug_fr, category, display_name, display_name_en, display_name_fr, name').in(slugField, normalTags).eq('active', true);
      if (tagError) {
        console.error('Error fetching normal tags:', tagError);
      } else {
        const safeTagResults = safeArray(tagResults);
        // Mantener el orden original de los tags
        for (const tag of normalTags){
          const foundTag = safeTagResults.find((t)=>t[slugField] === tag);
          if (foundTag) {
            normalValidatedTags.push({
              slug: tag,
              id: foundTag.id,
              category: foundTag.category,
              display_name: foundTag.display_name,
              display_name_en: foundTag.display_name_en,
              display_name_fr: foundTag.display_name_fr,
              name: foundTag.name,
              slug_en: foundTag.slug_en,
              slug_fr: foundTag.slug_fr,
              original_slug: foundTag.slug
            });
          }
        }
      }
    }
    // 2. PROCESAR TAGS DE PRECIO
    let priceValidatedTags = [];
    if (priceTags.length > 0) {
      console.log('Searching price range tags for complete slugs:', priceTags);
      const { data: priceRangeData, error: priceError } = await supabase.from('price_ranges').select(`
    range_slug, 
    base_tag_id,
    operation_tag_id,
    operation,
    display_label, 
    display_label_en, 
    display_label_fr, 
    currency,
    min_value,
    max_value
  `).in('range_slug', priceTags).eq('active', true);
      if (priceError) {
        console.error('Error fetching price range tags:', priceError);
      } else {
        const safePriceRangeData = safeArray(priceRangeData);
        console.log('Found price range tags:', safePriceRangeData.length);
        if (safePriceRangeData.length > 0) {
          const baseTagIds = [
            ...new Set(safePriceRangeData.map((pr)=>pr.base_tag_id))
          ];
          const { data: baseTags, error: baseError } = await supabase.from('tags').select('id, category, slug, slug_en, slug_fr, display_name, display_name_en, display_name_fr, name').in('id', baseTagIds);
          if (baseError) {
            console.error('Error fetching base tags for price ranges:', baseError);
          } else {
            const safeBaseTags = safeArray(baseTags);
            for (const priceTag of priceTags){
              const priceRange = safePriceRangeData.find((pr)=>pr.range_slug === priceTag);
              if (priceRange) {
                const baseTag = safeBaseTags.find((bt)=>bt.id === priceRange.base_tag_id);
                if (baseTag) {
                  priceValidatedTags.push({
                    slug: priceRange.range_slug,
                    id: baseTag.id,
                    category: baseTag.category,
                    display_name: priceRange.display_label,
                    display_name_en: priceRange.display_label_en || priceRange.display_label,
                    display_name_fr: priceRange.display_label_fr || priceRange.display_label,
                    name: baseTag.name,
                    slug_en: baseTag.slug_en,
                    slug_fr: baseTag.slug_fr,
                    currency: priceRange.currency,
                    min_value: priceRange.min_value,
                    max_value: priceRange.max_value,
                    operation: priceRange.operation,
                    operation_tag_id: priceRange.operation_tag_id,
                    is_price_range: true,
                    base_tag_id: priceRange.base_tag_id,
                    price_range_slug: priceRange.range_slug,
                    original_slug: baseTag.slug
                  });
                  console.log('Mapped price tag:', {
                    originalSlug: priceRange.range_slug,
                    baseTagId: baseTag.id,
                    displayLabel: priceRange.display_label,
                    currency: priceRange.currency,
                    range: `${priceRange.min_value}-${priceRange.max_value}`
                  });
                }
              }
            }
          }
        }
      }
    }
    // 3. COMBINAR MANTENIENDO ORDEN ORIGINAL
    validatedTags = [];
    for (const originalTag of safeTags){
      const normalTag = normalValidatedTags.find((t)=>t.slug === originalTag);
      if (normalTag) {
        validatedTags.push(normalTag);
        continue;
      }
      const priceTag = priceValidatedTags.find((t)=>t.slug === originalTag);
      if (priceTag) {
        validatedTags.push(priceTag);
      }
    }
    console.log('Final validated tags summary:', {
      normal: normalValidatedTags.length,
      price: priceValidatedTags.length,
      total: validatedTags.length,
      originalOrder: safeTags,
      finalOrder: validatedTags.map((t)=>t.slug)
    });
  }
  return {
    country: countryData,
    countryTag: countryTag,
    validatedTags
  };
}
async function fetchPropertiesData(supabase, allTagIds, page, limit) {
  const safeAllTagIds = safeArray(allTagIds);
  if (safeAllTagIds.length === 0) {
    return {
      properties: [],
      allPropertyIds: [],
      pagination: {
        page: page || 1,
        limit: limit || 32,
        total_properties: 0,
        total_pages: 0,
        has_next_page: false,
        has_prev_page: false
      }
    };
  }
  const { data: allPropertyIds, error: propertyIdsError } = await supabase.rpc('get_properties_with_all_tags', {
    tag_ids: safeAllTagIds
  });
  if (propertyIdsError) {
    console.error('Property IDs RPC Error:', propertyIdsError);
    return {
      properties: [],
      allPropertyIds: [],
      pagination: {
        page: page || 1,
        limit: limit || 32,
        total_properties: 0,
        total_pages: 0,
        has_next_page: false,
        has_prev_page: false
      }
    };
  }
  const safePropertyIds = safeArray(allPropertyIds);
  const totalCount = safePropertyIds.length;
  const totalPages = Math.ceil(totalCount / limit);
  const offset = (page - 1) * limit;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const pagination = {
    page: page,
    limit: limit,
    total_properties: totalCount,
    total_pages: totalPages,
    has_next_page: hasNextPage,
    has_prev_page: hasPrevPage
  };
  const paginatedPropertyIds = safePropertyIds.slice(offset, offset + limit);
  if (paginatedPropertyIds.length === 0) {
    return {
      properties: [],
      allPropertyIds: safePropertyIds,
      pagination
    };
  }
  const { data: propertiesData, error: propertiesError } = await supabase.from('properties').select(`
      id, code, name, description, content_en, content_fr, 
      sale_price, sale_currency, rental_price, rental_currency, separation_price, separation_currency,
      temp_rental_price, temp_rental_currency, furnished_rental_price, furnished_rental_currency,
      bedrooms, bathrooms, built_area, land_area, parking_spots, nivel,
      is_project, main_image_url, gallery_images_url, 
      slug_url, slug_en, slug_fr, sector_id, city_id, category_id
    `).in('id', paginatedPropertyIds).eq('property_status', 'Publicada').eq('availability', 1);
  if (propertiesError) {
    console.error('Properties fetch error:', propertiesError);
    return {
      properties: [],
      allPropertyIds: safePropertyIds,
      pagination
    };
  }
  return {
    properties: safeArray(propertiesData),
    allPropertyIds: safePropertyIds,
    pagination
  };
}
// ============================================================================
// FUNCIÓN MEJORADA PARA CALCULAR ESTADÍSTICAS AGREGADAS REALISTAS
// ============================================================================
// ============================================================================
// FUNCIÓN MEJORADA PARA CALCULAR ESTADÍSTICAS AGREGADAS CON AGRUPACIÓN DINÁMICA DE MONEDAS
// ============================================================================
async function calculateAggregatedStats(supabase, allPropertyIds, language) {
  if (!allPropertyIds || allPropertyIds.length === 0) {
    return {
      totalCount: 0,
      sale: {},
      rental: {},
      byCategory: {},
      summary: {
        predominantOperation: null,
        predominantCurrency: null,
        avgPricePerSqm: null,
        marketMix: null
      },
      currencies: []
    };
  }
  console.log(`Calculating realistic aggregated stats for ${allPropertyIds.length} properties`);
  // CONFIGURACIÓN DE LOTES PARA EVITAR URLs DEMASIADO LARGAS
  const BATCH_SIZE = 100;
  const batches = [];
  // Dividir allPropertyIds en lotes
  for(let i = 0; i < allPropertyIds.length; i += BATCH_SIZE){
    batches.push(allPropertyIds.slice(i, i + BATCH_SIZE));
  }
  console.log(`Processing ${batches.length} batches of properties (max ${BATCH_SIZE} per batch)`);
  let allProperties = [];
  let successfulBatches = 0;
  let failedBatches = 0;
  // Procesar cada lote por separado
  for(let batchIndex = 0; batchIndex < batches.length; batchIndex++){
    const batch = batches[batchIndex];
    try {
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} properties`);
      const { data: batchProperties, error } = await supabase.from('properties').select(`
          sale_price, sale_currency, rental_price, rental_currency,
          temp_rental_price, temp_rental_currency, furnished_rental_price, furnished_rental_currency,
          built_area, land_area, bedrooms, bathrooms, category_id,
          property_categories!inner(name, name_en, name_fr)
        `).in('id', batch).eq('property_status', 'Publicada').eq('availability', 1);
      if (error) {
        console.error(`Error in batch ${batchIndex + 1}:`, error);
        failedBatches++;
        continue;
      }
      if (batchProperties && Array.isArray(batchProperties)) {
        allProperties.push(...batchProperties);
        successfulBatches++;
        console.log(`Batch ${batchIndex + 1} completed: ${batchProperties.length} properties loaded`);
      }
      // Pequeña pausa entre lotes para evitar sobrecarga
      if (batchIndex < batches.length - 1) {
        await new Promise((resolve)=>setTimeout(resolve, 10));
      }
    } catch (batchError) {
      console.error(`Exception in batch ${batchIndex + 1}:`, batchError);
      failedBatches++;
      continue;
    }
  }
  console.log(`Batch processing completed: ${successfulBatches} successful, ${failedBatches} failed`);
  console.log(`Total properties loaded: ${allProperties.length}/${allPropertyIds.length}`);
  if (allProperties.length === 0) {
    console.error('No properties could be loaded from any batch');
    return {
      totalCount: allPropertyIds.length,
      sale: {},
      rental: {},
      byCategory: {},
      summary: {
        predominantOperation: null,
        predominantCurrency: null,
        avgPricePerSqm: null,
        marketMix: null
      },
      currencies: [],
      _batchInfo: {
        totalBatches: batches.length,
        successfulBatches: 0,
        failedBatches: batches.length,
        loadedProperties: 0,
        totalProperties: allPropertyIds.length
      }
    };
  }
  // Función helper para crear estructura de moneda
  const createCurrencyStructure = ()=>({
      count: 0,
      prices: [],
      avgPrice: 0,
      minPrice: 0,
      maxPrice: 0,
      avgArea: 0,
      pricePerSqm: 0
    });
  // Función helper para limpiar/normalizar moneda
  const cleanCurrency = (currency)=>{
    if (!currency) return 'UNKNOWN';
    return currency.toString().toUpperCase().trim();
  };
  // Inicializar estructuras de datos dinámicas
  const stats = {
    totalCount: allPropertyIds.length,
    sale: {},
    rental: {},
    byCategory: {},
    summary: {
      predominantOperation: null,
      predominantCurrency: null,
      avgPricePerSqm: null,
      marketMix: null
    },
    currencies: [],
    _batchInfo: {
      totalBatches: batches.length,
      successfulBatches: successfulBatches,
      failedBatches: failedBatches,
      loadedProperties: allProperties.length,
      totalProperties: allPropertyIds.length
    }
  };
  // Set para rastrear monedas encontradas
  const foundCurrencies = new Set();
  // Función helper para asegurar que existe la estructura de moneda
  const ensureCurrencyStructure = (operation, currency)=>{
    if (!stats[operation][currency]) {
      stats[operation][currency] = createCurrencyStructure();
      foundCurrencies.add(currency);
    }
  };
  // Función helper para obtener el nombre de la categoría
  const getCategoryName = (category)=>{
    if (!category) return 'Otros';
    if (language === 'en' && category.name_en) return category.name_en;
    if (language === 'fr' && category.name_fr) return category.name_fr;
    return category.name || 'Otros';
  };
  // Función helper para normalizar nombres de categorías
  const normalizeCategoryName = (categoryName)=>{
    const name = categoryName.toLowerCase();
    if (name.includes('apartamento') || name.includes('apartment')) return 'apartamentos';
    if (name.includes('casa') || name.includes('house') || name.includes('villa')) return 'casas';
    if (name.includes('terreno') || name.includes('solar') || name.includes('land')) return 'terrenos';
    if (name.includes('local') || name.includes('comercial') || name.includes('commercial')) return 'comercial';
    if (name.includes('oficina') || name.includes('office')) return 'oficinas';
    return 'otros';
  };
  // Función para asegurar estructura de categoría con todas las monedas encontradas
  const ensureCategoryStructure = (categoryName)=>{
    if (!stats.byCategory[categoryName]) {
      stats.byCategory[categoryName] = {
        count: 0,
        sale: {},
        rental: {}
      };
    }
    // Asegurar que todas las monedas encontradas existan en la categoría
    foundCurrencies.forEach((currency)=>{
      if (!stats.byCategory[categoryName].sale[currency]) {
        stats.byCategory[categoryName].sale[currency] = {
          count: 0,
          avgPrice: 0,
          prices: []
        };
      }
      if (!stats.byCategory[categoryName].rental[currency]) {
        stats.byCategory[categoryName].rental[currency] = {
          count: 0,
          avgPrice: 0,
          prices: []
        };
      }
    });
  };
  // PRIMER PASE: Recopilar todas las monedas que existen
  allProperties.forEach((prop)=>{
    if (prop.sale_price && prop.sale_currency && prop.sale_price > 0) {
      foundCurrencies.add(cleanCurrency(prop.sale_currency));
    }
    // Verificar todas las variantes de alquiler
    [
      {
        price: prop.rental_price,
        currency: prop.rental_currency
      },
      {
        price: prop.temp_rental_price,
        currency: prop.temp_rental_currency
      },
      {
        price: prop.furnished_rental_price,
        currency: prop.furnished_rental_currency
      }
    ].forEach(({ price, currency })=>{
      if (price && currency && price > 0) {
        foundCurrencies.add(cleanCurrency(currency));
      }
    });
  });
  console.log(`Found currencies: ${Array.from(foundCurrencies).join(', ')}`);
  // Inicializar estructuras para todas las monedas encontradas
  foundCurrencies.forEach((currency)=>{
    stats.sale[currency] = createCurrencyStructure();
    stats.rental[currency] = createCurrencyStructure();
  });
  // SEGUNDO PASE: Procesar cada propiedad
  allProperties.forEach((prop)=>{
    const categoryName = getCategoryName(prop.property_categories);
    const normalizedCategory = normalizeCategoryName(categoryName);
    const area = prop.built_area || prop.land_area || 0;
    // Asegurar estructura de categoría
    ensureCategoryStructure(normalizedCategory);
    stats.byCategory[normalizedCategory].count++;
    // PROCESAR VENTA
    if (prop.sale_price && prop.sale_currency && prop.sale_price > 0) {
      const currency = cleanCurrency(prop.sale_currency);
      ensureCurrencyStructure('sale', currency);
      stats.sale[currency].count++;
      stats.sale[currency].prices.push({
        price: prop.sale_price,
        area: area,
        pricePerSqm: area > 0 ? prop.sale_price / area : 0
      });
      // Agregar a categoría
      stats.byCategory[normalizedCategory].sale[currency].count++;
      if (!stats.byCategory[normalizedCategory].sale[currency].prices) {
        stats.byCategory[normalizedCategory].sale[currency].prices = [];
      }
      stats.byCategory[normalizedCategory].sale[currency].prices.push(prop.sale_price);
    }
    // PROCESAR ALQUILER (todas las variantes)
    [
      {
        price: prop.rental_price,
        currency: prop.rental_currency
      },
      {
        price: prop.temp_rental_price,
        currency: prop.temp_rental_currency
      },
      {
        price: prop.furnished_rental_price,
        currency: prop.furnished_rental_currency
      }
    ].forEach(({ price, currency })=>{
      if (price && currency && price > 0) {
        const cleanedCurrency = cleanCurrency(currency);
        ensureCurrencyStructure('rental', cleanedCurrency);
        stats.rental[cleanedCurrency].count++;
        stats.rental[cleanedCurrency].prices.push({
          price: price,
          area: area,
          pricePerSqm: area > 0 ? price / area : 0
        });
        // Agregar a categoría
        stats.byCategory[normalizedCategory].rental[cleanedCurrency].count++;
        if (!stats.byCategory[normalizedCategory].rental[cleanedCurrency].prices) {
          stats.byCategory[normalizedCategory].rental[cleanedCurrency].prices = [];
        }
        stats.byCategory[normalizedCategory].rental[cleanedCurrency].prices.push(price);
      }
    });
  });
  // CALCULAR ESTADÍSTICAS FINALES PARA TODAS LAS MONEDAS
  const currencyList = Array.from(foundCurrencies);
  // Para venta
  currencyList.forEach((currency)=>{
    const saleData = stats.sale[currency];
    if (saleData && saleData.count > 0) {
      const prices = saleData.prices.map((p)=>p.price);
      const areas = saleData.prices.filter((p)=>p.area > 0).map((p)=>p.area);
      const pricesPerSqm = saleData.prices.filter((p)=>p.pricePerSqm > 0).map((p)=>p.pricePerSqm);
      saleData.avgPrice = Math.round(prices.reduce((a, b)=>a + b, 0) / prices.length);
      saleData.minPrice = Math.min(...prices);
      saleData.maxPrice = Math.max(...prices);
      saleData.avgArea = areas.length > 0 ? Math.round(areas.reduce((a, b)=>a + b, 0) / areas.length) : 0;
      saleData.pricePerSqm = pricesPerSqm.length > 0 ? Math.round(pricesPerSqm.reduce((a, b)=>a + b, 0) / pricesPerSqm.length) : 0;
    }
  });
  // Para alquiler
  currencyList.forEach((currency)=>{
    const rentalData = stats.rental[currency];
    if (rentalData && rentalData.count > 0) {
      const prices = rentalData.prices.map((p)=>p.price);
      const areas = rentalData.prices.filter((p)=>p.area > 0).map((p)=>p.area);
      const pricesPerSqm = rentalData.prices.filter((p)=>p.pricePerSqm > 0).map((p)=>p.pricePerSqm);
      rentalData.avgPrice = Math.round(prices.reduce((a, b)=>a + b, 0) / prices.length);
      rentalData.minPrice = Math.min(...prices);
      rentalData.maxPrice = Math.max(...prices);
      rentalData.avgArea = areas.length > 0 ? Math.round(areas.reduce((a, b)=>a + b, 0) / areas.length) : 0;
      rentalData.pricePerSqm = pricesPerSqm.length > 0 ? Math.round(pricesPerSqm.reduce((a, b)=>a + b, 0) / pricesPerSqm.length) : 0;
    }
  });
  // CALCULAR ESTADÍSTICAS POR CATEGORÍA
  Object.keys(stats.byCategory).forEach((category)=>{
    const categoryData = stats.byCategory[category];
    [
      'sale',
      'rental'
    ].forEach((operation)=>{
      currencyList.forEach((currency)=>{
        const data = categoryData[operation][currency];
        if (data && data.count > 0 && data.prices && data.prices.length > 0) {
          data.avgPrice = Math.round(data.prices.reduce((a, b)=>a + b, 0) / data.prices.length);
          data.minPrice = Math.min(...data.prices);
          data.maxPrice = Math.max(...data.prices);
        }
      });
    });
  });
  // CALCULAR RESUMEN
  const totalSale = currencyList.reduce((sum, currency)=>sum + (stats.sale[currency]?.count || 0), 0);
  const totalRental = currencyList.reduce((sum, currency)=>sum + (stats.rental[currency]?.count || 0), 0);
  // Encontrar moneda predominante
  let predominantCurrency = null;
  let maxCurrencyCount = 0;
  currencyList.forEach((currency)=>{
    const totalForCurrency = (stats.sale[currency]?.count || 0) + (stats.rental[currency]?.count || 0);
    if (totalForCurrency > maxCurrencyCount) {
      maxCurrencyCount = totalForCurrency;
      predominantCurrency = currency;
    }
  });
  stats.summary = {
    predominantOperation: totalSale > totalRental ? 'venta' : totalRental > totalSale ? 'alquiler' : 'mixto',
    predominantCurrency: predominantCurrency || 'UNKNOWN',
    marketMix: {
      sale: totalSale,
      rental: totalRental,
      salePercentage: totalSale > 0 ? Math.round(totalSale / (totalSale + totalRental) * 100) : 0,
      rentalPercentage: totalRental > 0 ? Math.round(totalRental / (totalSale + totalRental) * 100) : 0
    }
  };
  stats.currencies = currencyList;
  console.log(`Dynamic stats calculated: ${totalSale} sale, ${totalRental} rental`);
  currencyList.forEach((currency)=>{
    const saleCount = stats.sale[currency]?.count || 0;
    const rentalCount = stats.rental[currency]?.count || 0;
    console.log(`Currency ${currency}: ${saleCount} sale, ${rentalCount} rental`);
  });
  console.log(`Batch processing summary: ${successfulBatches}/${batches.length} batches successful`);
  return stats;
}
// ============================================================================
// FUNCIÓN PARA ORGANIZAR DATOS DE SEO_PAGES POR PILARES
// ============================================================================
function organizeSeoDataByPillars(seoPages, userTagsDetails) {
  const safeSeoPages = safeArray(seoPages);
  const safeUserTags = safeArray(userTagsDetails);
  const organized = {
    country: null,
    city: null,
    sector: null,
    operation: null,
    category: null
  };
  // Mapear content_type a pilares
  safeSeoPages.forEach((page)=>{
    if (page.content_type === 'pais') {
      organized.country = page;
    } else if (page.content_type === 'ciudad') {
      organized.city = page;
    } else if (page.content_type === 'sector') {
      organized.sector = page;
    } else if (page.content_type === 'operacion') {
      organized.operation = page;
    } else if (page.content_type === 'categoria') {
      organized.category = page;
    }
  });
  // Parsear campos JSON si es necesario
  Object.keys(organized).forEach((key)=>{
    if (organized[key]) {
      const page = organized[key];
      // Parsear market_insights si es string
      if (typeof page.market_insights === 'string') {
        try {
          page.market_insights = JSON.parse(page.market_insights);
        } catch (e) {
          console.warn(`Failed to parse market_insights for ${key}:`, e);
        }
      }
      // Parsear investment_data si es string
      if (typeof page.investment_data === 'string') {
        try {
          page.investment_data = JSON.parse(page.investment_data);
        } catch (e) {
          console.warn(`Failed to parse investment_data for ${key}:`, e);
        }
      }
      // Parsear tips si es string
      if (typeof page.tips === 'string') {
        try {
          page.tips = JSON.parse(page.tips);
        } catch (e) {
          console.warn(`Failed to parse tips for ${key}:`, e);
        }
      }
      // Parsear neighborhood_info si es string
      if (typeof page.neighborhood_info === 'string') {
        try {
          page.neighborhood_info = JSON.parse(page.neighborhood_info);
        } catch (e) {
          console.warn(`Failed to parse neighborhood_info for ${key}:`, e);
        }
      }
    }
  });
  console.log('SEO data organized by pillars:', {
    country: !!organized.country,
    city: !!organized.city,
    sector: !!organized.sector,
    operation: !!organized.operation,
    category: !!organized.category
  });
  return organized;
}
// ============================================================================
// FUNCIÓN PARA OBTENER IMAGEN CONTEXTUAL DEL HERO
// ============================================================================
// ============================================================================
// FUNCIÓN CORREGIDA PARA OBTENER IMAGEN CONTEXTUAL DEL HERO DESDE SEO_PAGES
// ============================================================================
function getContextualHeroImage(organizedSeoData, domainInfo) {
  const defaultHeroImage = `${domainInfo?.realDomain || 'https://clicinmobiliaria.com'}/images/heroes/default-hero.jpg`;
  // JERARQUÍA DE PRIORIDAD: sector > ciudad > categoría > operación > país
  // 1. SECTOR - Más específico
  if (organizedSeoData?.sector?.hero_content) {
    const heroUrl = organizedSeoData.sector.hero_content.trim();
    if (heroUrl && (heroUrl.startsWith('http://') || heroUrl.startsWith('https://'))) {
      console.log('🎯 Using SECTOR hero image:', heroUrl);
      return heroUrl;
    }
  }
  // 2. CIUDAD
  if (organizedSeoData?.city?.hero_content) {
    const heroUrl = organizedSeoData.city.hero_content.trim();
    if (heroUrl && (heroUrl.startsWith('http://') || heroUrl.startsWith('https://'))) {
      console.log('🏙️ Using CITY hero image:', heroUrl);
      return heroUrl;
    }
  }
  // 3. CATEGORÍA
  if (organizedSeoData?.category?.hero_content) {
    const heroUrl = organizedSeoData.category.hero_content.trim();
    if (heroUrl && (heroUrl.startsWith('http://') || heroUrl.startsWith('https://'))) {
      console.log('🏠 Using CATEGORY hero image:', heroUrl);
      return heroUrl;
    }
  }
  // 4. OPERACIÓN
  if (organizedSeoData?.operation?.hero_content) {
    const heroUrl = organizedSeoData.operation.hero_content.trim();
    if (heroUrl && (heroUrl.startsWith('http://') || heroUrl.startsWith('https://'))) {
      console.log('💼 Using OPERATION hero image:', heroUrl);
      return heroUrl;
    }
  }
  // 5. PAÍS (fallback)
  if (organizedSeoData?.country?.hero_content) {
    const heroUrl = organizedSeoData.country.hero_content.trim();
    if (heroUrl && (heroUrl.startsWith('http://') || heroUrl.startsWith('https://'))) {
      console.log('🌎 Using COUNTRY hero image:', heroUrl);
      return heroUrl;
    }
  }
  // Fallback final
  console.log('📷 Using DEFAULT hero image:', defaultHeroImage);
  return defaultHeroImage;
}
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
  console.log('Amenities map created with', amenitiesMap.size, 'properties having amenities');
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
    console.log(`Property ${prop.id}: ${amenitiesMap.get(prop.id)?.length || 0} amenities, ${amenityBadges.length} badges`);
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
async function processRelatedContent(supabase, contentRpcResult, language, trackingString) {
  const relatedContent = {
    articles: [],
    videos: [],
    faqs: [],
    testimonials: []
  };
  if (!contentRpcResult?.data || !Array.isArray(contentRpcResult.data) || contentRpcResult.data.length === 0) {
    return relatedContent;
  }
  // PONER ESTO NUEVO ✅
  const articleIds = contentRpcResult.data.filter((result)=>result.content_type === 'article').sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags).slice(0, 15).map((c)=>c.content_id);
  const videoIds = contentRpcResult.data.filter((result)=>result.content_type === 'video').sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags).slice(0, 15).map((c)=>c.content_id);
  const faqIds = contentRpcResult.data.filter((result)=>result.content_type === 'faq').sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags).slice(0, 15).map((c)=>c.content_id);
  const testimonialIds = contentRpcResult.data.filter((result)=>result.content_type === 'testimonial').sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags).slice(0, 15).map((c)=>c.content_id);
  // Fetch content in parallel
  const contentPromises = [];
  if (articleIds.length > 0) {
    contentPromises.push(supabase.from('articles').select(`
        id, title, excerpt, slug, slug_en, slug_fr, featured_image, published_at, views, read_time, subtitle, featured,
        content_en, content_fr, author_id, category_id,
        users:users!articles_author_id_fkey(first_name, last_name, profile_photo_url, slug, position, country_code),
        content_categories:content_categories!articles_category_id_fkey(id, display_name, display_name_en, display_name_fr, slug)
      `).in('id', articleIds).eq('status', 'published').then(({ data })=>safeArray(data).map((item)=>({
          ...item,
          content_type: 'article'
        }))));
  }
  if (videoIds.length > 0) {
    contentPromises.push(supabase.from('videos').select(`
        id, title, description, video_slug, slug_en, slug_fr, thumbnail, published_at, views, duration, featured,
        content_en, content_fr, created_by_id, category_id,
        users:users!videos_created_by_id_fkey(first_name, last_name, profile_photo_url, slug, position, country_code),
        content_categories:content_categories!videos_category_id_fkey(id, display_name, display_name_en, display_name_fr, slug)
      `).in('id', videoIds).eq('status', 'published').then(({ data })=>safeArray(data).map((item)=>({
          ...item,
          content_type: 'video'
        }))));
  }
  if (faqIds.length > 0) {
    contentPromises.push(supabase.from('faqs').select('id, question, answer, content_en, content_fr').in('id', faqIds).eq('status', 'published').then(({ data })=>safeArray(data).map((item)=>({
          ...item,
          content_type: 'faq'
        }))));
  }
  if (testimonialIds.length > 0) {
    contentPromises.push(supabase.from('testimonials').select(`
        id, slug, slug_en, slug_fr, title, excerpt, full_testimonial, rating, client_name, client_avatar, 
        client_location, client_verified, client_profession, transaction_location, category, featured, 
        published_at, views, read_time, subtitle, content_en, content_fr, agent_id,
        users:users!testimonials_agent_id_fkey(first_name, last_name, profile_photo_url, slug, position, country_code)
      `).in('id', testimonialIds).eq('status', 'published').then(({ data })=>safeArray(data).map((item)=>({
          ...item,
          content_type: 'testimonial'
        }))));
  }
  const contentResults = await Promise.all(contentPromises);
  const allContent = contentResults.flat();
  // Process content
  allContent.forEach((item)=>{
    if (!item) return;
    const processedItem = {
      id: item.id,
      content_type: item.content_type
    };
    if (item.content_type === 'faq') {
      let processedQuestion = item.question || '';
      let processedAnswer = item.answer || '';
      const faqContent = processMultilingualContent(item, language);
      if (faqContent.question) processedQuestion = faqContent.question;
      if (faqContent.answer) processedAnswer = faqContent.answer;
      processedItem.question = processedQuestion;
      processedItem.answer = processedAnswer;
      relatedContent.faqs.push(processedItem);
      return;
    }
    // Common processing for articles, videos, testimonials
    processedItem.title = item.title || '';
    // Author processing
    if (item.users) {
      processedItem.author = {
        name: `${item.users.first_name || ''} ${item.users.last_name || ''}`.trim() || getUIText('TEAM_CLIC', language),
        avatar: item.users.profile_photo_url || '/images/team/clic-experts.jpg',
        slug: item.users.slug || null,
        position: item.users.position || null,
        country: item.users.country_code || 'DO'
      };
    } else {
      let defaultPosition = null;
      if (item.content_type === 'video') defaultPosition = getUIText('VIDEO_TEAM', language);
      else if (item.content_type === 'testimonial') defaultPosition = getUIText('REAL_ESTATE_ADVISOR', language);
      processedItem.author = {
        name: getUIText('TEAM_CLIC', language),
        avatar: '/images/team/clic-experts.jpg',
        slug: null,
        position: defaultPosition,
        country: 'DO'
      };
    }
    // Category processing
    if (item.content_categories) {
      let categoryDisplay = item.content_categories.display_name;
      if (language === 'en' && item.content_categories.display_name_en) {
        categoryDisplay = item.content_categories.display_name_en;
      } else if (language === 'fr' && item.content_categories.display_name_fr) {
        categoryDisplay = item.content_categories.display_name_fr;
      }
      processedItem.category = categoryDisplay;
    } else if (item.content_type === 'testimonial') {
      processedItem.category = item.category || getUIText('TESTIMONIALS', language);
    } else {
      processedItem.category = item.content_type === 'video' ? getUIText('VIDEOS', language) : getUIText('ARTICLES', language);
    }
    // Type-specific processing
    if (item.content_type === 'article') {
      let processedTitle = item.title || '';
      let processedExcerpt = item.excerpt || '';
      let processedSubtitle = item.subtitle || '';
      const articleContent = processMultilingualContent(item, language);
      if (articleContent.title) processedTitle = articleContent.title;
      if (articleContent.excerpt) processedExcerpt = articleContent.excerpt;
      if (articleContent.subtitle) processedSubtitle = articleContent.subtitle;
      processedItem.title = processedTitle;
      processedItem.excerpt = processedExcerpt;
      processedItem.featured_image = item.featured_image;
      processedItem.featuredImage = item.featured_image;
      processedItem.published_at = item.published_at;
      processedItem.publishedAt = item.published_at;
      processedItem.views = item.views || 0;
      processedItem.subtitle = processedSubtitle || null;
      processedItem.featured = item.featured || false;
      const readTimeValue = item.read_time || 7;
      processedItem.read_time = `${readTimeValue} ${getUIText('MINUTES_READ', language)}`;
      processedItem.readTime = `${readTimeValue} ${getUIText('MINUTES_READ', language)}`;
      const slug = language === 'en' && item.slug_en ? item.slug_en : language === 'fr' && item.slug_fr ? item.slug_fr : item.slug;
      if (slug) {
        let url = slug;
        if (language === 'en') url = `en/${slug}`;
        if (language === 'fr') url = `fr/${slug}`;
        processedItem.url = `/${url}${trackingString || ''}`;
        processedItem.slug = slug;
        processedItem.slug_en = item.slug_en;
        processedItem.slug_fr = item.slug_fr;
      }
      relatedContent.articles.push(processedItem);
    } else if (item.content_type === 'video') {
      let processedTitle = item.title || '';
      let processedDescription = item.description || '';
      const videoContent = processMultilingualContent(item, language);
      if (videoContent.title) processedTitle = videoContent.title;
      if (videoContent.description) processedDescription = videoContent.description;
      processedItem.title = processedTitle;
      processedItem.description = processedDescription;
      processedItem.thumbnail = item.thumbnail;
      processedItem.video_slug = item.video_slug;
      processedItem.videoSlug = item.video_slug;
      processedItem.duration = item.duration || '10:00';
      processedItem.views = item.views || null;
      processedItem.publishedAt = item.published_at || new Date().toISOString();
      processedItem.featured = item.featured || false;
      const slug = language === 'en' && item.slug_en ? item.slug_en : language === 'fr' && item.slug_fr ? item.slug_fr : item.video_slug;
      if (slug) {
        let url = slug;
        if (language === 'en') url = `en/${slug}`;
        if (language === 'fr') url = `fr/${slug}`;
        processedItem.url = `/${url}${trackingString || ''}`;
        processedItem.slug = slug;
        processedItem.slug_en = item.slug_en;
        processedItem.slug_fr = item.slug_fr;
      }
      relatedContent.videos.push(processedItem);
    } else if (item.content_type === 'testimonial') {
      let processedTitle = item.title || '';
      let processedExcerpt = item.excerpt || '';
      let processedTestimonial = item.full_testimonial || '';
      let processedSubtitle = item.subtitle || '';
      const testimonialContent = processMultilingualContent(item, language);
      if (testimonialContent.title) processedTitle = testimonialContent.title;
      if (testimonialContent.excerpt) processedExcerpt = testimonialContent.excerpt;
      if (testimonialContent.full_testimonial) processedTestimonial = testimonialContent.full_testimonial;
      if (testimonialContent.subtitle) processedSubtitle = testimonialContent.subtitle;
      processedItem.title = processedTitle;
      processedItem.excerpt = processedExcerpt;
      processedItem.full_testimonial = processedTestimonial;
      processedItem.subtitle = processedSubtitle;
      processedItem.rating = item.rating || 5;
      processedItem.client_name = item.client_name;
      processedItem.client_avatar = item.client_avatar || '/images/default-avatar.jpg';
      processedItem.client_location = item.client_location;
      processedItem.client_verified = item.client_verified || false;
      processedItem.client_profession = item.client_profession;
      processedItem.transaction_location = item.transaction_location;
      processedItem.featured = item.featured || false;
      processedItem.published_at = item.published_at;
      processedItem.publishedAt = item.published_at;
      processedItem.views = item.views || 0;
      const readTimeValue = item.read_time || 3;
      processedItem.read_time = `${readTimeValue} ${getUIText('MINUTES_READ', language)}`;
      processedItem.readTime = `${readTimeValue} ${getUIText('MINUTES_READ', language)}`;
      const slug = language === 'en' && item.slug_en ? item.slug_en : language === 'fr' && item.slug_fr ? item.slug_fr : item.slug;
      if (slug) {
        let url = slug;
        if (language === 'en') url = `en/${url}`;
        if (language === 'fr') url = `fr/${url}`;
        processedItem.url = `/${url}${trackingString || ''}`;
        processedItem.slug = slug;
        processedItem.slug_en = item.slug_en;
        processedItem.slug_fr = item.slug_fr;
      }
      relatedContent.testimonials.push(processedItem);
    }
  });
  return relatedContent;
}
// ============================================================================
// MAIN SERVE FUNCTION WITH COMPREHENSIVE DEFENSIVE PROGRAMMING
// ============================================================================
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('DEBUG: Edge function starting with defensive programming and SEO enhancements');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestUrl = new URL(req.url);
    const queryParams = requestUrl.searchParams;
    // Detect country and domain info
    const domainInfo = await detectCountryAndDomain(req, supabase);
    // Extract tracking parameters
    // Extract tracking parameters - CÓDIGO NUEVO
    const trackingString = extractTrackingString(req.url);
    console.log('Final trackingString:', trackingString);
    console.log('trackingString length:', trackingString.length);
    console.log('trackingString empty?', trackingString === '');
    // Parse path
    const fullPath = requestUrl.pathname;
    const backendIndex = fullPath.indexOf('/backend/');
    if (backendIndex === -1) {
      throw new Error('Invalid path');
    }
    const pathAfterBackend = fullPath.substring(backendIndex + 9);
    const segments = pathAfterBackend.split('/').filter((segment)=>segment !== '');
    // Determine language and tags with defensive programming
    let language = 'es';
    let tags = [];
    const safeSegments = safeArray(segments);
    if (safeSegments.length > 0) {
      if (safeSegments[0] === 'en' || safeSegments[0] === 'fr') {
        language = safeSegments[0];
        tags = safeSegments.slice(1);
      } else {
        tags = safeSegments;
      }
    }
    console.log('DEBUG: Language:', language, 'Tags:', tags, 'Tags length:', safeArray(tags).length);
    // Get country and tags using domain info with defensive programming
    const { country, countryTag, validatedTags } = await getCountryAndTags(supabase, tags, language, domainInfo);
    console.log('DEBUG: After getCountryAndTags:', {
      validatedTags_type: typeof validatedTags,
      validatedTags_isArray: Array.isArray(validatedTags),
      validatedTags_length: safeArray(validatedTags).length
    });
    // Obtener configuración completa del país
    let globalConfig = null;
    if (country && country.code) {
      console.log('Fetching country config for:', country.code);
      const { data: countryConfigData, error: configError } = await supabase.from('countries').select('config').eq('code', country.code).single();
      if (!configError && countryConfigData?.config) {
        console.log('Country config found, processing...');
        globalConfig = processCountryConfig(countryConfigData.config, language, trackingString);
        globalConfig.country = country.code;
        globalConfig.language = language;
        console.log('Country config processed successfully');
      } else {
        console.error('Error fetching country config:', configError);
        globalConfig = {
          country: country.code,
          language: language,
          contact: {},
          social: {},
          legal: {},
          team: {},
          features: {},
          footer_links: {},
          office: {},
          seo: {},
          translations: {}
        };
      }
    }
    // Add country tag to validated tags with defensive programming
    const safeValidatedTags = safeArray(validatedTags);
    let finalValidatedTags = [
      ...safeValidatedTags
    ];
    if (countryTag) {
      const countrySlugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
      finalValidatedTags.unshift({
        slug: countryTag[countrySlugField] || countryTag.slug,
        id: countryTag.id,
        ...countryTag
      });
    }
    // Check for special pages
    let isSpecialPage = false;
    let specialPageType = null;
    let customListTagInfo = null;
    if (finalValidatedTags.length > 0) {
      const customListTagFound = finalValidatedTags.find((tag)=>tag.category === 'custom-list');
      if (customListTagFound) {
        isSpecialPage = true;
        specialPageType = 'custom-list';
        customListTagInfo = customListTagFound;
      }
    }
    // Initialize variables
    let pageType = 'property-list';
    let property = null;
    let properties = [];
    let pagination = null;
    // ← DECLARAR AQUÍ, FUERA DEL IF
    let searchTagsData = null;
    let relatedContent = {
      articles: [],
      videos: [],
      faqs: [],
      carousels: [],
      testimonials: []
    };
    let hotItems = {
      properties: [],
      cities: [],
      sectors: [],
      agents: [],
      projects: [],
      custom: []
    };
    // NUEVAS VARIABLES PARA DATOS ENRIQUECIDOS
    let organizedSeoData = null;
    let aggregatedStats = null;
    let contextualHeroImage = null;
    // Check if it's a single property
    const safeTags = safeArray(tags);
    if (safeTags.length > 0) {
      const fullSlug = safeTags.join('/');
      let propertySlugField = 'slug_url';
      if (language === 'en') propertySlugField = 'slug_en';
      if (language === 'fr') propertySlugField = 'slug_fr';
      const { data: propertyData } = await supabase.from('properties').select('id, private_name').eq(propertySlugField, fullSlug).single();
      if (propertyData) {
        pageType = 'single-property';
        property = propertyData;
      }
    }
    let userTagsDetails = null;
    let seoPages = null;
    // Process property-list with comprehensive defensive programming
    if (pageType === 'property-list') {
      console.log('DEBUG: Processing property-list');
      const safeValidatedTagsForIds = safeArray(finalValidatedTags);
      const allTagIds = safeValidatedTagsForIds.map((tag)=>tag?.id).filter(Boolean);
      console.log('DEBUG: AllTagIds:', {
        type: typeof allTagIds,
        isArray: Array.isArray(allTagIds),
        length: allTagIds.length,
        content: allTagIds
      });
      if (allTagIds.length > 0) {
        const page = parseInt(requestUrl.searchParams.get('page') || '1');
        const limit = 32;
        // ← AGREGAR AQUÍ LA LLAMADA AL HANDLER
        try {
          searchTagsData = await getSearchTagsHandler({
            supabase,
            countryTag,
            validatedTags: finalValidatedTags,
            language,
            pathToAnalyze: pathAfterBackend,
            trackingString
          });
          if (!searchTagsData.success) {
            console.error('Error getting search tags:', searchTagsData.error);
          } else {
            console.log('Search tags loaded successfully:', {
              totalTagCategories: Object.keys(searchTagsData.data.tags).length,
              preselectedFilters: searchTagsData.data.preselected
            });
          }
        } catch (error) {
          console.error('Exception in search tags handler:', error);
          searchTagsData = {
            success: false,
            error: error.message
          };
        }
        // Fetch data in parallel - QUERY CORREGIDA PARA FILTRAR SOLO POR PAÍS ACTUAL
        const userTagIds = allTagIds.filter((id)=>id !== countryTag?.id); // Excluir país de la lista
        const [propertiesResult, contentRpcResult, userTagsResult, seoResult, hotItemsResult] = await Promise.all([
          fetchPropertiesData(supabase, allTagIds, page, limit),
          supabase.rpc('get_all_content_by_tags', {
            tag_ids: allTagIds,
            limit_per_type: 15
          }),
          supabase.from('tags').select('id, name, category, display_name, display_name_en, display_name_fr, slug, slug_en, slug_fr').in('id', allTagIds),
          // QUERY CORREGIDA - BUSCAR SOLO EN EL CONTEXTO DEL PAÍS ACTUAL
          (async ()=>{
            let seoQuery = supabase.from('seo_pages').select(`
                *, 
                location_closure, 
                tag_name, 
                seo_description,
                seo_title,
                market_insights,
                tips,
                investment_data,
                neighborhood_info,
                hero_content
              `).eq('language', language);
            // FILTRO CRÍTICO POR PAÍS - Ahora con country_tag
            if (countryTag?.id) {
              const tagIds = userTagIds.length > 0 ? [
                countryTag.id,
                ...userTagIds
              ] : [
                countryTag.id
              ];
              seoQuery = seoQuery.in('tag_id', tagIds).eq('country_tag', countryTag.id); // ← NUEVO FILTRO POR PAÍS
            } else {
              // Si no hay país específico, usar todos los tags sin filtro de país
              seoQuery = seoQuery.in('tag_id', allTagIds);
            }
            const { data, error } = await seoQuery;
            if (error) {
              console.error('SEO Pages query error:', error);
              return {
                data: [],
                error
              };
            }
            console.log('=== SEO PAGES DEBUG ===');
            console.log('Raw seo_pages data:', JSON.stringify(data, null, 2));
            console.log('SEO Pages count:', data?.length || 0);
            console.log(`SEO Pages found: ${data?.length || 0} (filtered by country: ${countryTag?.id})`);
            return {
              data,
              error
            };
          })(),
          countryTag?.id ? supabase.from('popular_items').select('*').eq('country_tag_id', countryTag.id).eq('active', true).order('priority') : Promise.resolve({
            data: []
          })
        ]);
        const { properties: propertiesData, allPropertyIds, pagination: paginationData } = propertiesResult;
        userTagsDetails = safeArray(userTagsResult.data);
        seoPages = safeArray(seoResult.data);
        pagination = paginationData;
        console.log('DEBUG: SEO Pages found:', seoPages.length);
        console.log('DEBUG: All Property IDs count:', allPropertyIds.length);
        // ORGANIZAR DATOS DE SEO_PAGES POR PILARES
        organizedSeoData = organizeSeoDataByPillars(seoPages, userTagsDetails);
        console.log('=== ORGANIZED SEO DATA DEBUG ===');
        console.log('organizedSeoData.sector:', JSON.stringify(organizedSeoData?.sector, null, 2));
        console.log('organizedSeoData.city:', JSON.stringify(organizedSeoData?.city, null, 2));
        console.log('organizedSeoData.operation:', JSON.stringify(organizedSeoData?.operation, null, 2));
        console.log('organizedSeoData.country:', JSON.stringify(organizedSeoData?.country, null, 2));
        // CALCULAR ESTADÍSTICAS AGREGADAS DEL TOTAL DE PROPIEDADES
        if (allPropertyIds.length > 0) {
          aggregatedStats = await calculateAggregatedStats(supabase, allPropertyIds, language);
          console.log('DEBUG: Aggregated stats calculated for', allPropertyIds.length, 'properties');
        }
        // OBTENER IMAGEN CONTEXTUAL PARA EL HERO
        contextualHeroImage = getContextualHeroImage(organizedSeoData, domainInfo);
        console.log('=== HERO IMAGE DEBUG ===');
        console.log('organizedSeoData.sector?.hero_content:', organizedSeoData?.sector?.hero_content);
        console.log('organizedSeoData.city?.hero_content:', organizedSeoData?.city?.hero_content);
        console.log('organizedSeoData.operation?.hero_content:', organizedSeoData?.operation?.hero_content);
        console.log('organizedSeoData.country?.hero_content:', organizedSeoData?.country?.hero_content);
        console.log('Final contextualHeroImage:', contextualHeroImage);
        const safePropertiesData = safeArray(propertiesData);
        if (safePropertiesData.length > 0) {
          // Get unique IDs for related data
          const sectorIds = [
            ...new Set(safePropertiesData.map((p)=>p.sector_id).filter(Boolean))
          ];
          const cityIds = [
            ...new Set(safePropertiesData.map((p)=>p.city_id).filter(Boolean))
          ];
          const categoryIds = [
            ...new Set(safePropertiesData.map((p)=>p.category_id).filter(Boolean))
          ];
          const propertyIds = safePropertiesData.map((p)=>p.id);
          // Fetch related data
          const relatedData = await fetchRelatedData(supabase, propertyIds, categoryIds, sectorIds, cityIds);
          // Process properties
          properties = await processProperties(safePropertiesData, relatedData, finalValidatedTags, language, trackingString);
        }
        // Process related content
        relatedContent = await processRelatedContent(supabase, contentRpcResult, language, trackingString);
        // Process hot items
        const safeHotItemsData = safeArray(hotItemsResult?.data);
        if (safeHotItemsData.length > 0) {
          const processHotItemContent = (item)=>{
            if (!item) return null;
            let translatedContent = {
              title: item.title || '',
              subtitle: item.subtitle || '',
              url: item.url || ''
            };
            if (language !== 'es') {
              const contentField = language === 'en' ? item.content_en : item.content_fr;
              if (contentField) {
                try {
                  const parsedContent = typeof contentField === 'string' ? JSON.parse(contentField) : contentField;
                  translatedContent = {
                    title: parsedContent.title || item.title,
                    subtitle: parsedContent.subtitle || item.subtitle,
                    url: parsedContent.url || item.url
                  };
                } catch (e) {
                // Keep original values on parse error
                }
              }
            }
            let processedUrl = translatedContent.url;
            if (processedUrl) {
              if (language === 'en') processedUrl = `en/${processedUrl}`;
              if (language === 'fr') processedUrl = `fr/${processedUrl}`;
              processedUrl = `/${processedUrl}${trackingString || ''}`;
            }
            return {
              ...item,
              title: translatedContent.title,
              subtitle: translatedContent.subtitle,
              url: processedUrl,
              id: item.id || `hot-${item.category}-${Math.random()}`,
              slug: item.slug || translatedContent.url,
              titulo: translatedContent.title,
              precio: getUIText('CONSULT_PRICE', language),
              imagen: item.image_url || item.thumbnail || '/images/placeholder-property.jpg',
              imagenes: item.image_url || item.thumbnail ? [
                item.image_url || item.thumbnail
              ] : [
                '/images/placeholder-property.jpg'
              ],
              sector: item.subtitle || getUIText('PREMIUM_LOCATION', language),
              habitaciones: 0,
              banos: 0,
              metros: 0,
              metros_terreno: 0,
              parqueos: 0,
              nivel: null,
              tipo: item.category === 'categoria' ? getUIText('PROPERTY_TYPE', language) : item.category === 'proyecto' ? getUIText('PROJECT', language) : getUIText('PROPERTY', language),
              isFormattedByProvider: true,
              is_project: item.category === 'proyecto',
              code: item.code || null,
              project_badges: item.category === 'proyecto' ? [
                getUIText('PROJECT', language)
              ] : [],
              habitaciones_rango: null,
              banos_rango: null,
              metros_rango: null,
              reserva_desde: item.category === 'proyecto' ? getUIText('RESERVATION_FROM', language) : null
            };
          };
          const processedHotItems = safeHotItemsData.map(processHotItemContent).filter(Boolean);
          hotItems = {
            properties: processedHotItems.filter((item)=>item.category === 'categoria').slice(0, 6),
            cities: processedHotItems.filter((item)=>item.category === 'ciudad').slice(0, 10),
            sectors: processedHotItems.filter((item)=>item.category === 'sector').slice(0, 8),
            agents: processedHotItems.filter((item)=>item.category === 'asesor').slice(0, 5),
            projects: processedHotItems.filter((item)=>item.category === 'proyecto').slice(0, 4),
            custom: processedHotItems.filter((item)=>item.category === 'custom').slice(0, 3)
          };
        }
        // Get carousels using the new modular handler
        if (countryTag?.id) {
          const carousels = await getCarouselsOptimized(supabase, countryTag.id, userTagsDetails, tags, trackingString, language, domainInfo);
          relatedContent.carousels = carousels;
        }
      } else {
        // No tags - empty pagination
        pagination = {
          page: parseInt(requestUrl.searchParams.get('page') || '1'),
          limit: 32,
          total_properties: 0,
          total_pages: 0,
          has_next_page: false,
          has_prev_page: false
        };
      }
    }
    // SEO content processing - MEJORADO PARA USAR DATOS ORGANIZADOS
    const seoContent = {
      market_insights: [],
      tips: [],
      investment_data: {},
      neighborhood_info: {}
    };
    // Usar datos organizados en lugar de procesar safeSeoPages
    if (organizedSeoData) {
      const priorityOrder = [
        'sector',
        'ciudad',
        'categoria',
        'operacion',
        'pais'
      ];
      // Procesar insights por orden de prioridad
      priorityOrder.forEach((pillar, index)=>{
        const pillarData = organizedSeoData[pillar === 'ciudad' ? 'city' : pillar === 'pais' ? 'country' : pillar];
        if (pillarData && pillarData.market_insights) {
          seoContent.market_insights.push({
            ...pillarData.market_insights,
            content_type: pillarData.content_type,
            priority: index
          });
        }
        if (pillarData && pillarData.tips) {
          seoContent.tips.push({
            ...pillarData.tips,
            content_type: pillarData.content_type
          });
        }
        // Para investment_data, usar el más específico disponible
        if (pillarData && pillarData.investment_data && Object.keys(seoContent.investment_data).length === 0) {
          seoContent.investment_data = {
            ...pillarData.investment_data,
            _source: pillarData.content_type
          };
        }
        if (pillarData && pillarData.neighborhood_info) {
          Object.assign(seoContent.neighborhood_info, pillarData.neighborhood_info);
        }
      });
      // Limpiar metadata interna
      if (seoContent.investment_data._source) {
        delete seoContent.investment_data._source;
      }
    }
    // SEO building - MEJORADO PARA USAR DATOS ENRIQUECIDOS
    const buildEnhancedSEOData = async ()=>{
      const breadcrumbs = [];
      const homeLabel = getUIText('HOME', language);
      const homeUrl = buildUrlWithTracking('', language, trackingString);
      breadcrumbs.push({
        name: homeLabel,
        url: homeUrl === '/' ? `/${trackingString ? trackingString.substring(1) : ''}` : homeUrl
      });
      const priorityOrder = [
        'operacion',
        'categoria',
        'ciudad',
        'sector',
        'precio',
        'habitaciones',
        'banos',
        'parqueos'
      ];
      let sortedTags = [];
      const safeUserTagsDetails = safeArray(userTagsDetails);
      if (safeUserTagsDetails.length > 0) {
        const filteredTags = safeUserTagsDetails.filter((tag)=>tag.category !== 'pais' && tag.category !== 'custom-list');
        sortedTags = filteredTags.sort((a, b)=>{
          const aPriority = priorityOrder.indexOf(a.category);
          const bPriority = priorityOrder.indexOf(b.category);
          if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
          if (aPriority !== -1) return -1;
          if (bPriority !== -1) return 1;
          return 0;
        });
        let cumulativeUrl = language === 'es' ? '' : `/${language}`;
        sortedTags.forEach((tag)=>{
          const tagSlug = language === 'en' && tag.slug_en ? tag.slug_en : language === 'fr' && tag.slug_fr ? tag.slug_fr : tag.slug;
          const tagDisplayName = getTagDisplayName(tag, language);
          cumulativeUrl += `/${tagSlug}`;
          let formattedUrl = cumulativeUrl;
          if (!formattedUrl.startsWith('/')) formattedUrl = `/${formattedUrl}`;
          breadcrumbs.push({
            name: tagDisplayName,
            url: `${formattedUrl}${trackingString || ''}`
          });
        });
      }
      // CONSTRUCCIÓN MEJORADA DE TÍTULO Y DESCRIPCIÓN - DE PARTICULAR A GENERAL
      let enhancedTitle = '';
      let enhancedDescription = '';
      const propertiesCount = pagination?.total_properties || 0;
      // Función para construir título dinámico
      const buildDynamicTitle = ()=>{
        let titleParts = [];
        // Siempre empezar con el número de propiedades
        if (propertiesCount > 0) {
          titleParts.push(propertiesCount.toString());
        }
        // JERARQUÍA CORRECTA: sector > ciudad > categoría > operación > país
        // 1. SECTOR (más específico) - usar título completo del sector
        if (organizedSeoData?.sector?.seo_title) {
          // Si hay sector, usar su título completo (ya viene optimizado)
          return organizedSeoData.sector.seo_title;
        }
        // 2. CIUDAD - usar título completo de la ciudad  
        if (organizedSeoData?.city?.seo_title) {
          return organizedSeoData.city.seo_title;
        }
        // 3. CATEGORÍA + OPERACIÓN + location_closure inteligente
        if (organizedSeoData?.category) {
          // Extraer nombre de la categoría del tag_name
          const categoryName = organizedSeoData.category.tag_name || 'Propiedades';
          titleParts.push(categoryName);
          // Agregar operación si existe
          if (organizedSeoData?.operation) {
            const operationName = organizedSeoData.operation.tag_name || '';
            if (operationName.toLowerCase().includes('venta') || operationName.toLowerCase().includes('comprar')) {
              titleParts.push('en Venta');
            } else if (operationName.toLowerCase().includes('alquiler') || operationName.toLowerCase().includes('renta')) {
              titleParts.push('en Alquiler');
            }
          }
          // Agregar location_closure: SECTOR > CIUDAD > PAÍS
          let locationText = '';
          if (organizedSeoData?.sector?.location_closure) {
            locationText = organizedSeoData.sector.location_closure;
          } else if (organizedSeoData?.city?.location_closure) {
            locationText = organizedSeoData.city.location_closure;
          } else if (organizedSeoData?.country?.location_closure) {
            locationText = organizedSeoData.country.location_closure;
          }
          if (locationText) {
            titleParts.push(locationText);
          }
          return titleParts.join(' ');
        }
        // 4. OPERACIÓN + location_closure
        if (organizedSeoData?.operation) {
          const operationName = organizedSeoData.operation.tag_name || '';
          if (operationName.toLowerCase().includes('venta') || operationName.toLowerCase().includes('comprar')) {
            titleParts.push('Propiedades en Venta');
          } else if (operationName.toLowerCase().includes('alquiler') || operationName.toLowerCase().includes('renta')) {
            titleParts.push('Propiedades en Alquiler');
          } else {
            titleParts.push('Propiedades');
          }
          // Agregar location_closure: SECTOR > CIUDAD > PAÍS
          let locationText = '';
          if (organizedSeoData?.sector?.location_closure) {
            locationText = organizedSeoData.sector.location_closure;
          } else if (organizedSeoData?.city?.location_closure) {
            locationText = organizedSeoData.city.location_closure;
          } else if (organizedSeoData?.country?.location_closure) {
            locationText = organizedSeoData.country.location_closure;
          }
          if (locationText) {
            titleParts.push(locationText);
          }
          return titleParts.join(' ');
        }
        // 5. PAÍS (fallback)
        if (organizedSeoData?.country?.seo_title) {
          return organizedSeoData.country.seo_title;
        }
        // Fallback final
        titleParts.push('Propiedades');
        if (organizedSeoData?.country?.location_closure) {
          titleParts.push(organizedSeoData.country.location_closure);
        }
        return titleParts.join(' ');
      };
      // Función para obtener descripción con jerarquía
      const getEnhancedDescription = ()=>{
        // Mismo orden de prioridad para descripción
        if (organizedSeoData?.sector?.seo_description) {
          return organizedSeoData.sector.seo_description;
        }
        if (organizedSeoData?.city?.seo_description) {
          return organizedSeoData.city.seo_description;
        }
        if (organizedSeoData?.category?.seo_description) {
          return organizedSeoData.category.seo_description;
        }
        if (organizedSeoData?.operation?.seo_description) {
          return organizedSeoData.operation.seo_description;
        }
        if (organizedSeoData?.country?.seo_description) {
          return organizedSeoData.country.seo_description;
        }
        // Fallback genérico
        const countryName = country.name || 'República Dominicana';
        return `Encuentra las mejores propiedades en ${countryName}. Amplia selección de inmuebles con precios competitivos.`;
      };
      // Construir título y descripción finales
      enhancedTitle = buildDynamicTitle();
      enhancedDescription = getEnhancedDescription();
      const buildLanguageUrl = (targetLanguage)=>{
        const languageSlugs = sortedTags.map((tag)=>{
          if (targetLanguage === 'en' && tag.slug_en) return tag.slug_en;
          if (targetLanguage === 'fr' && tag.slug_fr) return tag.slug_fr;
          return tag.slug;
        });
        const path = languageSlugs.join('/');
        // Obtener dominio base y limpiar trailing slash
        console.log('🔍 buildLanguageUrl - domainInfo:', domainInfo);
        console.log('🔍 buildLanguageUrl - realDomain:', domainInfo?.realDomain);
        let baseUrl = domainInfo?.realDomain || 'https://clicinmobiliaria.com';
        if (baseUrl.endsWith('/')) {
          baseUrl = baseUrl.slice(0, -1);
        }
        console.log('🔍 buildLanguageUrl - Final baseUrl:', baseUrl);
        // Construir URL completa
        if (targetLanguage === 'es') {
          return path ? `${baseUrl}/${path}${trackingString || ''}` : `${baseUrl}${trackingString || ''}`;
        } else {
          return path ? `${baseUrl}/${targetLanguage}/${path}${trackingString || ''}` : `${baseUrl}/${targetLanguage}${trackingString || ''}`;
        }
      };
      const sortedSlugs = sortedTags.map((tag)=>{
        if (language === 'en' && tag.slug_en) return tag.slug_en;
        if (language === 'fr' && tag.slug_fr) return tag.slug_fr;
        return tag.slug;
      });
      let canonicalUrl = sortedSlugs.join('/');
      if (language !== 'es') canonicalUrl = `${language}/${canonicalUrl}`;
      const hreflangUrls = {
        es: buildLanguageUrl('es'),
        en: buildLanguageUrl('en'),
        fr: buildLanguageUrl('fr')
      };
      const flatRelatedContent = [
        ...safeArray(relatedContent.articles),
        ...safeArray(relatedContent.videos),
        ...safeArray(relatedContent.faqs),
        ...safeArray(relatedContent.testimonials)
      ];
      const propertyAggregations = calculatePropertyAggregations(properties);
      const structuredData = generateAdvancedStructuredData({
        properties,
        breadcrumbs,
        relatedContent: flatRelatedContent,
        pagination,
        propertyAggregations,
        tags: userTagsDetails,
        seoContent,
        language,
        canonicalUrl: `${domainInfo.realDomain}/${canonicalUrl}`,
        hreflangUrls
      });
      const twitterCard = generateTwitterCardMeta({
        title: enhancedTitle,
        description: enhancedDescription,
        image: properties.length > 0 ? properties[0].main_image_url : contextualHeroImage,
        language,
        propertyAggregations
      });
      const keywords = generateSEOKeywords({
        tags: userTagsDetails,
        language,
        propertyAggregations
      });
      const additionalMetaTags = generateAdditionalMetaTags({
        language,
        propertyAggregations,
        canonicalUrl: `${domainInfo.realDomain}/${canonicalUrl}`
      });
      return {
        title: enhancedTitle,
        description: enhancedDescription,
        canonical_url: `/${canonicalUrl}`,
        breadcrumbs,
        coordinates: null,
        seo_content: seoContent,
        h1: enhancedTitle,
        h2: language === 'en' ? 'The property you are looking for, just one CLICK away!' : language === 'fr' ? 'La propriété que vous cherchez, à un CLIC de distance !' : 'El inmueble que buscas, a un CLIC de distancia!',
        structured_data: structuredData,
        twitter_card: twitterCard,
        keywords: keywords,
        additional_meta_tags: additionalMetaTags,
        open_graph: {
          title: enhancedTitle,
          description: enhancedDescription,
          url: `${domainInfo.realDomain}/${canonicalUrl}`,
          type: 'website',
          site_name: 'CLIC Inmobiliaria',
          locale: language === 'en' ? 'en_US' : language === 'fr' ? 'fr_FR' : 'es_DO',
          image: properties.length > 0 ? properties[0].main_image_url : contextualHeroImage
        },
        hreflang: hreflangUrls,
        meta_tags: {
          robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
          author: 'René Castillo - CLIC Inmobiliaria',
          publisher: 'CLIC Inmobiliaria'
        }
      };
    };
    const seoData = await buildEnhancedSEOData();
    // Build final response - CON NUEVOS CAMPOS ENRIQUECIDOS
    const response = {
      country,
      language,
      tags: finalValidatedTags,
      pageType: pageType,
      totalProperties: pagination?.total_properties || 0,
      seo: seoData,
      properties: properties,
      relatedContent: relatedContent,
      content: {
        faqs: safeArray(relatedContent.faqs),
        articles: safeArray(relatedContent.articles)
      },
      featuredProperties: [
        ...safeArray(hotItems?.properties).slice(0, 4),
        ...safeArray(hotItems?.projects).slice(0, 4)
      ],
      hotItems: hotItems,
      pagination: pagination,
      globalConfig: globalConfig,
      trackingString: trackingString,
      // NUEVOS CAMPOS ENRIQUECIDOS
      organizedSeoData: organizedSeoData,
      aggregatedStats: aggregatedStats,
      contextualHeroImage: contextualHeroImage,
      // ← AGREGAR CAMPOS DEL SEARCH TAGS HANDLER
      searchTags: searchTagsData?.success ? searchTagsData.data.tags : null,
      locationHierarchy: searchTagsData?.success ? searchTagsData.data.locationHierarchy : null,
      preselectedFilters: searchTagsData?.success ? searchTagsData.data.preselected : null,
      currencies: searchTagsData?.success ? searchTagsData.data.currencies : {
        available: [
          'USD'
        ],
        default: 'USD'
      },
      searchTagsError: searchTagsData?.success === false ? searchTagsData.error : null
    };
    // Handle special pages
    if (isSpecialPage) {
      response.specialPage = true;
      response.specialType = specialPageType;
      if (customListTagInfo) {
        response.customListInfo = {
          id: customListTagInfo.id,
          slug: customListTagInfo.slug,
          display_name: getTagDisplayName(customListTagInfo, language)
        };
      }
    }
    // Handle single property
    if (pageType === 'single-property') {
      const singlePropertyData = await handleSingleProperty({
        property: property,
        supabase,
        language,
        countryTag,
        validatedTags: finalValidatedTags,
        trackingString,
        seoPages,
        userTagsDetails,
        hotItems,
        domainInfo,
        globalConfig
      });
      console.log('Single property response summary:', {
        has_property: !!singlePropertyData.property,
        has_pricing: !!singlePropertyData.pricing,
        has_images: !!singlePropertyData.images,
        has_agent: !!singlePropertyData.agent,
        has_similar_properties: singlePropertyData.similarProperties?.length || 0,
        has_related_content: !!singlePropertyData.relatedContent,
        property_type: singlePropertyData.type,
        available: singlePropertyData.available
      });
      return new Response(JSON.stringify({
        ...singlePropertyData,
        country,
        language,
        tags: finalValidatedTags,
        globalConfig,
        pageType: 'single-property',
        trackingString: trackingString
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 200
      });
    }
    console.log('Enhanced Response summary:', {
      properties: properties.length,
      carousels: safeArray(relatedContent.carousels).length,
      articles: safeArray(relatedContent.articles).length,
      videos: safeArray(relatedContent.videos).length,
      faqs: safeArray(relatedContent.faqs).length,
      testimonials: safeArray(relatedContent.testimonials).length,
      featured_properties: response.featuredProperties?.length || 0,
      total_properties: pagination?.total_properties || 0,
      aggregated_stats: !!aggregatedStats,
      contextual_hero: !!contextualHeroImage,
      organized_seo_data: !!organizedSeoData,
      seo_pillars: organizedSeoData ? Object.keys(organizedSeoData).filter((k)=>organizedSeoData[k]) : [],
      current_page: pagination?.page || 1,
      total_pages: pagination?.total_pages || 0,
      has_global_config: !!globalConfig,
      has_twitter_card: !!seoData.twitter_card,
      has_keywords: !!seoData.keywords,
      country: globalConfig?.country || 'N/A',
      language: globalConfig?.language || 'N/A',
      // ← AGREGAR ESTADÍSTICAS DEL SEARCH TAGS
      search_tags_loaded: !!response.searchTags,
      search_tags_categories: response.searchTags ? Object.keys(response.searchTags).length : 0,
      preselected_filters_count: response.preselectedFilters ? Object.values(response.preselectedFilters).filter((v)=>v && v !== '').length : 0,
      search_tags_error: !!response.searchTagsError
    });
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('🔥 ENHANCED EDGE FUNCTION ERROR:', error);
    console.error('🔍 Error stack:', error.stack);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
