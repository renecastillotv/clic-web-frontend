// videos-handler.ts - CON FILTRADO POR PAÍS Y CONTENT_CATEGORIES
import { getUIText } from './ui-texts.ts';
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function processMultilingualContent(item, language, contentField = 'content') {
  let processed = {};
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
function processGalleryImages(images) {
  // Si no hay imágenes o no es un array, devolver array vacío
  if (!images || !Array.isArray(images)) {
    return [];
  }
  // Procesar cada imagen en la galería
  return images.map((img)=>{
    // Si img no es un objeto, crear uno básico
    if (!img || typeof img !== 'object') {
      return {
        url: '',
        alt: '',
        width: 0,
        height: 0,
        id: ''
      };
    }
    // Procesar y normalizar cada imagen
    return {
      // ID único de la imagen (usar el existente o generarlo)
      id: img.id || img._id || `img-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      // URL de la imagen (usar la existente o una placeholder)
      url: img.url || img.src || img.path || '',
      // Texto alternativo para accesibilidad
      alt: img.alt || img.description || img.title || '',
      // Dimensiones de la imagen
      width: parseInt(img.width) || 0,
      height: parseInt(img.height) || 0,
      // Información de miniatura (si existe)
      thumbnail: img.thumbnail ? {
        url: img.thumbnail.url || '',
        width: parseInt(img.thumbnail.width) || 0,
        height: parseInt(img.thumbnail.height) || 0
      } : null,
      // Metadatos adicionales (si existen)
      metadata: img.metadata || null,
      // Campos adicionales que podrían ser útiles
      caption: img.caption || '',
      order: parseInt(img.order) || 0,
      // Si hay campos personalizados adicionales, los mantenemos
      ...Object.keys(img).filter((key)=>![
          'id',
          '_id',
          'url',
          'src',
          'path',
          'alt',
          'description',
          'title',
          'width',
          'height',
          'thumbnail',
          'metadata',
          'caption',
          'order'
        ].includes(key)).reduce((obj, key)=>({
          ...obj,
          [key]: img[key]
        }), {})
    };
  });
}
function buildVideoUrl(video, language, trackingString) {
  let slug;
  if (language === 'en' && video.slug_en) {
    slug = video.slug_en;
  } else if (language === 'fr' && video.slug_fr) {
    slug = video.slug_fr;
  } else {
    slug = video.video_slug;
  }
  if (!slug) return null;
  let url = slug;
  if (language === 'en') {
    url = `en/${slug}`;
  } else if (language === 'fr') {
    url = `fr/${slug}`;
  }
  return `/${url}${trackingString}`;
}
function buildVideoCategoryUrl(category, language, trackingString) {
  if (!category) return null;
  let slug;
  if (language === 'en' && category.slug_en) {
    slug = category.slug_en;
  } else if (language === 'fr' && category.slug_fr) {
    slug = category.slug_fr;
  } else {
    slug = category.slug;
  }
  if (!slug) return null;
  // El slug ya viene completo desde content_categories
  return `/${slug}${trackingString}`;
}
// Agrega esta función en algún lugar del archivo videos-handler.ts
function formatPrice(price, currency = 'USD') {
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price);
}

// Función para construir URLs hreflang para videos
function buildVideoHreflangUrls(videoSlugData, language, trackingString, domainInfo) {
  // Validación defensiva: si no hay domainInfo, retornar objeto vacío
  if (!domainInfo || !domainInfo.realDomain) {
    console.warn('⚠️ buildVideoHreflangUrls: domainInfo not available, returning empty hreflang');
    return {};
  }

  const buildLanguageUrl = (targetLanguage) => {
    let slug = videoSlugData.video_slug || videoSlugData.slug;
    if (targetLanguage === 'en' && videoSlugData.slug_en) slug = videoSlugData.slug_en;
    if (targetLanguage === 'fr' && videoSlugData.slug_fr) slug = videoSlugData.slug_fr;

    const path = targetLanguage === 'es' ? slug : `${targetLanguage}/${slug}`;
    return `${domainInfo.realDomain}/${path}${trackingString}`;
  };

  return {
    es: buildLanguageUrl('es'),
    en: buildLanguageUrl('en'),
    fr: buildLanguageUrl('fr')
  };
}

// Función para construir URLs hreflang para categorías de videos
function buildVideoCategoryHreflangUrls(categorySlug, language, trackingString, domainInfo) {
  // Validación defensiva: si no hay domainInfo, retornar objeto vacío
  if (!domainInfo || !domainInfo.realDomain) {
    console.warn('⚠️ buildVideoCategoryHreflangUrls: domainInfo not available, returning empty hreflang');
    return {};
  }

  const buildLanguageUrl = (targetLanguage) => {
    // El slug de categoría ya viene con el prefijo "videos/"
    let slug = categorySlug;

    // Para español, usar el slug tal cual
    if (targetLanguage === 'es') {
      return `${domainInfo.realDomain}/${slug}${trackingString}`;
    }

    // Para otros idiomas, agregar prefijo de idioma
    return `${domainInfo.realDomain}/${targetLanguage}/${slug}${trackingString}`;
  };

  return {
    es: buildLanguageUrl('es'),
    en: buildLanguageUrl('en'),
    fr: buildLanguageUrl('fr')
  };
}

// Función para construir URLs hreflang para página principal de videos
function buildVideosMainHreflangUrls(language, trackingString, domainInfo) {
  // Validación defensiva: si no hay domainInfo, retornar objeto vacío
  if (!domainInfo || !domainInfo.realDomain) {
    console.warn('⚠️ buildVideosMainHreflangUrls: domainInfo not available, returning empty hreflang');
    return {};
  }

  return {
    es: `${domainInfo.realDomain}/videos${trackingString}`,
    en: `${domainInfo.realDomain}/en/videos${trackingString}`,
    fr: `${domainInfo.realDomain}/fr/videos${trackingString}`
  };
}
// ============================================================================
// MAIN HANDLER FUNCTIONS CON FILTRADO POR PAÍS
// ============================================================================
async function handleVideosMain(params) {
  const { supabase, language, trackingString, baseData, domainInfo } = params;
  const countryTag = baseData?.countryTag;
  console.log('📹 Handling videos main with country filtering');
  console.log('🛡️ CountryTag from baseData:', !!countryTag?.id, 'ID:', countryTag?.id);
  try {
    if (!countryTag?.id) {
      console.error('❌ CRITICAL: No countryTag in baseData');
      return createFallbackResponse(language, trackingString, 'Missing country context');
    }
    // PASO 1: Obtener IDs de videos del país
    console.log('🔍 PASO 1: Obteniendo IDs de videos por país');
    const { data: videosByCountry, error: countryError } = await supabase.from('content_tags').select('content_id').eq('content_type', 'video').eq('tag_id', countryTag.id);
    if (countryError) {
      console.error('❌ Error obteniendo videos por país:', countryError);
      return createFallbackResponse(language, trackingString, countryError.message);
    }
    const countryVideoIds = (videosByCountry || []).map((ct)=>ct.content_id);
    console.log(`✅ Found ${countryVideoIds.length} videos for country ${countryTag.id}`);
    console.log('🔢 Primeros 5 IDs:', countryVideoIds.slice(0, 5));
    if (countryVideoIds.length === 0) {
      console.warn('⚠️ No videos encontrados para este país');
      return createFallbackResponse(language, trackingString, 'No videos for this country');
    }
    // PASO 2: Obtener featured y recent CON JOIN directo a users
    // CORREGIDO: bio → biography
    console.log('🔍 PASO 2: Obteniendo videos con JOIN directo a users (campo biography corregido)');
    // Consulta con JOIN para videos destacados (ahora incluye content_categories)
    const featuredQuery = supabase.from('videos').select(`
        id, title, description, video_slug, slug_en, slug_fr, thumbnail, published_at,
        views, duration, featured, content_en, content_fr, created_by_id, category_id,
        users:created_by_id(
          id, first_name, last_name, profile_photo_url, slug, position, country_code, biography
        ),
        content_categories:category_id(
          id, display_name, display_name_en, display_name_fr, slug, slug_en, slug_fr
        )
      `).in('id', countryVideoIds).eq('status', 'published').eq('featured', true).order('published_at', {
      ascending: false
    }).limit(6);
    // Consulta con JOIN para videos recientes (ahora incluye content_categories)
    const recentQuery = supabase.from('videos').select(`
        id, title, description, video_slug, slug_en, slug_fr, thumbnail, published_at,
        views, duration, content_en, content_fr, created_by_id, category_id,
        users:created_by_id(
          id, first_name, last_name, profile_photo_url, slug, position, country_code, biography
        ),
        content_categories:category_id(
          id, display_name, display_name_en, display_name_fr, slug, slug_en, slug_fr
        )
      `).in('id', countryVideoIds).eq('status', 'published').order('published_at', {
      ascending: false
    }).limit(12);
    // Ejecutar ambas consultas en paralelo
    const [featuredResult, recentResult] = await Promise.all([
      featuredQuery,
      recentQuery
    ]);
    const featuredVideos = featuredResult.data || [];
    const featuredError = featuredResult.error;
    const recentVideos = recentResult.data || [];
    const recentError = recentResult.error;
    if (featuredError) {
      console.error('❌ Error obteniendo videos destacados:', featuredError);
    }
    if (recentError) {
      console.error('❌ Error obteniendo videos recientes:', recentError);
    }
    console.log(`✅ Found ${featuredVideos.length} featured videos and ${recentVideos.length} recent videos`);
    // Analizar estructura de datos para debug
    if (featuredVideos.length > 0) {
      const sampleVideo = featuredVideos[0];
      console.log('🔍 MUESTRA DE VIDEO DESTACADO:');
      console.log('- ID:', sampleVideo.id);
      console.log('- Título:', sampleVideo.title);
      console.log('- created_by_id:', sampleVideo.created_by_id);
      console.log('- users presente:', !!sampleVideo.users);
      if (sampleVideo.users) {
        console.log('- Nombre de usuario:', `${sampleVideo.users.first_name || ''} ${sampleVideo.users.last_name || ''}`);
        console.log('- Biografía presente:', !!sampleVideo.users.biography);
      } else {
        console.log('⚠️ USUARIO NO ENCONTRADO para video:', sampleVideo.id);
        // Consulta directa para verificar si el usuario existe
        if (sampleVideo.created_by_id) {
          const { data: userCheck, error: userCheckError } = await supabase.from('users').select('id, first_name, last_name, active, show_on_website').eq('id', sampleVideo.created_by_id).single();
          if (userCheckError) {
            console.error('❌ Error verificando usuario específico:', userCheckError);
          } else if (userCheck) {
            console.log('✅ USUARIO EXISTE en tabla pero no fue devuelto en JOIN:', userCheck);
            console.log('- Usuario activo:', userCheck.active);
            console.log('- Usuario visible en web:', userCheck.show_on_website);
          } else {
            console.error('❌ USUARIO NO EXISTE en tabla users:', sampleVideo.created_by_id);
          }
        }
      }
    } else {
      console.warn('⚠️ No se encontraron videos destacados');
    }
    // PASO 3: Obtener categorías FILTRADAS POR PAÍS desde content_categories
    console.log('🔍 PASO 3: Obteniendo categorías de videos');
    const { data: videoCategories, error: categoriesError } = await supabase.from('content_categories').select('*').eq('content_type', 'videos').eq('active', true).eq('country_code', baseData?.countryCode || 'DOM').order('display_name');
    if (categoriesError) {
      console.error('❌ Error obteniendo categorías:', categoriesError);
    }
    console.log(`✅ Found ${videoCategories?.length || 0} video categories for country`);
    // Contar videos por categoría
    let processedCategories = [];
    if (videoCategories?.length > 0) {
      console.log('🔍 Contando videos por categoría');
      const categoryPromises = videoCategories.map(async (cat)=>{
        const { data: catVideos, error: catVideosError } = await supabase.from('videos').select('id').eq('category_id', cat.id).in('id', countryVideoIds).eq('status', 'published');
        if (catVideosError) {
          console.error(`❌ Error contando videos para categoría ${cat.id}:`, catVideosError);
        }
        const categoryName = getCategoryDisplayName(cat, language);
        return {
          id: cat.id,
          name: categoryName,
          slug: cat.slug,
          url: `/${cat.slug}`,
          videoCount: catVideos?.length || 0,
          description: language === 'en' && cat.description_en ? cat.description_en : language === 'fr' && cat.description_fr ? cat.description_fr : cat.description
        };
      });
      processedCategories = await Promise.all(categoryPromises);
      processedCategories = processedCategories.filter((cat)=>cat.videoCount > 0);
      console.log(`✅ Processed ${processedCategories.length} categories with videos`);
    }
    // PASO 4: Procesar videos (ya no necesitamos enriquecer con usuarios)
    console.log('🔍 PASO 4: Procesando videos');
    const processedFeatured = featuredVideos.map((video)=>processVideo(video, language, trackingString));
    const processedRecent = recentVideos.map((video)=>processVideo(video, language, trackingString));
    // Verificar si el procesamiento de videos fue exitoso
    if (processedFeatured.length > 0) {
      const sampleProcessed = processedFeatured[0];
      console.log('🔍 MUESTRA DE VIDEO PROCESADO:');
      console.log('- ID:', sampleProcessed.id);
      console.log('- Título:', sampleProcessed.title);
      console.log('- URL:', sampleProcessed.url);
      console.log('- Autor presente:', !!sampleProcessed.author);
      if (sampleProcessed.author) {
        console.log('- Nombre de autor:', sampleProcessed.author.name);
        console.log('- Posición de autor:', sampleProcessed.author.position);
      }
    }
    // SEO con hreflang
    const hreflang = buildVideosMainHreflangUrls(language, trackingString, domainInfo);
    const seo = {
      title: language === 'en' ? 'Real Estate Videos & Property Tours | CLIC Inmobiliaria' : language === 'fr' ? 'Vidéos Immobilières & Visites de Propriétés | CLIC Inmobiliaria' : 'Videos Inmobiliarios y Tours de Propiedades | CLIC Inmobiliaria',
      description: language === 'en' ? 'Watch exclusive real estate videos, property tours, and expert insights from CLIC Inmobiliaria.' : language === 'fr' ? 'Regardez des vidéos immobilières exclusives, visites de propriétés et insights d\'experts de CLIC Inmobiliaria.' : 'Mira videos inmobiliarios exclusivos, tours de propiedades e insights expertos de CLIC Inmobiliaria.',
      h1: language === 'en' ? 'Real Estate Videos & Property Tours' : language === 'fr' ? 'Vidéos Immobilières & Visites de Propriétés' : 'Videos Inmobiliarios y Tours de Propiedades',
      h2: language === 'en' ? 'Visual insights from our expert team' : language === 'fr' ? 'Insights visuels de notre équipe d\'experts' : 'Insights visuales de nuestro equipo experto',
      canonical_url: language === 'es' ? '/videos' : `/${language}/videos`,
      hreflang,
      breadcrumbs: [
        {
          name: getUIText('HOME', language),
          url: language === 'es' ? '/' : `/${language}/`
        },
        {
          name: getUIText('VIDEOS', language),
          url: language === 'es' ? '/videos' : `/${language}/videos`
        }
      ]
    };
    console.log('🎯 Videos main response ready:', {
      featuredVideos: processedFeatured.length,
      recentVideos: processedRecent.length,
      categories: processedCategories.length,
      countryProtected: true
    });
    return {
      type: 'videos-main',
      pageType: 'videos-main',
      seo,
      featuredVideos: processedFeatured,
      recentVideos: processedRecent,
      categories: processedCategories,
      stats: {
        totalVideos: processedRecent.length,
        totalCategories: processedCategories.length,
        totalViews: processedRecent.reduce((sum, video)=>sum + (video.views || 0), 0)
      },
      debug: {
        handlerVersion: 'direct-join-with-logs',
        countryTagId: countryTag.id,
        videosInCountry: countryVideoIds.length,
        securityLevel: 'country-protected-strict',
        joinMethod: 'direct',
        processedVideosWithAuthor: processedFeatured.filter((v)=>v.author && v.author.name !== getUIText('TEAM_CLIC', language)).length,
        processedVideosWithDefaultAuthor: processedFeatured.filter((v)=>!v.author || v.author.name === getUIText('TEAM_CLIC', language)).length
      }
    };
  } catch (error) {
    console.error('❌ Error in handleVideosMain:', error);
    return createFallbackResponse(language, trackingString, error.message);
  }
}
async function handleVideosCategory(params) {
  const { supabase, language, contentSegments, trackingString, baseData, domainInfo } = params;
  const countryTag = baseData?.countryTag;
  if (contentSegments.length === 0) {
    throw new Error('Category slug required');
  }
  if (!countryTag?.id) {
    throw new Error('Country context required - missing from baseData');
  }
  const categorySlug = contentSegments[0];
  console.log('📂 Handling videos category with country filter:', categorySlug);
  // Construir el slug completo según el idioma
  let fullSlug;
  if (language === 'en') {
    fullSlug = `videos/${categorySlug}`;
  } else if (language === 'fr') {
    fullSlug = `videos/${categorySlug}`;
  } else {
    fullSlug = `videos/${categorySlug}`;
  }
  const slugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
  // Buscar en content_categories
  const { data: categoryData } = await supabase.from('content_categories').select('*').eq(slugField, fullSlug).eq('content_type', 'videos').eq('active', true).eq('country_code', baseData?.countryCode || 'DOM').single();
  if (!categoryData) {
    throw new Error(`Video category "${categorySlug}" not found for this country`);
  }
  // PASO 1: Obtener IDs de videos del país
  const { data: videosByCountry } = await supabase.from('content_tags').select('content_id').eq('content_type', 'video').eq('tag_id', countryTag.id);
  const countryVideoIds = (videosByCountry || []).map((ct)=>ct.content_id);
  if (countryVideoIds.length === 0) {
    return {
      type: 'videos-category',
      pageType: 'videos-category',
      seo: buildCategorySEOFromContentCategory(categoryData, language, fullSlug),
      category: {
        id: categoryData.id,
        name: getCategoryDisplayName(categoryData, language),
        slug: categoryData.slug
      },
      videos: [],
      pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    };
  }
  const page = parseInt(params.queryParams.get('page') || '1');
  const limit = 12;
  const offset = (page - 1) * limit;
  // PASO 2: Buscar videos que cumplan AMBAS condiciones
  const { data: videos, count } = await supabase.from('videos').select(`
      id, title, description, video_slug, slug_en, slug_fr, thumbnail, published_at, 
      views, duration, content_en, content_fr, created_by_id
    `, {
    count: 'exact'
  }).in('id', countryVideoIds).eq('category_id', categoryData.id).eq('status', 'published').order('published_at', {
    ascending: false
  }).range(offset, offset + limit - 1);
  if (!videos || videos.length === 0) {
    return {
      type: 'videos-category',
      pageType: 'videos-category',
      seo: buildCategorySEOFromContentCategory(categoryData, language, fullSlug),
      category: {
        id: categoryData.id,
        name: getCategoryDisplayName(categoryData, language),
        slug: categoryData.slug
      },
      videos: [],
      pagination: {
        page,
        limit,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      }
    };
  }
  // Obtener autores
  const creatorIds = [
    ...new Set(videos.map((v)=>v.created_by_id).filter(Boolean))
  ];
  let usersMap = {};
  if (creatorIds.length > 0) {
    const { data: users } = await supabase.from('users').select('id, first_name, last_name, profile_photo_url, slug, position').in('id', creatorIds);
    if (users) {
      usersMap = users.reduce((acc, user)=>{
        acc[user.id] = user;
        return acc;
      }, {});
    }
  }
  // Procesar videos
  const enrichedVideos = videos.map((video)=>({
      ...video,
      users: usersMap[video.created_by_id] || null
    }));
  const processedVideos = enrichedVideos.map((video)=>processVideo(video, language, trackingString));
  // Paginación
  const totalPages = Math.ceil((count || 0) / limit);
  const pagination = {
    page,
    limit,
    total: count || 0,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
  const seo = buildCategorySEOFromContentCategory(categoryData, language, fullSlug);
  // Agregar hreflang al SEO
  seo.hreflang = buildVideoCategoryHreflangUrls(fullSlug, language, trackingString, domainInfo);
  return {
    type: 'videos-category',
    pageType: 'videos-category',
    seo,
    category: {
      id: categoryData.id,
      name: getCategoryDisplayName(categoryData, language),
      slug: categoryData.slug,
      description: language === 'en' && categoryData.description_en ? categoryData.description_en : language === 'fr' && categoryData.description_fr ? categoryData.description_fr : categoryData.description
    },
    videos: processedVideos,
    pagination,
    debug: {
      handlerVersion: 'country-filtered-content-categories',
      categoryId: categoryData.id,
      countryTagId: countryTag.id,
      countryVideoIds: countryVideoIds.length,
      totalVideosInCategory: count || 0,
      securityLevel: 'country-protected-strict'
    }
  };
}
async function handleSingleVideo(params) {
  const { supabase, language, contentSegments, trackingString, baseData, domainInfo } = params;
  const countryTag = baseData?.countryTag;
  if (contentSegments.length < 2) {
    throw new Error('Category and video slug required');
  }
  if (!countryTag?.id) {
    throw new Error('Country context required - missing from baseData');
  }
  const categorySlug = contentSegments[0];
  const videoSlug = contentSegments[1];
  console.log('📹 Handling single video with country filter:', categorySlug, videoSlug);
  const requestedPath = `videos/${categorySlug}/${videoSlug}`;
  const slugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'video_slug';
  // Buscar video con todos los campos
  const { data: video } = await supabase.from('videos').select('*').eq(slugField, requestedPath).eq('status', 'published').single();
  if (!video) {
    // Sugerir videos del país
    const { data: videosByCountry } = await supabase.from('content_tags').select('content_id').eq('content_type', 'video').eq('tag_id', countryTag.id);
    const countryVideoIds = (videosByCountry || []).map((ct)=>ct.content_id);
    const { data: suggestedVideos } = await supabase.from('videos').select(`
        id, title, description, video_slug, slug_en, slug_fr, thumbnail, published_at, 
        views, duration, content_en, content_fr, created_by_id
      `).in('id', countryVideoIds).eq('status', 'published').order('published_at', {
      ascending: false
    }).limit(6);
    // Get users
    const creatorIds = [
      ...new Set((suggestedVideos || []).map((v)=>v.created_by_id).filter(Boolean))
    ];
    let usersMap = {};
    if (creatorIds.length > 0) {
      const { data: users } = await supabase.from('users').select('id, first_name, last_name, profile_photo_url, slug, position').in('id', creatorIds);
      if (users) {
        usersMap = users.reduce((acc, user)=>{
          acc[user.id] = user;
          return acc;
        }, {});
      }
    }
    const enrichedSuggested = (suggestedVideos || []).map((video)=>({
        ...video,
        users: usersMap[video.created_by_id] || null
      }));
    const processedSuggested = enrichedSuggested.map((video)=>processVideo(video, language, trackingString));
    return {
      type: 'videos-single-404',
      pageType: 'videos-single-404',
      found: false,
      requestedPath,
      seo: {
        title: language === 'en' ? 'Video Not Found | CLIC Inmobiliaria' : language === 'fr' ? 'Vidéo Introuvable | CLIC Inmobiliaria' : 'Video No Encontrado | CLIC Inmobiliaria',
        description: language === 'en' ? 'The requested video was not found. Discover our latest real estate videos.' : language === 'fr' ? 'La vidéo demandée est introuvable. Découvrez nos dernières vidéos immobilières.' : 'El video solicitado no fue encontrado. Descubre nuestros últimos videos inmobiliarios.',
        h1: language === 'en' ? 'Video Not Found' : language === 'fr' ? 'Vidéo Introuvable' : 'Video No Encontrado',
        canonical_url: language === 'es' ? `/${requestedPath}` : `/${language}/${requestedPath}`,
        breadcrumbs: [
          {
            name: getUIText('HOME', language),
            url: language === 'es' ? '/' : `/${language}/`
          },
          {
            name: getUIText('VIDEOS', language),
            url: language === 'es' ? '/videos' : `/${language}/videos`
          }
        ]
      },
      suggestedVideos: processedSuggested,
      category: {
        name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (l)=>l.toUpperCase()),
        slug: categorySlug
      }
    };
  }
  // Función auxiliar para manejar campos JSON de forma segura
  function safeGetJsonField(data, field) {
    if (!data || !data[field]) return null;
    // Si ya es un objeto (parseado por Supabase), úsalo directamente
    if (typeof data[field] === 'object' && data[field] !== null) {
      return data[field];
    }
    // Si es string, intenta parsearlo
    if (typeof data[field] === 'string') {
      try {
        return JSON.parse(data[field]);
      } catch (e) {
        console.warn(`Failed to parse ${field}:`, e);
        return null;
      }
    }
    return null;
  }
  // Obtener autor del video
  let userData = null;
  if (video.created_by_id) {
    const { data: user } = await supabase.from('users').select('id, first_name, last_name, profile_photo_url, slug, position, country_code, biography, years_experience, specialty_description').eq('id', video.created_by_id).single();
    userData = user;
  }
  // Procesamiento de datos multilingües del video
  let processedTitle = video.title || '';
  let processedDescription = video.description || '';
  let processedSubtitle = video.subtitle || '';
  const multilingualContent = processMultilingualContent(video, language);
  if (multilingualContent.title) processedTitle = multilingualContent.title;
  if (multilingualContent.description) processedDescription = multilingualContent.description;
  if (multilingualContent.subtitle) processedSubtitle = multilingualContent.subtitle;
  // Procesamiento de la galería de fotos
  let photoGallery = [];
  const galleryData = safeGetJsonField(video, 'photo_gallery');
  if (galleryData && Array.isArray(galleryData)) {
    photoGallery = galleryData.map((photo)=>({
        id: photo.id,
        url: photo.url,
        alt: photo.alt || '',
        caption: photo.caption || '',
        order: photo.order || 0
      })).sort((a, b)=>a.order - b.order);
    console.log(`Processed ${photoGallery.length} photos from gallery`);
  }
  // Procesamiento de videos relacionados precargados
  let preloadedRelatedVideos = [];
  const relatedVideosData = safeGetJsonField(video, 'related_videos');
  if (relatedVideosData && Array.isArray(relatedVideosData)) {
    preloadedRelatedVideos = relatedVideosData.map((relVideo)=>({
        id: relVideo.id,
        title: relVideo.title,
        thumbnail: relVideo.thumbnail,
        slug: relVideo.video_slug,
        category: relVideo.category,
        weight: relVideo.weight || 1,
        order: relVideo.order || 1,
        relation_type: relVideo.relation_type || 'related'
      })).sort((a, b)=>a.order - b.order);
    console.log(`Processed ${preloadedRelatedVideos.length} preloaded related videos`);
  }
  // Procesamiento de artículos relacionados precargados
  let preloadedRelatedArticles = [];
  const articlesData = safeGetJsonField(video, 'related_articles');
  if (articlesData && Array.isArray(articlesData)) {
    preloadedRelatedArticles = articlesData.map((article)=>({
        id: article.id,
        title: article.title,
        slug: article.slug,
        excerpt: article.excerpt,
        category: article.category,
        read_time: article.read_time || 5,
        featuredImage: article.featured_image,
        weight: article.weight || 1,
        order: article.order || 1,
        relation_type: article.relation_type || 'related'
      })).sort((a, b)=>a.order - b.order);
    console.log(`Processed ${preloadedRelatedArticles.length} preloaded related articles`);
  }
  // Procesamiento de asesores de área
  let areaAdvisors = [];
  const advisorsData = safeGetJsonField(video, 'area_advisors');
  if (advisorsData && Array.isArray(advisorsData)) {
    areaAdvisors = advisorsData.map((advisor)=>({
        id: advisor.id,
        firstName: advisor.first_name,
        lastName: advisor.last_name,
        fullName: `${advisor.first_name || ''} ${advisor.last_name || ''}`.trim(),
        position: advisor.position,
        avatar: advisor.profile_photo_url,
        yearsExperience: advisor.years_experience || 0,
        specialtyDescription: advisor.specialty_description,
        role: advisor.role,
        order: advisor.order || 1,
        weight: advisor.weight || 1,
        email: advisor.email,
        slug: advisor.slug || advisor.id,
        url: advisor.slug ? `/${language !== 'es' ? language + '/' : ''}asesores/${advisor.slug}${trackingString}` : null
      })).sort((a, b)=>a.order - b.order);
    console.log(`Processed ${areaAdvisors.length} area advisors`);
  }
  // Procesamiento de propiedades similares precargadas
  let preloadedSimilarProperties = [];
  const propsData = safeGetJsonField(video, 'similar_properties');
  if (propsData && Array.isArray(propsData)) {
    preloadedSimilarProperties = propsData;
    console.log(`Found ${preloadedSimilarProperties.length} preloaded similar properties`);
  }
  // Obtener tags del video para buscar contenido adicional
  let videoTags = [];
  try {
    const { data: tagAssociations } = await supabase.from('content_tags').select('tag_id').eq('content_id', video.id).eq('content_type', 'video');
    if (tagAssociations && tagAssociations.length > 0) {
      const tagIds = tagAssociations.map((ta)=>ta.tag_id);
      console.log(`Found ${tagIds.length} tags associated with video: ${tagIds.join(', ')}`);
      const { data: tagDetails } = await supabase.from('tags').select('id, name, category, display_name, display_name_en, display_name_fr, slug, slug_en, slug_fr').in('id', tagIds);
      if (tagDetails && tagDetails.length > 0) {
        videoTags = tagDetails;
        console.log(`Retrieved ${videoTags.length} tag details`);
      }
    } else {
      console.log('No tags found for this video');
    }
  } catch (tagError) {
    console.error('Error fetching video tags:', tagError);
  }
  // ======================================================================
  // OBTENER TODO EL CONTENIDO RELACIONADO EN UNA SOLA LLAMADA
  // ======================================================================
  // Variables para almacenar contenidos relacionados
  let relatedProperties = [];
  let additionalRelatedVideos = [];
  let additionalRelatedArticles = [];
  let relatedTestimonials = [];
  // Solo buscar contenido relacionado si hay tags
  if (videoTags.length > 0) {
    try {
      // Obtener IDs de los tags
      const tagIds = videoTags.map((tag)=>tag.id);
      // Incluir el tag del país para filtrado correcto
      if (countryTag?.id) {
        tagIds.push(countryTag.id);
      }
      // Una sola llamada para obtener todo el contenido relacionado
      // Aumentar límite para obtener hasta 50 propiedades
      const { data: contentResult } = await supabase.rpc('get_all_content_by_tags', {
        tag_ids: tagIds,
        limit_per_type: 50
      });
      if (contentResult && contentResult.length > 0) {
        console.log(`Found ${contentResult.length} related content items`);
        // Separar por tipos de contenido
        const propertyResults = contentResult.filter((item)=>item.content_type === 'property').sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags);
        const articleResults = contentResult.filter((item)=>item.content_type === 'article').sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags);
        const videoResults = contentResult.filter((item)=>item.content_type === 'video' && item.content_id !== video.id).sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags);
        const testimonialResults = contentResult.filter((item)=>item.content_type === 'testimonial').sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags);
        console.log(`Found: ${propertyResults.length} properties, ${articleResults.length} articles, ${videoResults.length} videos, ${testimonialResults.length} testimonials`);
        // Procesar propiedades relacionadas (si no hay suficientes precargadas)
        if (propertyResults.length > 0) {
          // Aumentar a 24 propiedades relacionadas
          const propertyIds = propertyResults.slice(0, 24).map((item)=>item.content_id);
          if (propertyIds.length > 0) {
            const { data: propertiesData } = await supabase.from('properties').select(`
                id, code, name, description, content_en, content_fr, 
                sale_price, sale_currency, rental_price, rental_currency,
                bedrooms, bathrooms, built_area, land_area, parking_spots,
                is_project, main_image_url, gallery_images_url, 
                slug_url, slug_en, slug_fr, sector_id, city_id, category_id,
                cities:city_id(id, name),
                sectors:sector_id(id, name),
                property_categories:category_id(id, name, name_en, name_fr)
              `).in('id', propertyIds).eq('property_status', 'Publicada').eq('availability', 1);
            if (propertiesData && propertiesData.length > 0) {
              relatedProperties = propertiesData.map((property)=>{
                // Procesar contenido multilingüe
                let processedName = property.name || '';
                let processedDescription = property.description || '';
                const propMultilingualContent = processMultilingualContent(property, language);
                if (propMultilingualContent.name) processedName = propMultilingualContent.name;
                if (propMultilingualContent.description) processedDescription = propMultilingualContent.description;
                // Determinar slug y URL
                let propertySlug = property.slug_url || '';
                if (language === 'en' && property.slug_en) propertySlug = property.slug_en;
                if (language === 'fr' && property.slug_fr) propertySlug = property.slug_fr;
                let propertyUrl = propertySlug;
                if (language === 'en') propertyUrl = `en/${propertySlug}`;
                if (language === 'fr') propertyUrl = `fr/${propertySlug}`;
                // Formatear precio
                let formattedPrice = getUIText('PRICE_ON_CONSULTATION', language);
                if (property.sale_price && property.sale_currency) {
                  formattedPrice = formatPrice(property.sale_price, property.sale_currency, 'sale', language);
                } else if (property.rental_price && property.rental_currency) {
                  formattedPrice = formatPrice(property.rental_price, property.rental_currency, 'rental', language);
                }
                // Procesar imágenes
                const galleryImages = processGalleryImages(property.gallery_images_url);
                const mainImage = property.main_image_url || galleryImages[0] || 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Sin+Imagen';
                // Nombre de categoría según idioma
                let categoryName = property.property_categories?.name || '';
                if (language === 'en' && property.property_categories?.name_en) {
                  categoryName = property.property_categories.name_en;
                } else if (language === 'fr' && property.property_categories?.name_fr) {
                  categoryName = property.property_categories.name_fr;
                }
                return {
                  id: property.id,
                  code: property.code,
                  name: processedName,
                  description: processedDescription,
                  price: formattedPrice,
                  image: mainImage,
                  images: [
                    mainImage,
                    ...galleryImages || []
                  ].filter(Boolean),
                  bedrooms: property.bedrooms || 0,
                  bathrooms: property.bathrooms || 0,
                  area: property.built_area || property.land_area || 0,
                  location: property.sectors?.name || property.cities?.name || '',
                  category: categoryName,
                  is_project: property.is_project || false,
                  url: `/${propertyUrl}${trackingString || ''}`,
                  slug: propertySlug,
                  // Campos adicionales para formato de componente de propiedad
                  titulo: processedName,
                  precio: formattedPrice,
                  imagen: mainImage,
                  imagenes: [
                    mainImage,
                    ...galleryImages || []
                  ].filter(Boolean),
                  habitaciones: property.bedrooms || 0,
                  banos: property.bathrooms || 0,
                  metros: property.built_area || 0,
                  metros_terreno: property.land_area || 0,
                  sector: property.sectors?.name || '',
                  ciudad: property.cities?.name || '',
                  tipo: categoryName
                };
              });
              console.log(`Processed ${relatedProperties.length} related properties`);
            }
          }
        }
        // Procesar artículos relacionados (aumentados a 6)
        if (articleResults.length > 0) {
          const articleIds = articleResults.slice(0, 6).map((item)=>item.content_id);
          if (articleIds.length > 0) {
            const { data: articlesData } = await supabase.from('articles').select(`
                id, title, excerpt, slug, slug_en, slug_fr, featured_image, 
                published_at, views, read_time, content_en, content_fr,
                users:author_id(first_name, last_name, profile_photo_url, slug, position)
              `).in('id', articleIds).eq('status', 'published');
            if (articlesData && articlesData.length > 0) {
              additionalRelatedArticles = articlesData.map((article)=>{
                // Procesar contenido multilingüe
                let articleTitle = article.title || '';
                let articleExcerpt = article.excerpt || '';
                const articleContent = processMultilingualContent(article, language);
                if (articleContent.title) articleTitle = articleContent.title;
                if (articleContent.excerpt) articleExcerpt = articleContent.excerpt;
                // Determinar slug y URL
                let articleSlug = article.slug || '';
                if (language === 'en' && article.slug_en) articleSlug = article.slug_en;
                if (language === 'fr' && article.slug_fr) articleSlug = article.slug_fr;
                let articleUrl = articleSlug;
                if (language === 'en') articleUrl = `en/${articleSlug}`;
                if (language === 'fr') articleUrl = `fr/${articleSlug}`;
                // Información del autor
                const author = {
                  name: article.users ? `${article.users.first_name || ''} ${article.users.last_name || ''}`.trim() : getUIText('TEAM_CLIC', language),
                  avatar: article.users?.profile_photo_url || '/images/team/clic-experts.jpg',
                  position: article.users?.position || '',
                  url: article.users?.slug ? `/${language !== 'es' ? language + '/' : ''}asesores/${article.users.slug}${trackingString}` : null
                };
                return {
                  id: article.id,
                  title: articleTitle,
                  excerpt: articleExcerpt,
                  image: article.featured_image,
                  featuredImage: article.featured_image,
                  published_at: article.published_at,
                  publishedAt: article.published_at,
                  views: article.views || 0,
                  readTime: `${article.read_time || 5} ${getUIText('MINUTES_READ', language)}`,
                  url: `/${articleUrl}${trackingString || ''}`,
                  slug: articleSlug,
                  author
                };
              });
              console.log(`Processed ${additionalRelatedArticles.length} related articles`);
            }
          }
        }
        // Procesar videos relacionados (aumentados a 6)
        if (videoResults.length > 0) {
          const relatedVideoIds = videoResults.slice(0, 6).map((item)=>item.content_id);
          if (relatedVideoIds.length > 0) {
            const { data: videosData } = await supabase.from('videos').select(`
                id, title, description, video_slug, slug_en, slug_fr, thumbnail,
                published_at, views, duration, video_id, video_platform, category,
                content_en, content_fr, created_by_id,
                users:created_by_id(first_name, last_name, profile_photo_url, slug, position)
              `).in('id', relatedVideoIds).eq('status', 'published');
            if (videosData && videosData.length > 0) {
              additionalRelatedVideos = videosData.map((relVideo)=>{
                // Procesar contenido multilingüe
                let relVideoTitle = relVideo.title || '';
                let relVideoDescription = relVideo.description || '';
                const relVideoContent = processMultilingualContent(relVideo, language);
                if (relVideoContent.title) relVideoTitle = relVideoContent.title;
                if (relVideoContent.description) relVideoDescription = relVideoContent.description;
                // Determinar slug y URL
                let videoSlug = relVideo.video_slug;
                if (language === 'en' && relVideo.slug_en) videoSlug = relVideo.slug_en;
                if (language === 'fr' && relVideo.slug_fr) videoSlug = relVideo.slug_fr;
                let url = videoSlug;
                if (language === 'en') url = `en/${videoSlug}`;
                if (language === 'fr') url = `fr/${videoSlug}`;
                // Información del autor
                const author = {
                  name: relVideo.users ? `${relVideo.users.first_name || ''} ${relVideo.users.last_name || ''}`.trim() : getUIText('TEAM_CLIC', language),
                  avatar: relVideo.users?.profile_photo_url || '/images/team/clic-experts.jpg',
                  position: relVideo.users?.position || '',
                  url: relVideo.users?.slug ? `/${language !== 'es' ? language + '/' : ''}asesores/${relVideo.users.slug}${trackingString}` : null
                };
                return {
                  id: relVideo.id,
                  title: relVideoTitle,
                  description: relVideoDescription,
                  thumbnail: relVideo.thumbnail,
                  videoId: relVideo.video_id,
                  platform: relVideo.video_platform || 'youtube',
                  duration: relVideo.duration || '0:00',
                  views: relVideo.views || 0,
                  category: relVideo.category,
                  publishedAt: relVideo.published_at,
                  url: `/${url}${trackingString || ''}`,
                  slug: videoSlug,
                  author
                };
              });
              console.log(`Processed ${additionalRelatedVideos.length} related videos`);
            }
          }
        }
        // Procesar testimonios relacionados (aumentados a 6)
        if (testimonialResults.length > 0) {
          const testimonialIds = testimonialResults.slice(0, 6).map((item)=>item.content_id);
          if (testimonialIds.length > 0) {
            const { data: testimonialsData } = await supabase.from('testimonials').select(`
                id, title, excerpt, full_testimonial, rating, client_name, client_avatar,
                client_location, client_verified, slug, slug_en, slug_fr, published_at,
                content_en, content_fr, agent_id,
                users:users!testimonials_agent_id_fkey(first_name, last_name, profile_photo_url, slug, position)
              `).in('id', testimonialIds).eq('status', 'published');
            if (testimonialsData && testimonialsData.length > 0) {
              relatedTestimonials = testimonialsData.map((testimonial)=>{
                // Procesar contenido multilingüe
                let testimonialTitle = testimonial.title || '';
                let testimonialExcerpt = testimonial.excerpt || '';
                // Intentar extraer contenido multilingüe si existe
                if (language === 'en' && testimonial.content_en) {
                  try {
                    const contentEn = typeof testimonial.content_en === 'string' ? JSON.parse(testimonial.content_en) : testimonial.content_en;
                    if (contentEn.title) testimonialTitle = contentEn.title;
                    if (contentEn.excerpt) testimonialExcerpt = contentEn.excerpt;
                  } catch (e) {
                    console.warn('Failed to parse EN testimonial content');
                  }
                } else if (language === 'fr' && testimonial.content_fr) {
                  try {
                    const contentFr = typeof testimonial.content_fr === 'string' ? JSON.parse(testimonial.content_fr) : testimonial.content_fr;
                    if (contentFr.title) testimonialTitle = contentFr.title;
                    if (contentFr.excerpt) testimonialExcerpt = contentFr.excerpt;
                  } catch (e) {
                    console.warn('Failed to parse FR testimonial content');
                  }
                }
                // Determinar slug y URL
                let testimonialSlug = testimonial.slug || '';
                if (language === 'en' && testimonial.slug_en) testimonialSlug = testimonial.slug_en;
                if (language === 'fr' && testimonial.slug_fr) testimonialSlug = testimonial.slug_fr;
                let url = testimonialSlug;
                if (language === 'en') url = `en/${testimonialSlug}`;
                if (language === 'fr') url = `fr/${testimonialSlug}`;
                // Información del agente
                const agent = {
                  name: testimonial.users ? `${testimonial.users.first_name || ''} ${testimonial.users.last_name || ''}`.trim() : getUIText('TEAM_CLIC', language),
                  avatar: testimonial.users?.profile_photo_url || '/images/team/clic-experts.jpg',
                  position: testimonial.users?.position || '',
                  url: testimonial.users?.slug ? `/${language !== 'es' ? language + '/' : ''}asesores/${testimonial.users.slug}${trackingString}` : null
                };
                return {
                  id: testimonial.id,
                  title: testimonialTitle,
                  excerpt: testimonialExcerpt,
                  rating: testimonial.rating || 5,
                  clientName: testimonial.client_name,
                  clientAvatar: testimonial.client_avatar || '/images/default-avatar.jpg',
                  clientLocation: testimonial.client_location,
                  clientVerified: testimonial.client_verified || false,
                  publishedAt: testimonial.published_at,
                  url: `/${url}${trackingString || ''}`,
                  slug: testimonialSlug,
                  agent
                };
              });
              console.log(`Processed ${relatedTestimonials.length} related testimonials`);
            }
          }
        }
      }
    } catch (e) {
      console.error('Error fetching related content:', e);
    }
  }
  // Combinar contenido precargado con contenido encontrado dinámicamente, evitando duplicados
  // Propiedades relacionadas (limitadas a 24)
  const finalRelatedProperties = [];
  const seenPropertyIds = new Set();
  // Primero añadir propiedades precargadas
  preloadedSimilarProperties.forEach((prop)=>{
    if (!seenPropertyIds.has(prop.id)) {
      finalRelatedProperties.push(prop);
      seenPropertyIds.add(prop.id);
    }
  });
  // Luego añadir propiedades encontradas dinámicamente, evitando duplicados
  relatedProperties.forEach((prop)=>{
    if (!seenPropertyIds.has(prop.id)) {
      finalRelatedProperties.push(prop);
      seenPropertyIds.add(prop.id);
    }
  });
  // Limitar a 24 propiedades
  const limitedRelatedProperties = finalRelatedProperties.slice(0, 24);
  // Videos relacionados (limitados a 6)
  const finalRelatedVideos = [];
  const seenVideoIds = new Set();
  preloadedRelatedVideos.forEach((video)=>{
    if (!seenVideoIds.has(video.id)) {
      finalRelatedVideos.push(video);
      seenVideoIds.add(video.id);
    }
  });
  additionalRelatedVideos.forEach((video)=>{
    if (!seenVideoIds.has(video.id)) {
      finalRelatedVideos.push(video);
      seenVideoIds.add(video.id);
    }
  });
  const limitedRelatedVideos = finalRelatedVideos.slice(0, 6);
  // Artículos relacionados (limitados a 6)
  const finalRelatedArticles = [];
  const seenArticleIds = new Set();
  preloadedRelatedArticles.forEach((article)=>{
    if (!seenArticleIds.has(article.id)) {
      finalRelatedArticles.push(article);
      seenArticleIds.add(article.id);
    }
  });
  additionalRelatedArticles.forEach((article)=>{
    if (!seenArticleIds.has(article.id)) {
      finalRelatedArticles.push(article);
      seenArticleIds.add(article.id);
    }
  });
  const limitedRelatedArticles = finalRelatedArticles.slice(0, 6);
  // Testimonios relacionados (limitados a 6)
  const limitedRelatedTestimonials = relatedTestimonials.slice(0, 6);
  // Obtener categoría del video
  let categoryInfo = null;
  // Verificar si el slug de categoría ya contiene "videos/"
  const categorySlugToCheck = categorySlug.startsWith('videos/') ? categorySlug : `videos/${categorySlug}`;
  const categorySlugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
  const { data: categoryData } = await supabase.from('content_categories').select(`
      *,
      description,
      description_en,
      description_fr
    `).eq(categorySlugField, categorySlugToCheck).eq('content_type', 'videos').eq('active', true).single();
  if (categoryData) {
    // Procesar descripción según idioma
    let categoryDescription = categoryData.description || '';
    if (language === 'en' && categoryData.description_en) {
      categoryDescription = categoryData.description_en;
    } else if (language === 'fr' && categoryData.description_fr) {
      categoryDescription = categoryData.description_fr;
    }
    categoryInfo = {
      id: categoryData.id,
      name: getCategoryDisplayName(categoryData, language),
      slug: categoryData.slug,
      slug_en: categoryData.slug_en,
      slug_fr: categoryData.slug_fr,
      description: categoryDescription
    };
  } else {
    categoryInfo = {
      name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (l)=>l.toUpperCase()),
      slug: categorySlug
    };
  }
  // Incrementar views
  await supabase.from('videos').update({
    views: (video.views || 0) + 1
  }).eq('id', video.id);
  // Construir objeto de video procesado con la función existente
  const enrichedVideo = {
    ...video,
    users: userData
  };
  const processedVideo = processVideo(enrichedVideo, language, trackingString);
  // Añadir campos adicionales al objeto procesado
  processedVideo.subtitle = processedSubtitle;
  processedVideo.location = video.location || null;
  processedVideo.propertyType = video.property_type || null;
  processedVideo.videoId = video.video_id;
  processedVideo.platform = video.video_platform || 'youtube';
  processedVideo.language = video.language || 'es';
  processedVideo.metaTitle = video.meta_title || processedTitle;
  processedVideo.metaDescription = video.meta_description || '';
  processedVideo.photoGallery = photoGallery;
  processedVideo.canonicalUrl = video.canonical_url || null;
  // SEO con hreflang
  const hreflang = buildVideoHreflangUrls(video, language, trackingString, domainInfo);
  const seo = {
    title: video.meta_title || `${processedTitle} | CLIC Inmobiliaria`,
    description: video.meta_description || processedDescription.replace(/<[^>]*>?/gm, '').substring(0, 160),
    h1: processedTitle,
    h2: processedSubtitle || categoryInfo.name,
    canonical_url: video.canonical_url || processedVideo.url.replace(trackingString, ''),
    hreflang,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: getUIText('VIDEOS', language),
        url: language === 'es' ? '/videos' : `/${language}/videos`
      },
      {
        name: categoryInfo.name,
        url: `/${categorySlugToCheck}${trackingString}`
      },
      {
        name: processedTitle,
        url: processedVideo.url.replace(trackingString, '')
      }
    ],
    // Datos estructurados para video (para SEO)
    structured_data: {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: processedTitle,
      description: processedDescription.replace(/<[^>]*>?/gm, ''),
      thumbnailUrl: video.thumbnail,
      uploadDate: video.published_at,
      duration: video.duration,
      contentUrl: video.video_platform === 'youtube' ? `https://www.youtube.com/watch?v=${video.video_id}` : null,
      embedUrl: video.video_platform === 'youtube' ? `https://www.youtube.com/embed/${video.video_id}` : null,
      interactionStatistic: {
        '@type': 'InteractionCounter',
        interactionType: 'https://schema.org/WatchAction',
        userInteractionCount: video.views || 0
      }
    },
    // Datos Open Graph (para compartir en redes sociales)
    open_graph: {
      title: processedTitle,
      description: processedDescription.replace(/<[^>]*>?/gm, '').substring(0, 200),
      url: video.canonical_url || processedVideo.url.replace(trackingString, ''),
      type: 'video.other',
      image: video.thumbnail,
      video: video.video_platform === 'youtube' ? `https://www.youtube.com/watch?v=${video.video_id}` : null,
      site_name: 'CLIC Inmobiliaria'
    },
    // Metadatos de Twitter Card
    twitter_card: {
      card: 'summary_large_image',
      site: '@CLICInmobiliaria',
      title: processedTitle,
      description: processedDescription.replace(/<[^>]*>?/gm, '').substring(0, 200),
      image: video.thumbnail
    }
  };
  // Respuesta final enriquecida
  return {
    type: 'videos-single',
    pageType: 'videos-single',
    found: true,
    seo,
    video: processedVideo,
    relatedVideos: limitedRelatedVideos,
    relatedProperties: limitedRelatedProperties,
    relatedArticles: limitedRelatedArticles,
    relatedTestimonials: limitedRelatedTestimonials,
    areaAdvisors,
    photoGallery,
    videoTags,
    category: categoryInfo,
    // Contenido cruzado estructurado (formato similar a articles)
    crossContent: {
      videos: limitedRelatedVideos,
      properties: limitedRelatedProperties,
      articles: limitedRelatedArticles,
      testimonials: limitedRelatedTestimonials
    },
    debug: {
      handlerVersion: 'country-filtered-fully-enhanced-with-testimonials',
      videoId: video.id,
      countryTagId: countryTag.id,
      relatedVideosCount: limitedRelatedVideos.length,
      relatedPropertiesCount: limitedRelatedProperties.length,
      relatedArticlesCount: limitedRelatedArticles.length,
      relatedTestimonialsCount: limitedRelatedTestimonials.length,
      areaAdvisorsCount: areaAdvisors.length,
      photoGalleryCount: photoGallery.length,
      videoTagsCount: videoTags.length,
      preloadedData: {
        hasPhotoGallery: !!video.photo_gallery,
        hasRelatedVideos: !!video.related_videos,
        hasRelatedArticles: !!video.related_articles,
        hasAreaAdvisors: !!video.area_advisors,
        hasSimilarProperties: !!video.similar_properties
      },
      uniqueContentCounts: {
        uniquePropertiesCount: seenPropertyIds.size,
        uniqueVideosCount: seenVideoIds.size,
        uniqueArticlesCount: seenArticleIds.size,
        uniqueTestimonialsCount: limitedRelatedTestimonials.length
      },
      securityLevel: 'country-protected-strict'
    }
  };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function processVideo(video, language, trackingString) {
  let processedTitle = video.title;
  let processedDescription = video.description;
  const multilingualContent = processMultilingualContent(video, language);
  if (multilingualContent.title) processedTitle = multilingualContent.title;
  if (multilingualContent.description) processedDescription = multilingualContent.description;
  const url = buildVideoUrl(video, language, trackingString);
  let author;
  if (video.users) {
    author = {
      name: `${video.users.first_name || ''} ${video.users.last_name || ''}`.trim() || getUIText('TEAM_CLIC', language),
      avatar: video.users.profile_photo_url || '/images/team/clic-experts.jpg',
      slug: video.users.slug || null,
      position: video.users.position || getUIText('VIDEO_TEAM', language),
      country: video.users.country_code || 'DO',
      bio: video.users.biography
    };
  } else {
    author = {
      name: getUIText('TEAM_CLIC', language),
      avatar: '/images/team/clic-experts.jpg',
      slug: null,
      position: getUIText('VIDEO_TEAM', language),
      country: 'DO',
      bio: null
    };
  }

  // Procesar categoría si existe
  let category = null;
  if (video.content_categories) {
    const categoryName = getCategoryDisplayName(video.content_categories, language);
    const categorySlug = language === 'en' && video.content_categories.slug_en
      ? video.content_categories.slug_en
      : language === 'fr' && video.content_categories.slug_fr
        ? video.content_categories.slug_fr
        : video.content_categories.slug;

    category = {
      id: video.content_categories.id,
      name: categoryName,
      slug: categorySlug,
      url: `/${categorySlug}${trackingString || ''}`
    };
  }

  return {
    id: video.id,
    title: processedTitle,
    description: processedDescription,
    thumbnail: video.thumbnail,
    videoSlug: video.video_slug,
    duration: video.duration || '10:00',
    publishedAt: video.published_at,
    views: video.views || 0,
    featured: video.featured || false,
    url,
    slug: video.video_slug,
    slug_en: video.slug_en,
    slug_fr: video.slug_fr,
    author,
    category
  };
}
function getCategoryDisplayName(category, language) {
  if (language === 'en' && category.display_name_en) {
    return category.display_name_en;
  }
  if (language === 'fr' && category.display_name_fr) {
    return category.display_name_fr;
  }
  return category.display_name;
}
function buildCategorySEOFromContentCategory(categoryData, language, fullSlug) {
  const categoryName = getCategoryDisplayName(categoryData, language);
  const categoryDesc = language === 'en' && categoryData.description_en ? categoryData.description_en : language === 'fr' && categoryData.description_fr ? categoryData.description_fr : categoryData.description || `Mira los últimos videos de ${categoryName}.`;
  return {
    title: language === 'en' ? `${categoryName} Videos | CLIC Inmobiliaria` : language === 'fr' ? `Vidéos ${categoryName} | CLIC Inmobiliaria` : `Videos de ${categoryName} | CLIC Inmobiliaria`,
    description: categoryDesc,
    h1: `${categoryName} - ${getUIText('VIDEOS', language)}`,
    h2: language === 'en' ? `Visual insights on ${categoryName.toLowerCase()}` : language === 'fr' ? `Insights visuels sur ${categoryName.toLowerCase()}` : `Insights visuales sobre ${categoryName.toLowerCase()}`,
    canonical_url: `/${fullSlug}`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: getUIText('VIDEOS', language),
        url: language === 'es' ? '/videos' : `/${language}/videos`
      },
      {
        name: categoryName,
        url: `/${fullSlug}`
      }
    ]
  };
}
function createFallbackResponse(language, trackingString, errorMessage = null) {
  return {
    type: 'videos-main',
    pageType: 'videos-main',
    seo: {
      title: 'Videos Inmobiliarios | CLIC Inmobiliaria',
      description: 'Discover real estate videos.',
      canonical_url: language === 'es' ? '/videos' : `/${language}/videos`,
      breadcrumbs: [
        {
          name: getUIText('HOME', language),
          url: language === 'es' ? '/' : `/${language}/`
        },
        {
          name: getUIText('VIDEOS', language),
          url: language === 'es' ? '/videos' : `/${language}/videos`
        }
      ]
    },
    featuredVideos: [],
    recentVideos: [],
    categories: [],
    stats: {
      totalVideos: 0,
      totalCategories: 0,
      totalViews: 0
    },
    error: {
      message: 'No videos data available',
      details: errorMessage,
      fallback: true
    }
  };
}
// ============================================================================
// MAIN EXPORT HANDLER
// ============================================================================
export async function handleVideos(params) {
  try {
    const { contentSegments } = params;
    if (contentSegments.length === 0) {
      return await handleVideosMain(params);
    } else if (contentSegments.length === 1) {
      return await handleVideosCategory(params);
    } else if (contentSegments.length === 2) {
      return await handleSingleVideo(params);
    } else {
      throw new Error('Invalid video path structure');
    }
  } catch (error) {
    console.error('Error in videos handler:', error);
    throw error;
  }
}
