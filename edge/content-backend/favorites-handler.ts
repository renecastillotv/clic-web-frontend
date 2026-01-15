// favorites-handler.ts
import { getUIText } from './ui-texts.ts';
// ============================================================================
// FAVORITES HANDLER - SISTEMA DE FAVORITOS
// ============================================================================
async function handleFavoritesMain(params) {
  const { supabase, language, trackingString, queryParams } = params;
  console.log('❤️ Handling favorites main page');
  // Obtener listas de favoritos públicas destacadas (para mostrar ejemplos)
  const { data: publicLists } = await supabase.from('favorite_lists').select(`
      id, title, description, slug, created_at, updated_at, 
      is_public, property_count, creator_name, creator_avatar,
      tags, list_type
    `).eq('is_public', true).eq('featured', true).order('created_at', {
    ascending: false
  }).limit(6);
  // Obtener propiedades más guardadas en favoritos
  const { data: trendingProperties } = await supabase.from('property_favorites_stats').select(`
      property_id, favorite_count, recent_saves,
      properties!inner(
        id, name, main_image_url, sale_price, rental_price, 
        currency, city, sector, bedrooms, bathrooms, area, 
        slug_url, property_type
      )
    `).order('favorite_count', {
    ascending: false
  }).limit(12);
  // Procesar listas públicas
  const processedPublicLists = (publicLists || []).map((list)=>({
      id: list.id,
      title: list.title,
      description: list.description,
      slug: list.slug,
      propertyCount: list.property_count || 0,
      creatorName: list.creator_name || 'Usuario CLIC',
      creatorAvatar: list.creator_avatar || '/images/default-avatar.jpg',
      tags: list.tags || [],
      listType: list.list_type || 'mixed',
      createdAt: list.created_at,
      url: buildPublicListUrl(list.slug, language, trackingString)
    }));
  // Procesar propiedades trending
  const processedTrending = (trendingProperties || []).map((item)=>{
    const property = item.properties;
    let url = property.slug_url;
    if (language === 'en') url = `en/${url}`;
    if (language === 'fr') url = `fr/${url}`;
    return {
      id: property.id,
      name: property.name,
      mainImage: property.main_image_url,
      salePrice: property.sale_price,
      rentalPrice: property.rental_price,
      currency: property.currency || 'USD',
      location: `${property.sector || property.city || ''}`.trim(),
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      area: property.area,
      propertyType: property.property_type,
      favoriteCount: item.favorite_count || 0,
      recentSaves: item.recent_saves || 0,
      url: `/${url}${trackingString}`
    };
  });
  // Categorías de listas sugeridas
  const suggestedCategories = [
    {
      name: language === 'en' ? 'First Time Buyers' : language === 'fr' ? 'Premiers Acheteurs' : 'Primeros Compradores',
      description: language === 'en' ? 'Properties perfect for first-time homebuyers' : language === 'fr' ? 'Propriétés parfaites pour premiers acheteurs' : 'Propiedades perfectas para compradores primerizos',
      icon: 'home',
      slug: 'primeros-compradores'
    },
    {
      name: language === 'en' ? 'Investment Properties' : language === 'fr' ? 'Propriétés Investissement' : 'Propiedades de Inversión',
      description: language === 'en' ? 'High ROI potential properties for investors' : language === 'fr' ? 'Propriétés à fort potentiel ROI pour investisseurs' : 'Propiedades con alto potencial ROI para inversionistas',
      icon: 'trending-up',
      slug: 'inversion'
    },
    {
      name: language === 'en' ? 'Beachfront Living' : language === 'fr' ? 'Vie Front de Mer' : 'Vida Frente al Mar',
      description: language === 'en' ? 'Stunning oceanfront and beachside properties' : language === 'fr' ? 'Superbes propriétés front de mer et côtières' : 'Impresionantes propiedades frente al océano y costeras',
      icon: 'waves',
      slug: 'frente-al-mar'
    },
    {
      name: language === 'en' ? 'Luxury Homes' : language === 'fr' ? 'Maisons Luxe' : 'Casas de Lujo',
      description: language === 'en' ? 'Premium properties with luxury amenities' : language === 'fr' ? 'Propriétés premium avec équipements luxe' : 'Propiedades premium con amenidades de lujo',
      icon: 'crown',
      slug: 'lujo'
    },
    {
      name: language === 'en' ? 'Family Homes' : language === 'fr' ? 'Maisons Familiales' : 'Casas Familiares',
      description: language === 'en' ? 'Spacious homes perfect for growing families' : language === 'fr' ? 'Maisons spacieuses parfaites pour familles grandissantes' : 'Casas espaciosas perfectas para familias crecientes',
      icon: 'users',
      slug: 'familias'
    },
    {
      name: language === 'en' ? 'Retirement Paradise' : language === 'fr' ? 'Paradis Retraite' : 'Paraíso de Retiro',
      description: language === 'en' ? 'Perfect properties for retirement living' : language === 'fr' ? 'Propriétés parfaites pour vie de retraite' : 'Propiedades perfectas para vida de retiro',
      icon: 'sun',
      slug: 'retiro'
    }
  ];
  const seo = {
    title: language === 'en' ? 'My Favorite Properties | Save & Organize | CLIC Inmobiliaria' : language === 'fr' ? 'Mes Propriétés Favorites | Sauvegarder & Organiser | CLIC Inmobiliaria' : 'Mis Propiedades Favoritas | Guardar y Organizar | CLIC Inmobiliaria',
    description: language === 'en' ? 'Save, organize and share your favorite properties. Create custom lists, compare properties, and never lose track of homes you love in Dominican Republic.' : language === 'fr' ? 'Sauvegardez, organisez et partagez vos propriétés favorites. Créez des listes personnalisées, comparez les propriétés et ne perdez jamais de vue les maisons que vous aimez en République Dominicaine.' : 'Guarda, organiza y comparte tus propiedades favoritas. Crea listas personalizadas, compara propiedades y nunca pierdas de vista las casas que amas en República Dominicana.',
    h1: language === 'en' ? 'My Favorite Properties' : language === 'fr' ? 'Mes Propriétés Favorites' : 'Mis Propiedades Favoritas',
    h2: language === 'en' ? 'Save, organize and share the properties you love' : language === 'fr' ? 'Sauvegardez, organisez et partagez les propriétés que vous aimez' : 'Guarda, organiza y comparte las propiedades que amas',
    canonical_url: language === 'es' ? '/favoritos' : `/${language}/favorites`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: language === 'en' ? 'Favorites' : language === 'fr' ? 'Favoris' : 'Favoritos',
        url: language === 'es' ? '/favoritos' : `/${language}/favorites`
      }
    ]
  };
  return {
    type: 'favorites-main',
    pageType: 'favorites-main',
    seo,
    publicLists: processedPublicLists,
    trendingProperties: processedTrending,
    suggestedCategories,
    features: {
      createLists: {
        title: language === 'en' ? 'Create Custom Lists' : language === 'fr' ? 'Créer Listes Personnalisées' : 'Crear Listas Personalizadas',
        description: language === 'en' ? 'Organize your favorites into themed collections like "Beach Houses", "Investment Properties", or "Dream Homes"' : language === 'fr' ? 'Organisez vos favoris en collections thématiques comme "Maisons Plage", "Propriétés Investissement" ou "Maisons Rêve"' : 'Organiza tus favoritos en colecciones temáticas como "Casas de Playa", "Propiedades de Inversión" o "Casas Soñadas"',
        icon: 'folder-plus'
      },
      shareWishlist: {
        title: language === 'en' ? 'Share Your Wishlist' : language === 'fr' ? 'Partagez Votre Liste Souhaits' : 'Comparte tu Lista de Deseos',
        description: language === 'en' ? 'Share your favorite properties with family, friends, or your real estate advisor via secure link' : language === 'fr' ? 'Partagez vos propriétés favorites avec famille, amis ou votre conseiller immobilier via lien sécurisé' : 'Comparte tus propiedades favoritas con familia, amigos o tu asesor inmobiliario mediante enlace seguro',
        icon: 'share-2'
      },
      compareProperties: {
        title: language === 'en' ? 'Compare Properties' : language === 'fr' ? 'Comparer Propriétés' : 'Comparar Propiedades',
        description: language === 'en' ? 'Side-by-side comparison of your favorite properties with detailed specs, pricing, and location analysis' : language === 'fr' ? 'Comparaison côte à côte de vos propriétés favorites avec spécifications détaillées, prix et analyse localisation' : 'Comparación lado a lado de tus propiedades favoritas con especificaciones detalladas, precios y análisis de ubicación',
        icon: 'git-compare'
      },
      priceAlerts: {
        title: language === 'en' ? 'Price Alerts' : language === 'fr' ? 'Alertes Prix' : 'Alertas de Precio',
        description: language === 'en' ? 'Get notified when prices change on your favorite properties or similar ones become available' : language === 'fr' ? 'Recevez notifications quand prix changent sur vos propriétés favorites ou similaires deviennent disponibles' : 'Recibe notificaciones cuando cambien los precios de tus propiedades favoritas o similares estén disponibles',
        icon: 'bell'
      }
    },
    stats: {
      totalPublicLists: processedPublicLists.length,
      totalTrendingProperties: processedTrending.length,
      averageFavoritesPerProperty: processedTrending.length > 0 ? Math.round(processedTrending.reduce((sum, p)=>sum + p.favoriteCount, 0) / processedTrending.length) : 0
    }
  };
}
async function handleSharedFavorites(params) {
  const { supabase, language, contentSegments, trackingString, queryParams, globalConfig } = params;

  // Soportar tanto /favoritos/compartir/[slug] como /favoritos/compartir?id=[slug]
  let shareSlug;
  if (contentSegments.length >= 2) {
    shareSlug = contentSegments[1]; // /favoritos/compartir/[slug]
  } else if (queryParams && queryParams.get('id')) {
    shareSlug = queryParams.get('id'); // /favoritos/compartir?id=[slug]
  } else {
    console.error('❌ No share slug found. contentSegments:', contentSegments, 'queryParams:', queryParams);
    throw new Error('Shared list ID required');
  }

  console.log('🔗 Handling shared favorites:', shareSlug);

  // Obtener lista compartida usando la tabla device_favorites
  const { data: sharedList, error: fetchError } = await supabase
    .from('device_favorites')
    .select('*')
    .eq('device_id', shareSlug)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching shared list:', fetchError);
    throw new Error(`Error fetching shared list: ${fetchError.message}`);
  }

  if (!sharedList) {
    throw new Error(`Shared list "${shareSlug}" not found or expired`);
  }

  console.log('📋 Found shared list:', {
    id: sharedList.id,
    device_id: sharedList.device_id,
    properties_count: (sharedList.properties || []).length,
    email: sharedList.email
  });

  // Obtener detalles de las propiedades desde la tabla properties usando el esquema real
  const propertyIds = sharedList.properties || [];
  let listProperties = [];

  if (propertyIds.length > 0) {
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select(`
        id,
        code,
        name,
        private_name,
        description,
        bedrooms,
        bathrooms,
        parking_spots,
        built_area,
        land_area,
        sale_price,
        sale_currency,
        rental_price,
        rental_currency,
        main_image_url,
        gallery_images_url,
        slug_url,
        property_status,
        availability,
        sectors!properties_sector_id_fkey(name),
        cities!properties_city_id_fkey(name),
        property_categories!properties_category_id_fkey(name)
      `)
      .in('id', propertyIds)
      .eq('availability', 1);

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
    } else {
      listProperties = properties || [];
    }
  }
  // Helper para formatear precio
  function formatPropertyPrice(property) {
    if (property.sale_price && property.sale_currency) {
      const symbol = property.sale_currency === 'USD' ? 'USD$' : property.sale_currency === 'DOP' ? 'DOP$' : `${property.sale_currency}$`;
      return `${symbol}${new Intl.NumberFormat('es-DO').format(property.sale_price)}`;
    }
    if (property.rental_price && property.rental_currency) {
      const symbol = property.rental_currency === 'USD' ? 'USD$' : property.rental_currency === 'DOP' ? 'DOP$' : `${property.rental_currency}$`;
      return `${symbol}${new Intl.NumberFormat('es-DO').format(property.rental_price)}/mes`;
    }
    return 'Precio a consultar';
  }

  // Helper para obtener imagen principal
  function getMainImage(mainImageUrl, galleryImagesUrl) {
    if (mainImageUrl) return mainImageUrl;
    if (galleryImagesUrl) {
      try {
        const images = JSON.parse(galleryImagesUrl);
        if (Array.isArray(images) && images.length > 0) {
          const firstImage = images[0];
          if (typeof firstImage === 'string') return firstImage;
          if (typeof firstImage === 'object' && firstImage.url) return firstImage.url;
        }
      } catch (e) {
        return galleryImagesUrl;
      }
    }
    return 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Sin+Imagen';
  }

  // Procesar propiedades
  const processedProperties = (listProperties || []).map((property)=>{
    let url = property.slug_url;
    if (language === 'en') url = `en/${url}`;
    if (language === 'fr') url = `fr/${url}`;

    const location = [
      property.sectors?.name,
      property.cities?.name
    ].filter(Boolean).join(', ') || 'República Dominicana';

    return {
      id: property.id,
      code: property.code,
      name: property.name || property.private_name || 'Propiedad sin nombre',
      description: property.description,
      mainImage: getMainImage(property.main_image_url, property.gallery_images_url),
      price: formatPropertyPrice(property),
      salePrice: property.sale_price,
      rentalPrice: property.rental_price,
      currency: property.sale_currency || property.rental_currency || 'USD',
      location: location,
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      parkingSpots: property.parking_spots || 0,
      area: property.built_area || property.land_area || 0,
      propertyType: property.property_categories?.name || 'Propiedad',
      status: property.property_status || 'Disponible',
      url: `/${url}${trackingString}`
    };
  });
  const listTitle = language === 'en' ? 'Shared Favorites' : language === 'fr' ? 'Favoris Partagés' : 'Favoritos Compartidos';
  const ownerName = sharedList.email ? sharedList.email.split('@')[0] : 'Usuario CLIC';

  const seo = {
    title: `${listTitle} | ${language === 'en' ? 'Shared Property List' : language === 'fr' ? 'Liste Propriétés Partagée' : 'Lista de Propiedades Compartida'} | CLIC Inmobiliaria`,
    description: language === 'en' ? `Discover this curated list of ${processedProperties.length} properties` : language === 'fr' ? `Découvrez cette liste sélectionnée de ${processedProperties.length} propriétés` : `Descubre esta lista curada de ${processedProperties.length} propiedades`,
    h1: listTitle,
    h2: language === 'en' ? `${processedProperties.length} properties shared with you` : language === 'fr' ? `${processedProperties.length} propriétés partagées avec vous` : `${processedProperties.length} propiedades compartidas contigo`,
    canonical_url: language === 'es' ? `/favoritos/compartir?id=${shareSlug}` : `/${language}/favorites/share?id=${shareSlug}`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: language === 'en' ? 'Favorites' : language === 'fr' ? 'Favoris' : 'Favoritos',
        url: language === 'es' ? '/favoritos' : `/${language}/favorites`
      },
      {
        name: language === 'en' ? 'Shared List' : language === 'fr' ? 'Liste Partagée' : 'Lista Compartida',
        url: language === 'es' ? `/favoritos/compartir?id=${shareSlug}` : `/${language}/favorites/share?id=${shareSlug}`
      }
    ]
  };
  return {
    type: 'favorites-shared',
    pageType: 'favorites-shared',
    seo,
    globalConfig: globalConfig || null,
    sharedList: {
      id: sharedList.id,
      deviceId: sharedList.device_id,
      title: listTitle,
      description: language === 'en' ? 'A collection of favorite properties' : language === 'fr' ? 'Une collection de propriétés favorites' : 'Una colección de propiedades favoritas',
      propertyCount: processedProperties.length,
      createdAt: sharedList.created_at,
      updatedAt: sharedList.updated_at
    },
    sharedBy: {
      name: ownerName,
      avatar: '/images/default-avatar.jpg',
      email: sharedList.email
    },
    properties: processedProperties,
    actions: [
      {
        type: 'save_list',
        label: language === 'en' ? 'Save This List' : language === 'fr' ? 'Sauvegarder Cette Liste' : 'Guardar Esta Lista',
        icon: 'bookmark'
      },
      {
        type: 'contact_advisor',
        label: language === 'en' ? 'Contact an Advisor' : language === 'fr' ? 'Contacter un Conseiller' : 'Contactar un Asesor',
        icon: 'user'
      },
      {
        type: 'schedule_viewing',
        label: language === 'en' ? 'Schedule Viewings' : language === 'fr' ? 'Programmer Visites' : 'Programar Visitas',
        icon: 'calendar'
      }
    ]
  };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function buildPublicListUrl(listSlug, language, trackingString) {
  const basePath = language === 'es' ? 'favoritos/lista' : language === 'en' ? 'favorites/list' : 'favoris/liste';
  let url = `${basePath}/${listSlug}`;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  return `/${url}${trackingString}`;
}
// ============================================================================
// MAIN EXPORT HANDLER
// ============================================================================
export async function handleFavorites(params) {
  try {
    const { contentSegments, queryParams } = params;

    // Página principal de favoritos
    if (contentSegments.length === 0) {
      return await handleFavoritesMain(params);
    }

    // Lista de favoritos compartida
    // Soporta: /favoritos/compartir/[slug] o /favoritos/compartir?id=[slug]
    else if (
      (contentSegments.length >= 1 && contentSegments[0] === 'compartir') ||
      (contentSegments.length >= 2 && contentSegments[0] === 'compartir')
    ) {
      return await handleSharedFavorites(params);
    }

    else {
      throw new Error('Invalid favorites path structure');
    }
  } catch (error) {
    console.error('Error in favorites handler:', error);
    throw error;
  }
}
