// locations-handler.ts
import { getUIText } from './ui-texts.ts';

// ============================================================================
// LOCATIONS HANDLER - PÁGINA DE UBICACIONES
// ============================================================================

// Helper: Procesar gallery_images_url (mismo patrón que property-types-handler)
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

// Helper: Construir array final de imágenes (mismo patrón que property-types-handler)
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

export async function handleLocations(params: any) {
  const { supabase, language, trackingString, baseData } = params;

  console.log('📍 Handling locations page');
  console.log('🌍 Country tag ID:', baseData?.country?.country_tag_id);
  console.log('🗣️ Language:', language);

  // Obtener country_tag_id del país actual
  const countryTagId = baseData?.country?.country_tag_id;

  if (!countryTagId) {
    console.error('❌ No country_tag_id found in baseData');
    return {
      ...baseData,
      pageType: 'locations-main',
      locations: { countries: [], cities: [], sectors: [] },
      stats: { totalCities: 0, totalSectors: 0, totalProperties: 0 }
    };
  }

  // 1. Obtener ciudades con conteo usando RPC
  console.log('🏙️ Fetching cities with RPC...');
  const { data: cityTags, error: citiesError } = await supabase
    .rpc('get_location_tags_with_counts', {
      target_country_tag_id: countryTagId,
      location_category: 'ciudad'
    });

  if (citiesError) {
    console.error('❌ Error fetching city tags:', citiesError);
    console.error('Error details:', JSON.stringify(citiesError, null, 2));
  } else {
    console.log(`✅ Found ${cityTags?.length || 0} cities`);
    if (cityTags && cityTags.length > 0) {
      console.log('📊 Sample cities:', cityTags.slice(0, 3).map((c: any) => ({
        name: c.display_name,
        count: c.property_count
      })));
    }
  }

  // 2. Obtener sectores con conteo usando RPC
  console.log('🏘️ Fetching sectors with RPC...');
  const { data: sectorTags, error: sectorsError } = await supabase
    .rpc('get_location_tags_with_counts', {
      target_country_tag_id: countryTagId,
      location_category: 'sector'
    });

  if (sectorsError) {
    console.error('❌ Error fetching sector tags:', sectorsError);
    console.error('Error details:', JSON.stringify(sectorsError, null, 2));
  } else {
    console.log(`✅ Found ${sectorTags?.length || 0} sectors`);
    if (sectorTags && sectorTags.length > 0) {
      console.log('📊 Sample sectors:', sectorTags.slice(0, 3).map((s: any) => ({
        name: s.display_name,
        count: s.property_count
      })));
    }
  }

  // 3. Mapear ciudades según idioma
  const citiesArray = (cityTags || []).map((tag: any) => {
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
      name: displayName,
      slug: slug,
      count: tag.property_count || 0,
      tagId: tag.tag_id,
      icon: tag.icon,
      color: tag.color,
      image: `/images/cities/${slug}.jpg`
    };
  }).slice(0, 20); // Top 20 ciudades

  console.log(`🏙️ Processed ${citiesArray.length} cities for display`);

  // 4. Mapear sectores según idioma
  const sectorsArray = (sectorTags || []).map((tag: any) => {
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
      name: displayName,
      slug: slug,
      count: tag.property_count || 0,
      tagId: tag.tag_id,
      icon: tag.icon,
      color: tag.color
    };
  }).slice(0, 50); // Top 50 sectores

  console.log(`🏘️ Processed ${sectorsArray.length} sectors for display`);

  // 5. Obtener información enriquecida de seo_pages para ciudades principales (top 8)
  const topCityIds = citiesArray.slice(0, 8).map(c => c.tagId).filter(Boolean);

  console.log(`🎨 Fetching SEO pages for ${topCityIds.length} top cities...`);

  let citySeoPages = [];
  if (topCityIds.length > 0) {
    const { data: seoData, error: seoError } = await supabase
      .from('seo_pages')
      .select('*')
      .in('tag_id', topCityIds)
      .eq('content_type', 'ciudad')
      .eq('language', language);

    if (seoError) {
      console.error('⚠️ Error fetching city SEO pages:', seoError);
    } else {
      citySeoPages = seoData || [];
      console.log(`✅ Found ${citySeoPages.length} SEO pages for cities`);
    }
  }

  // 6. Crear mapa de SEO pages por tag_id
  const seoPagesByTagId = new Map(citySeoPages.map((page: any) => [page.tag_id, page]));

  // 7. Enriquecer ciudades principales con datos de seo_pages
  const enrichedCities = citiesArray.slice(0, 8).map(city => {
    const seoPage = seoPagesByTagId.get(city.tagId);

    if (seoPage) {
      // Parsear los campos JSON si vienen como string
      let marketInsights = null;
      let neighborhoodInfo = null;
      let investmentData = null;
      let tips = null;

      try {
        if (typeof seoPage.market_insights === 'string') {
          marketInsights = JSON.parse(seoPage.market_insights);
        } else {
          marketInsights = seoPage.market_insights;
        }
      } catch (e) {
        console.warn(`⚠️ Error parsing market_insights for ${city.name}:`, e);
      }

      try {
        if (typeof seoPage.neighborhood_info === 'string') {
          neighborhoodInfo = JSON.parse(seoPage.neighborhood_info);
        } else {
          neighborhoodInfo = seoPage.neighborhood_info;
        }
      } catch (e) {
        console.warn(`⚠️ Error parsing neighborhood_info for ${city.name}:`, e);
      }

      try {
        if (typeof seoPage.investment_data === 'string') {
          investmentData = JSON.parse(seoPage.investment_data);
        } else {
          investmentData = seoPage.investment_data;
        }
      } catch (e) {
        console.warn(`⚠️ Error parsing investment_data for ${city.name}:`, e);
      }

      try {
        if (typeof seoPage.tips === 'string') {
          tips = JSON.parse(seoPage.tips);
        } else {
          tips = seoPage.tips;
        }
      } catch (e) {
        console.warn(`⚠️ Error parsing tips for ${city.name}:`, e);
      }

      return {
        ...city,
        seo_title: seoPage.seo_title,
        seo_description: seoPage.seo_description,
        hero_image: seoPage.hero_content, // hero_content es la URL de la imagen
        market_insights: marketInsights,
        neighborhood_info: neighborhoodInfo,
        investment_data: investmentData,
        tips: tips,
        coordinates: seoPage.coordinates,
        location_closure: seoPage.location_closure,
        hasEnrichedData: true
      };
    }

    return {
      ...city,
      hasEnrichedData: false
    };
  });

  console.log(`🎨 Enriched ${enrichedCities.filter(c => c.hasEnrichedData).length}/${enrichedCities.length} cities with SEO data`);

  // Log sample enriched city for debugging
  const sampleEnriched = enrichedCities.find(c => c.hasEnrichedData);
  if (sampleEnriched) {
    console.log('📋 Sample enriched city:', {
      name: sampleEnriched.name,
      hasImage: !!sampleEnriched.hero_image,
      hasInsights: !!sampleEnriched.market_insights,
      hasTips: !!sampleEnriched.tips
    });
  }

  // 7.5. Obtener propiedades destacadas por sector (top 3 sectores)
  console.log('🏘️ Fetching featured properties by sector...');
  const featuredBySector: Record<string, any[]> = {};
  const countryId = baseData?.country?.id;

  for (const sector of sectorsArray.slice(0, 3)) { // Solo top 3 sectores
    console.log(`📍 Processing sector: ${sector.name}`);

    // Buscar propiedades que tengan este tag y sean del país
    const { data: contentTagsData } = await supabase
      .from('content_tags')
      .select('content_id')
      .eq('tag_id', sector.tagId)
      .eq('content_type', 'property')
      .limit(100);

    if (!contentTagsData || contentTagsData.length === 0) {
      console.log(`⚠️ No content_tags found for sector ${sector.name}`);
      continue;
    }

    const propertyIds = contentTagsData.map((ct: any) => ct.content_id);
    console.log(`📊 Found ${propertyIds.length} properties for sector ${sector.name}`);

    // Obtener las propiedades destacadas de este sector y país
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

    if (!featured || featured.length === 0) {
      console.log(`⚠️ No featured properties found for sector ${sector.name}`);
      continue;
    }

    console.log(`✅ Found ${featured.length} featured properties for sector ${sector.name}`);

    // Obtener datos relacionados (sectores, ciudades)
    const sectorIds = [...new Set(featured.map((p: any) => p.sector_id).filter(Boolean))];
    const cityIds = [...new Set(featured.map((p: any) => p.city_id).filter(Boolean))];
    const categoryIds = [...new Set(featured.map((p: any) => p.category_id).filter(Boolean))];

    const [sectorsData, citiesData, categoriesData] = await Promise.all([
      sectorIds.length > 0 ? supabase.from('sectors').select('id, name').in('id', sectorIds) : Promise.resolve({ data: [] }),
      cityIds.length > 0 ? supabase.from('cities').select('id, name').in('id', cityIds) : Promise.resolve({ data: [] }),
      categoryIds.length > 0 ? supabase.from('categories').select('id, name').in('id', categoryIds) : Promise.resolve({ data: [] })
    ]);

    // Crear mapas de lookup
    const sectorsMap = new Map((sectorsData?.data || []).map((s: any) => [s.id, s.name]));
    const citiesMap = new Map((citiesData?.data || []).map((c: any) => [c.id, c.name]));
    const categoriesMap = new Map((categoriesData?.data || []).map((cat: any) => [cat.id, cat.name]));

    // Procesar propiedades con formato completo (mismo patrón que property-types-handler)
    featuredBySector[sector.name] = featured.map((prop: any) => {
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

      // Formatear precio
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

        // PropertyCarousel component fields (EXACTAMENTE como property-types-handler)
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
        tipo: categoriesMap.get(prop.category_id) || null,
        isFormattedByProvider: true
      };
    });
  }

  console.log(`🎠 Created ${Object.keys(featuredBySector).length} sector carousels`);

  // 8. Calcular estadísticas totales
  const totalCities = citiesArray.length;
  const totalSectors = sectorsArray.length;
  const totalProperties = citiesArray.reduce((sum, city) => sum + city.count, 0);

  console.log('📊 Stats:', { totalCities, totalSectors, totalProperties });

  // 9. Traducciones
  const translations: Record<string, any> = {
    es: {
      title: 'Ubicaciones Disponibles | CLIC',
      description: 'Explora todas las ciudades y sectores donde tenemos propiedades disponibles en República Dominicana',
      h1: 'Explora Ubicaciones',
      h2: 'Encuentra propiedades en las mejores zonas de República Dominicana',
      keywords: 'ubicaciones, ciudades, sectores, zonas, República Dominicana, Santo Domingo, Santiago, Punta Cana'
    },
    en: {
      title: 'Available Locations | CLIC',
      description: 'Explore all cities and sectors where we have available properties in Dominican Republic',
      h1: 'Explore Locations',
      h2: 'Find properties in the best areas of the Dominican Republic',
      keywords: 'locations, cities, sectors, areas, Dominican Republic, Santo Domingo, Santiago, Punta Cana'
    },
    fr: {
      title: 'Emplacements Disponibles | CLIC',
      description: 'Explorez toutes les villes et secteurs où nous avons des propriétés disponibles en République Dominicaine',
      h1: 'Explorer les Emplacements',
      h2: 'Trouvez des propriétés dans les meilleures zones de la République Dominicaine',
      keywords: 'emplacements, villes, secteurs, zones, République Dominicaine, Santo Domingo, Santiago, Punta Cana'
    }
  };

  const t = translations[language] || translations.es;

  // 10. Construir canonical URL
  const canonicalBase = language === 'es' ? '' : `/${language}`;
  const canonicalPath = language === 'es' ? '/ubicaciones' :
                       language === 'en' ? '/locations' : '/emplacements';

  // 11. Breadcrumbs
  const breadcrumbs = [
    { name: language === 'es' ? 'Inicio' : language === 'en' ? 'Home' : 'Accueil', url: '/' },
    { name: language === 'es' ? 'Ubicaciones' : language === 'en' ? 'Locations' : 'Emplacements', url: canonicalBase + canonicalPath }
  ];

  // 12. Structured Data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': t.h1,
    'description': t.description,
    'numberOfItems': citiesArray.length,
    'itemListElement': citiesArray.map((city, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': city.name,
      'url': `${baseData.globalConfig?.siteUrl || ''}/${city.slug}`
    }))
  };

  console.log('✅ Locations handler completed successfully');
  console.log(`📦 Returning: ${citiesArray.length} cities (${enrichedCities.length} enriched), ${sectorsArray.length} sectors`);

  // 13. Retornar datos
  return {
    ...baseData,
    pageType: 'locations-main',
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
        image: baseData.globalConfig?.ogImage || '/og-locations.jpg',
        type: 'website'
      },
      twitter_card: {
        card: 'summary_large_image',
        title: t.title,
        description: t.description,
        image: baseData.globalConfig?.ogImage || '/og-locations.jpg'
      }
    },
    locations: {
      countries: [{
        name: baseData.country?.name || 'República Dominicana',
        slug: baseData.country?.slug || 'republica-dominicana',
        count: totalProperties || 0
      }],
      cities: citiesArray,
      sectors: sectorsArray,
      enrichedCities: enrichedCities // Ciudades principales con datos enriquecidos
    },
    stats: {
      totalCities: citiesArray.length,
      totalSectors: sectorsArray.length,
      totalProperties: totalProperties || 0
    },
    featuredBySector: featuredBySector, // Propiedades destacadas por sector
    featuredLocations: enrichedCities, // Usar ciudades enriquecidas
    popularSearches: sectorsArray.slice(0, 10),
    trackingString: `${trackingString}&page=locations`
  };
}
