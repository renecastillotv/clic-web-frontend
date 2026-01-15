// property-types-handler.ts
import { getUIText } from './ui-texts.ts';

// ============================================================================
// PROPERTY TYPES HANDLER - PÁGINA DE TIPOS DE PROPIEDADES
// ============================================================================

// Helper: Procesar gallery_images_url (mismo patrón que edge/backend/index.ts)
function processGalleryImages(galleryImagesUrl: any): string[] {
  let galleryImages: string[] = [];
  if (!galleryImagesUrl) return galleryImages;

  if (Array.isArray(galleryImagesUrl)) {
    galleryImages = galleryImagesUrl.filter((img) => img && typeof img === 'string' && img.trim() !== '');
  } else if (typeof galleryImagesUrl === 'string') {
    galleryImages = galleryImagesUrl.split(',').map((img) => img.trim()).filter((img) => img.length > 0);
  } else {
    try {
      const parsed = JSON.parse(galleryImagesUrl);
      if (Array.isArray(parsed)) {
        galleryImages = parsed.filter((img) => img && typeof img === 'string' && img.trim() !== '');
      }
    } catch (e) {
      galleryImages = [];
    }
  }
  return galleryImages;
}

// Helper: Construir array final de imágenes (mismo patrón que edge/backend/index.ts)
function buildFinalImagesArray(mainImageUrl: string | null, galleryImages: string[]) {
  const fallbackImage = 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Sin+Imagen';
  const mainImage = mainImageUrl?.trim() || fallbackImage;
  const safeGalleryImages = Array.isArray(galleryImages) ? galleryImages : [];

  const finalImages = [
    mainImage,
    ...safeGalleryImages.filter((img) => img !== mainImage)
  ];

  return {
    mainImage,
    finalImages
  };
}

export async function handlePropertyTypes(params: any) {
  const { supabase, language, trackingString, baseData } = params;

  console.log('🏠 Handling property types page');

  // Obtener country_tag_id del país actual
  const countryTagId = baseData?.country?.country_tag_id;

  if (!countryTagId) {
    console.error('❌ No country_tag_id found in baseData');
    return {
      ...baseData,
      pageType: 'property-types-main',
      propertyTypes: [],
      featuredByType: {}
    };
  }

  // 1. Obtener categorías con conteo usando la RPC
  const { data: categoryTags, error: tagsError } = await supabase
    .rpc('get_category_tags_with_counts', {
      target_country_tag_id: countryTagId
    });

  if (tagsError) {
    console.error('❌ Error fetching category tags:', tagsError);
  }

  console.log(`📊 Found ${categoryTags?.length || 0} categories for country`);

  // 2. Mapear a formato del layout según idioma
  const propertyTypesArray = (categoryTags || []).map((tag: any) => {
    // Seleccionar slug y nombre según idioma
    let slug = tag.slug;
    let displayName = tag.display_name;

    if (language === 'en' && tag.slug_en) {
      slug = tag.slug_en;
      displayName = tag.display_name_en || tag.display_name;
    } else if (language === 'fr' && tag.slug_fr) {
      slug = tag.slug_fr;
      displayName = tag.display_name_fr || tag.display_name;
    }

    return {
      type: displayName,
      slug: slug,
      count: tag.property_count || 0,
      icon: tag.icon || '🏘️',
      description: tag.description || '',
      color: tag.color,
      tagId: tag.tag_id
    };
  });

  // 2.5. Obtener información enriquecida de seo_pages para categorías principales (top 6)
  const topCategoryIds = propertyTypesArray.slice(0, 6).map(c => c.tagId).filter(Boolean);

  console.log(`🎨 Fetching SEO pages for ${topCategoryIds.length} top categories...`);

  let categorySeoPages = [];
  if (topCategoryIds.length > 0) {
    const { data: seoData, error: seoError } = await supabase
      .from('seo_pages')
      .select('*')
      .in('tag_id', topCategoryIds)
      .eq('content_type', 'categoria')
      .eq('language', language);

    if (seoError) {
      console.error('⚠️ Error fetching category SEO pages:', seoError);
    } else {
      categorySeoPages = seoData || [];
      console.log(`✅ Found ${categorySeoPages.length} SEO pages for categories`);
    }
  }

  // 2.6. Crear mapa de SEO pages por tag_id
  const seoPagesByTagId = new Map(categorySeoPages.map((page: any) => [page.tag_id, page]));

  // 2.7. Enriquecer categorías principales con datos de seo_pages
  const enrichedTypes = propertyTypesArray.slice(0, 6).map(propType => {
    const seoPage = seoPagesByTagId.get(propType.tagId);

    if (seoPage) {
      // Parsear los campos JSON si vienen como string
      let marketInsights = null;
      let neighborhoodInfo = null;
      let investmentData = null;
      let tips = null;

      try {
        if (typeof seoPage.market_insights === 'string' && seoPage.market_insights) {
          marketInsights = JSON.parse(seoPage.market_insights);
        } else {
          marketInsights = seoPage.market_insights;
        }
      } catch (e) {
        console.warn(`⚠️ Error parsing market_insights for ${propType.type}:`, e);
      }

      try {
        if (typeof seoPage.neighborhood_info === 'string' && seoPage.neighborhood_info) {
          neighborhoodInfo = JSON.parse(seoPage.neighborhood_info);
        } else {
          neighborhoodInfo = seoPage.neighborhood_info;
        }
      } catch (e) {
        console.warn(`⚠️ Error parsing neighborhood_info for ${propType.type}:`, e);
      }

      try {
        if (typeof seoPage.investment_data === 'string' && seoPage.investment_data) {
          investmentData = JSON.parse(seoPage.investment_data);
        } else {
          investmentData = seoPage.investment_data;
        }
      } catch (e) {
        console.warn(`⚠️ Error parsing investment_data for ${propType.type}:`, e);
      }

      try {
        if (typeof seoPage.tips === 'string' && seoPage.tips) {
          tips = JSON.parse(seoPage.tips);
        } else {
          tips = seoPage.tips;
        }
      } catch (e) {
        console.warn(`⚠️ Error parsing tips for ${propType.type}:`, e);
      }

      return {
        ...propType,
        seo_title: seoPage.seo_title,
        seo_description: seoPage.seo_description,
        hero_image: seoPage.hero_content, // hero_content es la URL de la imagen
        market_insights: marketInsights,
        neighborhood_info: neighborhoodInfo,
        investment_data: investmentData,
        tips: tips,
        location_closure: seoPage.location_closure,
        hasEnrichedData: true
      };
    }

    return {
      ...propType,
      hasEnrichedData: false
    };
  });

  console.log(`🎨 Enriched ${enrichedTypes.filter(t => t.hasEnrichedData).length}/${enrichedTypes.length} property types with SEO data`);

  // Log sample enriched type for debugging
  const sampleEnriched = enrichedTypes.find(t => t.hasEnrichedData);
  if (sampleEnriched) {
    console.log('📋 Sample enriched type:', {
      name: sampleEnriched.type,
      hasImage: !!sampleEnriched.hero_image,
      hasDescription: !!sampleEnriched.seo_description
    });
  }

  // 3. Obtener propiedades destacadas por tipo (top 6 de cada tipo)
  const featuredByType: Record<string, any[]> = {};
  const countryId = baseData?.country?.id;

  for (const type of propertyTypesArray.slice(0, 3)) { // Solo top 3 tipos
    // Buscar propiedades que tengan este tag y sean del país
    const { data: contentTagsData } = await supabase
      .from('content_tags')
      .select('content_id')
      .eq('tag_id', type.tagId)
      .eq('content_type', 'property')
      .limit(100);

    if (!contentTagsData || contentTagsData.length === 0) continue;

    const propertyIds = contentTagsData.map((ct: any) => ct.content_id);

    // Obtener las propiedades destacadas de este tipo y país (mismo patrón que carousel-handler)
    const { data: featured } = await supabase
      .from('properties')
      .select(`
        id, code, name, description, content_en, content_fr,
        sale_price, sale_currency, rental_price, rental_currency,
        temp_rental_price, temp_rental_currency, furnished_rental_price, furnished_rental_currency,
        separation_price, separation_currency,
        bedrooms, bathrooms, built_area, land_area, parking_spots, nivel,
        is_project, main_image_url, gallery_images_url,
        slug_url, slug_en, slug_fr, sector_id, city_id, category_id
      `)
      .in('id', propertyIds)
      .eq('country_id', countryId)
      .eq('property_status', 'Publicada')
      .eq('availability', 1)
      .order('code', { ascending: false })
      .limit(6);

    if (!featured || featured.length === 0) continue;

    // Obtener datos relacionados (sectores, ciudades)
    const sectorIds = [...new Set(featured.map((p: any) => p.sector_id).filter(Boolean))];
    const cityIds = [...new Set(featured.map((p: any) => p.city_id).filter(Boolean))];

    const [sectorsData, citiesData] = await Promise.all([
      sectorIds.length > 0 ? supabase.from('sectors').select('id, name').in('id', sectorIds) : Promise.resolve({ data: [] }),
      cityIds.length > 0 ? supabase.from('cities').select('id, name').in('id', cityIds) : Promise.resolve({ data: [] })
    ]);

    // Crear mapas de lookup
    const sectorsMap = new Map((sectorsData?.data || []).map((s: any) => [s.id, s.name]));
    const citiesMap = new Map((citiesData?.data || []).map((c: any) => [c.id, c.name]));

    // Procesar propiedades con formato completo (mismo patrón que carousel-handler)
    featuredByType[type.type] = featured.map((prop: any) => {
      // Procesar contenido multiidioma
      let processedName = prop.name || '';
      if (language === 'en' && prop.content_en) {
        try {
          const contentEn = typeof prop.content_en === 'string' ? JSON.parse(prop.content_en) : prop.content_en;
          if (contentEn.name) processedName = contentEn.name;
        } catch (e) { /* ignore */ }
      } else if (language === 'fr' && prop.content_fr) {
        try {
          const contentFr = typeof prop.content_fr === 'string' ? JSON.parse(prop.content_fr) : prop.content_fr;
          if (contentFr.name) processedName = contentFr.name;
        } catch (e) { /* ignore */ }
      }

      // Construir URL con idioma
      let propertySlug = prop.slug_url || '';
      if (language === 'en' && prop.slug_en) propertySlug = prop.slug_en;
      if (language === 'fr' && prop.slug_fr) propertySlug = prop.slug_fr;

      let propertyUrl = propertySlug;
      if (language === 'en') propertyUrl = `en/${propertySlug}`;
      if (language === 'fr') propertyUrl = `fr/${propertySlug}`;

      // Formatear precio (mismo patrón que carousel-handler)
      let formattedPrice = 'Precio a consultar';
      if (prop.sale_price && prop.sale_currency) {
        const currencySymbol = prop.sale_currency === 'USD' ? 'USD$' : 'RD$';
        formattedPrice = `${currencySymbol}${prop.sale_price.toLocaleString()}`;
      } else if (prop.rental_price && prop.rental_currency) {
        const currencySymbol = prop.rental_currency === 'USD' ? 'USD$' : 'RD$';
        formattedPrice = `${currencySymbol}${prop.rental_price.toLocaleString()}/mes`;
      }

      // Procesar imágenes usando helpers
      const galleryImages = processGalleryImages(prop.gallery_images_url);
      const { mainImage, finalImages } = buildFinalImagesArray(prop.main_image_url, galleryImages);

      // Retornar objeto con TODOS los campos que espera PropertyCarousel
      return {
        // API fields
        id: prop.id,
        code: prop.code,
        name: processedName,
        sale_price: prop.sale_price,
        sale_currency: prop.sale_currency,
        rental_price: prop.rental_price,
        rental_currency: prop.rental_currency,
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
        slug_url: propertySlug,
        url: `/${propertyUrl}${trackingString || ''}`,

        // PropertyCarousel component fields (EXACTAMENTE como carousel-handler)
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
        tipo: type.type,
        isFormattedByProvider: true
      };
    });
  }

  // 4. Retornar tipos enriquecidos y no enriquecidos
  const remainingTypes = propertyTypesArray.slice(6); // Resto de tipos sin enriquecer

  console.log(`📦 Returning: ${enrichedTypes.length} featured types, ${remainingTypes.length} other types`);

  // 5. Traducciones de página
  const translations: Record<string, any> = {
    es: {
      title: 'Tipos de Propiedades | CLIC',
      description: 'Explora todos los tipos de propiedades disponibles: apartamentos, casas, villas, penthouses, terrenos y locales comerciales',
      h1: 'Tipos de Propiedades',
      h2: 'Encuentra el inmueble perfecto para ti',
      keywords: 'tipos de propiedades, apartamentos, casas, villas, penthouses, terrenos, locales comerciales'
    },
    en: {
      title: 'Property Types | CLIC',
      description: 'Explore all available property types: apartments, houses, villas, penthouses, land and commercial spaces',
      h1: 'Property Types',
      h2: 'Find the perfect property for you',
      keywords: 'property types, apartments, houses, villas, penthouses, land, commercial spaces'
    },
    fr: {
      title: 'Types de Propriétés | CLIC',
      description: 'Explorez tous les types de propriétés disponibles : appartements, maisons, villas, penthouses, terrains et locaux commerciaux',
      h1: 'Types de Propriétés',
      h2: 'Trouvez la propriété parfaite pour vous',
      keywords: 'types de propriétés, appartements, maisons, villas, penthouses, terrains, locaux commerciaux'
    }
  };

  const t = translations[language] || translations.es;

  // 5. Construir canonical URL
  const canonicalBase = language === 'es' ? '' : `/${language}`;
  const canonicalPath = language === 'es' ? '/propiedades' :
                       language === 'en' ? '/property-types' : '/types-de-proprietes';

  // 6. Breadcrumbs
  const breadcrumbs = [
    { name: language === 'es' ? 'Inicio' : language === 'en' ? 'Home' : 'Accueil', url: '/' },
    { name: language === 'es' ? 'Tipos de Propiedades' : language === 'en' ? 'Property Types' : 'Types de Propriétés', url: canonicalBase + canonicalPath }
  ];

  // 7. Structured Data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': t.h1,
    'description': t.description,
    'numberOfItems': propertyTypesArray.length,
    'itemListElement': propertyTypesArray.map((type, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': type.type,
      'url': `${baseData.globalConfig?.siteUrl || ''}/${type.slug}`,
      'description': type.description
    }))
  };

  // 8. Retornar datos
  return {
    ...baseData,
    pageType: 'property-types-main',
    seo: {
      title: t.title,
      description: t.description,
      h1: t.h1,
      h2: t.h2,
      keywords: t.keywords,
      canonical_url: canonicalBase + canonicalPath,
      breadcrumbs,
      structured_data: structuredData,
      open_graph: {
        title: t.title,
        description: t.description,
        image: baseData.globalConfig?.ogImage || '/og-property-types.jpg',
        type: 'website'
      },
      twitter_card: {
        card: 'summary_large_image',
        title: t.title,
        description: t.description,
        image: baseData.globalConfig?.ogImage || '/og-property-types.jpg'
      }
    },
    propertyTypes: propertyTypesArray, // Todos los tipos
    enrichedTypes: enrichedTypes, // Top 6 tipos con datos enriquecidos
    remainingTypes: remainingTypes, // Resto de tipos
    featuredByType,
    trackingString: `${trackingString}&page=property-types`
  };
}
