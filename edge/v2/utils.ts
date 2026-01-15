// 📁 supabase/functions/unified-property-search/utils.ts
import { SYSTEM_ROUTES, SUPPORTED_LANGUAGES } from './config.ts';
export function parseUrlToSlugs(pathname) {
  if (SYSTEM_ROUTES.some((route)=>pathname.startsWith(route))) {
    return [];
  }
  return pathname.replace(/^\//, '').split('/').filter((segment)=>segment.length > 0).map((segment)=>segment.toLowerCase().trim());
}
export function detectLanguageFromUrl(urlSegments) {
  console.log('🗣️ Detectando idioma desde URL segments:', urlSegments);
  const firstSegment = urlSegments[0]?.toLowerCase();
  if (SUPPORTED_LANGUAGES.slice(0, 2).includes(firstSegment)) {
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
export function optimizePropertyImages(property) {
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
    } : undefined,
    images_unified: unifiedImages,
    images_count: unifiedImages.length
  };
}
export function unifyPropertyPricing(property) {
  const prices = {
    sale: undefined,
    rental: undefined,
    temp_rental: undefined,
    furnished_rental: undefined,
    display_price: undefined,
    price_range: undefined
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
export function extractLocationFromTags(tags) {
  const locationTag = tags?.find((tag)=>tag.category === 'ciudad' || tag.category === 'sector' || tag.category === 'provincia');
  return locationTag?.name || null;
}
export function extractPropertyTypeFromTags(tags) {
  const typeTag = tags?.find((tag)=>tag.category === 'categoria');
  return typeTag?.name || null;
}
export function extractOperationFromTags(tags) {
  const operationTag = tags?.find((tag)=>tag.category === 'operacion');
  return operationTag?.name || null;
}
export function formatSimilarProperty(property) {
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
export function formatLocationAddress(property) {
  const parts = [
    property.sectors?.name,
    property.cities?.name,
    property.cities?.provinces?.name
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : 'República Dominicana';
}
export function formatDuration(seconds) {
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
export async function checkIfHasCountryTag(supabaseClient, tagIds) {
  if (!tagIds || tagIds.length === 0) return false;
  try {
    const { data: tags } = await supabaseClient.from('tags').select('category').in('id', tagIds);
    return tags?.some((tag)=>tag.category === 'pais') || false;
  } catch (error) {
    console.error('❌ Error verificando tags de país:', error);
    return false;
  }
}
