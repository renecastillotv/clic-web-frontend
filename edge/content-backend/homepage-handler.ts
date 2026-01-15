// homepage-handler.ts - VERSIÓN CORREGIDA CON URLS Y COMPATIBILIDAD MEJORADA
import { getUIText } from './ui-texts.ts';
// Constante del tag home-page
const HOMEPAGE_TAG_ID = "80b25f4e-7278-4da1-8c21-60f77e140fcc";
// ============================================================================
// HOMEPAGE HANDLER CON TAG DINÁMICO - USA EL MISMO PATRÓN QUE PROPERTY-LIST
// ============================================================================
export async function handleHomepage(params) {
  try {
    const { supabase, language, trackingString, baseData, queryParams } = params;
    // Validar parámetros esenciales
    if (!supabase) {
      throw new Error('Supabase client is required');
    }
    if (!baseData) {
      throw new Error('baseData is missing');
    }
    // Extraer datos por país con validaciones seguras
    const { country = {}, globalConfig = {}, hotItems = {} } = baseData;
    const countryCode = country?.code || 'DOM';
    const countryTag = country?.tags;
    const isDefaultCountry = countryCode === 'DOM';
    console.log(`Processing homepage for country: ${countryCode} (Default: ${isDefaultCountry})`);
    // CONFIGURACIÓN DE TAGS PARA HOMEPAGE DINÁMICA
    const tagIds = [];
    if (countryTag?.id) {
      tagIds.push(countryTag.id);
      console.log(`Added country tag: ${countryTag.id} for ${countryCode}`);
    }
    tagIds.push(HOMEPAGE_TAG_ID);
    console.log(`Using homepage tag: ${HOMEPAGE_TAG_ID}`);
    console.log(`Final tag IDs for homepage:`, tagIds);
    // QUERIES UNIFICADAS USANDO EL PATRÓN DE PROPERTY-LIST
    const executeHomepageQueries = async ()=>{
      console.log('DEBUG: Starting unified homepage queries with tags:', tagIds);
      console.log('DEBUG: Country code for advisors:', countryCode);
      console.log('DEBUG: Homepage tag ID:', HOMEPAGE_TAG_ID);
      const queries = [
        // 1. PROPIEDADES - Usar la misma RPC que property-list
        supabase.rpc('get_properties_with_all_tags', {
          tag_ids: tagIds
        }),
        // 2. CONTENIDO RELACIONADO - Una sola RPC para todo el contenido CON LÍMITE AUMENTADO
        supabase.rpc('get_all_content_by_tags', {
          tag_ids: tagIds,
          limit_per_type: 50 // ✅ Aumentado de 15 a 50 para obtener más contenido
        }),
        // 3. ASESORES - Query corregida con el nombre correcto de tabla
        (async ()=>{
          console.log('DEBUG: Starting advisors query');
          console.log('DEBUG: Looking for users with tag_id:', HOMEPAGE_TAG_ID);
          console.log('DEBUG: And country_code:', countryCode);
          // Primero, verificar qué hay en user_tags (nombre correcto)
          const { data: userTagsCheck } = await supabase.from('user_tags').select('user_id, tag_id').eq('tag_id', HOMEPAGE_TAG_ID).limit(5);
          console.log('DEBUG: Users with homepage tag:', userTagsCheck?.length || 0, userTagsCheck);
          // Luego, hacer la consulta completa con el nombre correcto
          const { data: advisorsResult, error: advisorsError } = await supabase.from('user_tags').select(`
              user_id,
              users (
                id, first_name, last_name, profile_photo_url, slug, position, biography,
                phone, years_experience, sales_count, 
                languages, country_code, active, role, content_en, content_fr
              )
            `).eq('tag_id', HOMEPAGE_TAG_ID);
          console.log('DEBUG: Advisors query result:', {
            error: advisorsError,
            dataLength: advisorsResult?.length || 0,
            sample: advisorsResult?.[0]
          });
          // Filtrar por país y rol después de la consulta
          const filteredAdvisors = (advisorsResult || []).filter((item)=>{
            if (!item.users) return false;
            const user = item.users;
            const matchesCountry = user.country_code === countryCode;
            const isActive = user.active === true;
            // Filtro más flexible para rol: incluir variantes comunes de asesores
            const isAgent = user.role && (user.role.toLowerCase().includes('agent') || user.role.toLowerCase().includes('administrador') || user.role.toLowerCase().includes('agente') || user.role.toLowerCase().includes('asesor'));
            console.log(`DEBUG: User ${user.first_name} ${user.last_name}:`, {
              country: user.country_code,
              matchesCountry,
              active: user.active,
              isActive,
              role: user.role,
              isAgent
            });
            return matchesCountry && isActive && isAgent;
          }).slice(0, 6);
          console.log('DEBUG: Filtered advisors:', filteredAdvisors.length);
          console.log('DEBUG: Sample filtered advisor:', filteredAdvisors[0]);
          return {
            data: filteredAdvisors,
            error: advisorsError
          };
        })()
      ];
      return await Promise.allSettled(queries);
    };
    // Ejecutar queries unificadas
    const results = await executeHomepageQueries();
    const [propertyIdsResult, contentResult, advisorsResult] = results;
    // Extraer datos de manera segura CON DEBUG DETALLADO
    const propertyIds = getResultData(propertyIdsResult, []);
    const contentData = getResultData(contentResult, []);
    const advisorsData = getResultData(advisorsResult, []);
    console.log(`Homepage queries results:`, {
      propertyIds: propertyIds.length,
      propertyIdsType: Array.isArray(propertyIds),
      propertyIdsFirst5: propertyIds.slice(0, 5),
      contentData: contentData.length,
      advisors: advisorsData.length,
      contentTypes: contentData.map((c)=>c.content_type),
      advisorsNames: advisorsData.map((a)=>a.users ? `${a.users.first_name} ${a.users.last_name}` : 'No user')
    });
    // OBTENER PROPIEDADES DETALLADAS (primeras 20 para homepage)
    let processedFeatured = [];
    let processedRecent = [];
    if (propertyIds.length > 0) {
      console.log(`Fetching detailed property data for ${Math.min(propertyIds.length, 20)} properties`);
      console.log(`First 5 property IDs:`, propertyIds.slice(0, 5));
      const { data: propertiesData, error: propertiesError } = await supabase.from('properties').select(`
          id, code, name, description, content_en, content_fr, 
          sale_price, sale_currency, rental_price, rental_currency,
          temp_rental_price, temp_rental_currency, furnished_rental_price, furnished_rental_currency,
          bedrooms, bathrooms, built_area, land_area, parking_spots, nivel,
          is_project, main_image_url, gallery_images_url,
          slug_url, slug_en, slug_fr, sector_id, city_id, category_id
        `).in('id', propertyIds.slice(0, 20)) // Limitar para homepage
      .eq('property_status', 'Publicada').eq('availability', 1);
      console.log('Properties query result:', {
        error: propertiesError,
        dataLength: propertiesData?.length || 0,
        sampleProperty: propertiesData?.[0] ? {
          id: propertiesData[0].id,
          name: propertiesData[0].name,
          is_project: propertiesData[0].is_project,
          sale_price: propertiesData[0].sale_price,
          property_status: 'should be Publicada',
          availability: 'should be 1'
        } : 'None'
      });
      if (!propertiesError && propertiesData && propertiesData.length > 0) {
        console.log(`Retrieved ${propertiesData.length} detailed properties`);
        // Obtener datos relacionados (sectores, ciudades, categorías, amenidades)
        const sectorIds = [
          ...new Set(propertiesData.map((p)=>p.sector_id).filter(Boolean))
        ];
        const cityIds = [
          ...new Set(propertiesData.map((p)=>p.city_id).filter(Boolean))
        ];
        const categoryIds = [
          ...new Set(propertiesData.map((p)=>p.category_id).filter(Boolean))
        ];
        const detailedPropertyIds = propertiesData.map((p)=>p.id);
        const [sectorsData, citiesData, categoriesData, amenitiesData] = await Promise.all([
          sectorIds.length > 0 ? supabase.from('sectors').select('id, name').in('id', sectorIds) : Promise.resolve({
            data: []
          }),
          cityIds.length > 0 ? supabase.from('cities').select('id, name').in('id', cityIds) : Promise.resolve({
            data: []
          }),
          categoryIds.length > 0 ? supabase.from('property_categories').select('id, name, name_en, name_fr').in('id', categoryIds) : Promise.resolve({
            data: []
          }),
          detailedPropertyIds.length > 0 ? supabase.from('property_amenities').select(`
            property_id,
            amenities(id, name, name_en, name_fr, icon, category, active)
          `).in('property_id', detailedPropertyIds) : Promise.resolve({
            data: []
          })
        ]);
        // Crear mapas de lookups
        const sectorsMap = new Map((sectorsData.data || []).map((s)=>[
            s.id,
            s.name
          ]));
        const citiesMap = new Map((citiesData.data || []).map((c)=>[
            c.id,
            c.name
          ]));
        const categoriesMap = new Map((categoriesData.data || []).map((cat)=>[
            cat.id,
            getCategoryName(cat, language)
          ]));
        // Crear mapa de amenidades
        const amenitiesMap = new Map();
        (amenitiesData.data || []).forEach((pa)=>{
          if (pa.amenities && pa.amenities.active) {
            if (!amenitiesMap.has(pa.property_id)) {
              amenitiesMap.set(pa.property_id, []);
            }
            amenitiesMap.get(pa.property_id).push(pa.amenities);
          }
        });
        // Procesar propiedades usando la misma lógica que property-list
        const allProcessed = propertiesData.map((prop)=>processProperty(prop, language, trackingString, countryCode, {
            sectorsMap,
            citiesMap,
            categoriesMap,
            amenitiesMap
          }));
        // Como no existe el campo 'featured', usar estrategia alternativa:
        // - Primeras 8 como "destacadas" 
        // - Resto como "recientes"
        // - Dar prioridad a proyectos en destacadas
        const projects = allProcessed.filter((p)=>p.isProject);
        const nonProjects = allProcessed.filter((p)=>!p.isProject);
        // Mezclar: proyectos primero, luego propiedades regulares
        const sortedProperties = [
          ...projects,
          ...nonProjects
        ];
        processedFeatured = sortedProperties.slice(0, 8);
        processedRecent = sortedProperties.slice(8, 20);
        console.log(`Properties processed: ${allProcessed.length} total, ${projects.length} projects, ${processedFeatured.length} featured, ${processedRecent.length} recent`);
      } else {
        console.error('Error fetching detailed properties:', propertiesError);
      }
    }
    // PROCESAR CONTENIDO RELACIONADO
    let processedTestimonials = [];
    let processedArticles = [];
    let processedVideos = [];
    let processedFaqs = [];
    if (contentData.length > 0) {
      console.log(`Processing ${contentData.length} content items`);
      // Separar por tipo de contenido
      const testimonialIds = contentData.filter((c)=>c.content_type === 'testimonial').map((c)=>c.content_id);
      const articleIds = contentData.filter((c)=>c.content_type === 'article').map((c)=>c.content_id);
      const videoIds = contentData.filter((c)=>c.content_type === 'video').map((c)=>c.content_id);
      const faqIds = contentData.filter((c)=>c.content_type === 'faq').map((c)=>c.content_id);
      console.log('DEBUG: Content IDs found:', {
        testimonials: testimonialIds.length,
        articles: articleIds.length,
        videos: videoIds.length,
        faqs: faqIds.length,
        articlesIds: articleIds.slice(0, 5),
        videosIds: videoIds.slice(0, 5) // Primeros 5 para ver muestra
      });
      // Ejecutar consultas paralelas para contenido
      const contentQueries = [];
      if (testimonialIds.length > 0) {
        contentQueries.push(supabase.from('testimonials').select(`
              id, title, excerpt, rating, client_name, client_avatar,
              client_location, client_verified, category, slug, slug_en, slug_fr,
              full_testimonial, subtitle, featured, published_at, views, read_time,
              client_profession, transaction_location,
              users:users!testimonials_agent_id_fkey(first_name, last_name, profile_photo_url, slug)
            `).in('id', testimonialIds).eq('status', 'published').limit(6).then(({ data })=>({
            type: 'testimonials',
            data: data || []
          })));
      }
      if (articleIds.length > 0) {
        contentQueries.push(supabase.from('articles').select(`
              id, title, excerpt, slug, slug_en, slug_fr, featured_image, 
              published_at, views, read_time, featured, category_id,
              users:users!articles_author_id_fkey(first_name, last_name, profile_photo_url, slug),
              content_categories!articles_category_id_fkey(id, category, display_name, display_name_en, display_name_fr, slug, slug_en, slug_fr)
            `).in('id', articleIds).eq('status', 'published').limit(20) // ✅ Aumentado de 6 a 20
        .then(({ data })=>({
            type: 'articles',
            data: data || []
          })));
      }
      if (videoIds.length > 0) {
        contentQueries.push(supabase.from('videos').select(`
              id, title, description, video_slug, slug_en, slug_fr, thumbnail, 
              duration, views, featured, video_id, category_id,
              users:users!videos_created_by_id_fkey(first_name, last_name, profile_photo_url, slug),
              content_categories!videos_category_id_fkey(id, category, display_name, display_name_en, display_name_fr, slug, slug_en, slug_fr)
            `).in('id', videoIds).eq('status', 'published').limit(20) // ✅ Aumentado de 4 a 20
        .then(({ data })=>({
            type: 'videos',
            data: data || []
          })));
      }
      if (faqIds.length > 0) {
        contentQueries.push(supabase.from('faqs').select('id, question, answer, content_en, content_fr').in('id', faqIds).eq('status', 'published').limit(8).then(({ data })=>({
            type: 'faqs',
            data: data || []
          })));
      }
      if (contentQueries.length > 0) {
        const contentResults = await Promise.all(contentQueries);
        contentResults.forEach((result)=>{
          if (result.type === 'testimonials') {
            processedTestimonials = safeProcessArray(result.data, (testimonial)=>processTestimonial(testimonial, language, trackingString, countryCode));
          } else if (result.type === 'articles') {
            processedArticles = safeProcessArray(result.data, (article)=>processArticle(article, language, trackingString, countryCode));
          } else if (result.type === 'videos') {
            processedVideos = safeProcessArray(result.data, (video)=>processVideo(video, language, trackingString, countryCode));
          } else if (result.type === 'faqs') {
            processedFaqs = safeProcessArray(result.data, (faq)=>processFaq(faq, language));
          }
        });
      }
    }
    // PROCESAR ASESORES
    let processedAdvisors = [];
    if (advisorsData.length > 0) {
      console.log(`Processing ${advisorsData.length} advisors`);
      processedAdvisors = safeProcessArray(advisorsData, (item)=>{
        if (item.users) {
          return processAdvisor(item.users, language, trackingString, countryCode);
        }
        return null;
      });
    }
    console.log(`Homepage content processed:`, {
      featured: processedFeatured.length,
      recent: processedRecent.length,
      testimonials: processedTestimonials.length,
      articles: processedArticles.length,
      videos: processedVideos.length,
      advisors: processedAdvisors.length,
      faqs: processedFaqs.length
    });
    // HERO DINÁMICO POR PAÍS (mantener igual)
    const heroConfig = buildCountrySpecificHero(globalConfig, countryCode, language);
    // CONSTRUIR SECCIONES CON CONTENIDO REAL
    const homepageSections = buildDynamicSections({
      heroConfig,
      processedFeatured,
      processedRecent,
      processedTestimonials,
      processedAdvisors,
      processedArticles,
      processedVideos,
      processedFaqs,
      countryCode,
      language,
      trackingString,
      isDefaultCountry,
      globalConfig
    });
    // SEO BÁSICO POR PAÍS (mantener igual)
    const seo = buildCountrySEO({
      countryCode,
      language,
      globalConfig,
      isDefaultCountry,
      propertiesCount: processedFeatured.length + processedRecent.length
    });
    // ESTADÍSTICAS DINÁMICAS
    const quickStats = buildDynamicQuickStats({
      processedFeatured,
      processedRecent,
      processedAdvisors,
      processedTestimonials,
      processedArticles,
      processedVideos
    });
    // Obtener filtros de búsqueda básicos (mantener igual)
    const searchFilters = await getBasicSearchFilters(supabase, language, countryTag?.id);
    // RESPUESTA CON DATOS DINÁMICOS REALES
    return {
      type: 'homepage',
      pageType: 'homepage',
      contentType: 'homepage',
      seo,
      sections: homepageSections,
      quickStats,
      searchFilters,
      marketInsights: {
        averagePrice: 0,
        priceGrowth: '+8%',
        totalListings: processedFeatured.length + processedRecent.length,
        salesVolume: 0
      },
      ...baseData,
      countryConfig: {
        code: countryCode,
        name: country?.name || 'Unknown',
        isDefault: isDefaultCountry,
        showReneBranding: isDefaultCountry,
        globalConfig: globalConfig,
        hotItems: hotItems,
        hasContent: processedFeatured.length > 0 || processedRecent.length > 0,
        contentSummary: {
          properties: processedFeatured.length + processedRecent.length,
          projects: 0,
          testimonials: processedTestimonials.length,
          articles: processedArticles.length,
          videos: processedVideos.length,
          advisors: processedAdvisors.length,
          faqs: processedFaqs.length,
          cities: 0,
          sectors: 0
        },
        // Datos adicionales del tag homepage
        homepageTagUsed: true,
        homepageTagId: HOMEPAGE_TAG_ID,
        totalContentItems: contentData.length
      }
    };
  } catch (error) {
    console.error('Error in enhanced homepage handler:', error);
    // Respuesta mínima sin fallback a otros países (mantener igual)
    const language = params?.language || 'es';
    const baseData = params?.baseData || {};
    const countryCode = baseData?.country?.code || 'DOM';
    return {
      type: 'homepage',
      pageType: 'homepage',
      contentType: 'homepage',
      seo: buildFallbackSEO(countryCode, language),
      sections: [],
      quickStats: {},
      searchFilters: {
        operations: [],
        propertyTypes: [],
        cities: [],
        priceRanges: [],
        bedrooms: []
      },
      marketInsights: {
        averagePrice: 0,
        priceGrowth: '+0%',
        totalListings: 0,
        salesVolume: 0
      },
      ...baseData,
      error: error.message,
      countryConfig: {
        code: countryCode,
        name: 'Unknown',
        isDefault: countryCode === 'DOM',
        showReneBranding: countryCode === 'DOM',
        globalConfig: baseData.globalConfig || {},
        hotItems: baseData.hotItems || {},
        hasContent: false,
        contentSummary: {
          properties: 0,
          projects: 0,
          testimonials: 0,
          articles: 0,
          videos: 0,
          advisors: 0,
          cities: 0,
          sectors: 0
        },
        homepageTagUsed: false,
        homepageTagId: HOMEPAGE_TAG_ID
      }
    };
  }
}
// ============================================================================
// FUNCIONES AUXILIARES MEJORADAS CON EL PATRÓN DE PROPERTY-LIST
// ============================================================================
function getResultData(result, fallback) {
  return result.status === 'fulfilled' ? result.value?.data || fallback : fallback;
}
function safeProcessArray(array, processor) {
  if (!Array.isArray(array)) return [];
  return array.map((item)=>{
    try {
      return processor(item);
    } catch (error) {
      console.error('Error processing array item:', error);
      return null;
    }
  }).filter(Boolean);
}
function getCategoryName(category, language) {
  if (!category) return '';
  if (language === 'en' && category.name_en) return category.name_en;
  if (language === 'fr' && category.name_fr) return category.name_fr;
  return category.name || '';
}
// ✅ NUEVA FUNCIÓN: Obtener nombre de categoría según idioma desde content_categories
function getCategoryDisplayName(category, language) {
  if (!category) return 'General';
  // Si es un array, tomar el primer elemento
  const cat = Array.isArray(category) ? category[0] : category;
  if (!cat) return 'General';
  // Priorizar display_name traducido según idioma
  if (language === 'en' && cat.display_name_en) return cat.display_name_en;
  if (language === 'fr' && cat.display_name_fr) return cat.display_name_fr;
  // Fallback al display_name por defecto
  return cat.display_name || cat.category || 'General';
}
function processProperty(property, language, trackingString, countryCode, lookupMaps) {
  if (!property || !property.id) throw new Error('Invalid property data');
  const { sectorsMap, citiesMap, categoriesMap, amenitiesMap } = lookupMaps;
  // Construir URL con contexto de país
  let url = property.slug_url || `propiedad-${property.id}`;
  if (language !== 'es') url = `${language}/${url}`;
  const processedName = getMultilingualField(property, 'name', language) || property.name || `Propiedad ${countryCode}`;
  const processedDescription = getMultilingualField(property, 'description', language) || property.description || '';
  // Formatear precio
  const formattedPrice = formatPropertyPrice(property, language);
  // Procesar imágenes
  const galleryImages = processGalleryImages(property.gallery_images_url);
  const { mainImage, finalImages } = buildFinalImagesArray(property.main_image_url, galleryImages);
  // Obtener badges inteligentes de amenidades
  const amenityBadges = getSmartAmenityBadges(property.id, amenitiesMap, {
    ...property,
    category_name: categoriesMap.get(property.category_id)
  }, [], language);
  return {
    id: property.id,
    code: property.code,
    name: processedName,
    description: processedDescription,
    mainImage: mainImage,
    gallery: finalImages,
    salePrice: property.sale_price || 0,
    rentalPrice: property.rental_price || 0,
    tempRentalPrice: property.temp_rental_price || 0,
    furnishedRentalPrice: property.furnished_rental_price || 0,
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    builtArea: property.built_area || 0,
    landArea: property.land_area || 0,
    parkingSpots: property.parking_spots || 0,
    currency: property.sale_currency || property.rental_currency || 'USD',
    featured: false,
    isProject: property.is_project || false,
    sector: sectorsMap.get(property.sector_id) || null,
    city: citiesMap.get(property.city_id) || null,
    category: categoriesMap.get(property.category_id) || null,
    url: `/${url}${trackingString}`,
    countryContext: countryCode,
    // Campos compatibles con PropertyList component
    slug: property.slug_url,
    titulo: processedName,
    precio: formattedPrice,
    imagen: mainImage,
    imagenes: finalImages,
    habitaciones: property.bedrooms || 0,
    banos: property.bathrooms || 0,
    metros: property.built_area || 0,
    metros_terreno: property.land_area || 0,
    parqueos: property.parking_spots || 0,
    nivel: property.nivel || null,
    tipo: categoriesMap.get(property.category_id) || getUIText('PROPERTY', language),
    amenity_badges: amenityBadges,
    isFormattedByProvider: true
  };
}
// ============================================================================
// FUNCIONES DE PROCESAMIENTO DE CONTENIDO MEJORADAS PARA COMPATIBILIDAD
// ============================================================================
function processTestimonial(testimonial, language, trackingString, countryCode) {
  // Usar slug según idioma que ya viene completo desde la base de datos
  let testimonialUrl = null;
  if (testimonial.slug || testimonial.slug_en || testimonial.slug_fr) {
    let slug = testimonial.slug; // Por defecto español
    if (language === 'en' && testimonial.slug_en) {
      slug = testimonial.slug_en;
    } else if (language === 'fr' && testimonial.slug_fr) {
      slug = testimonial.slug_fr;
    }
    testimonialUrl = `/${slug}${trackingString}`;
  }
  return {
    id: testimonial.id,
    title: testimonial.title || '',
    excerpt: testimonial.excerpt || '',
    rating: testimonial.rating || 5,
    client_name: testimonial.client_name || `Cliente ${countryCode}`,
    client_avatar: testimonial.client_avatar || '/images/default-avatar.jpg',
    client_location: testimonial.client_location || '',
    client_verified: testimonial.client_verified || false,
    client_profession: testimonial.client_profession || '',
    transaction_location: testimonial.transaction_location || '',
    category: testimonial.category || 'general',
    published_at: testimonial.published_at || new Date().toISOString(),
    views: testimonial.views || 0,
    read_time: `${testimonial.read_time || 3} ${getUIText('MINUTES_READ', language)}`,
    url: testimonialUrl,
    slug: testimonial.slug || `testimonio-${testimonial.id}`,
    featured: testimonial.featured || false,
    full_testimonial: testimonial.full_testimonial || testimonial.excerpt || '',
    subtitle: testimonial.subtitle || null,
    // Mantener también author para compatibilidad con diferentes componentes
    author: testimonial.users ? {
      name: `${testimonial.users.first_name || ''} ${testimonial.users.last_name || ''}`.trim(),
      avatar: testimonial.users.profile_photo_url || '/images/team/default-advisor.jpg',
      slug: testimonial.users.slug,
      position: testimonial.users.position || null,
      country: countryCode
    } : {
      name: testimonial.client_name || `Cliente ${countryCode}`,
      avatar: testimonial.client_avatar || '/images/default-avatar.jpg',
      slug: null,
      position: testimonial.client_profession || null,
      country: countryCode
    },
    countryContext: countryCode,
    content_type: 'testimonial'
  };
}
function processArticle(article, language, trackingString, countryCode) {
  const slug = getSlugByLanguage(article, language);
  let url = slug;
  if (language !== 'es') url = `${language}/${url}`;
  // ✅ Obtener categoría correcta desde content_categories
  const categoryName = getCategoryDisplayName(article.content_categories, language);
  // ✅ COMPATIBILIDAD MEJORADA CON RelatedArticles.astro
  return {
    id: article.id,
    title: article.title || '',
    excerpt: article.excerpt || '',
    featuredImage: article.featured_image || null,
    featured: article.featured || false,
    publishedAt: article.published_at,
    views: article.views || 0,
    readTime: `${article.read_time || 5} ${getUIText('MINUTES_READ', language)}`,
    category: categoryName,
    slug: slug,
    url: `/${url}${trackingString}`,
    // ✅ Campos adicionales para compatibilidad con RelatedArticles.astro
    total_weight: 0,
    content_priority: 'default',
    sort_order: 0,
    author: article.users ? {
      name: `${article.users.first_name || ''} ${article.users.last_name || ''}`.trim(),
      avatar: article.users.profile_photo_url || '/images/team/default-avatar.jpg',
      slug: article.users.slug
    } : {
      name: 'CLIC Team',
      avatar: '/images/team/default-avatar.jpg',
      slug: null
    },
    countryContext: countryCode
  };
}
function processVideo(video, language, trackingString, countryCode) {
  const rawSlug = getSlugByLanguage(video, language, 'video_slug');

  // Limpiar el slug si ya viene con prefijo 'videos/'
  const slug = rawSlug?.replace(/^videos\//, '') || rawSlug;

  let url = `videos/${slug}`;
  if (language !== 'es') url = `${language}/videos/${slug}`;
  // ✅ Obtener categoría correcta desde content_categories
  const categoryName = getCategoryDisplayName(video.content_categories, language);
  // ✅ COMPATIBILIDAD MEJORADA CON VideoGallery.astro
  return {
    id: video.id,
    title: video.title || '',
    description: video.description || '',
    thumbnail: video.thumbnail || null,
    duration: video.duration || '10:00',
    views: video.views || 0,
    category: categoryName,
    featured: video.featured || false,
    // ✅ Campos específicos para VideoGallery.astro
    videoId: video.video_id || video.id,
    videoSlug: slug,
    url: `/${url}${trackingString}`,
    // ✅ Campos adicionales para compatibilidad con VideoGallery.astro
    total_weight: 0,
    content_priority: 'default',
    sort_order: 0,
    author: video.users ? {
      name: `${video.users.first_name || ''} ${video.users.last_name || ''}`.trim(),
      avatar: video.users.profile_photo_url || '/images/team/default-avatar.jpg',
      slug: video.users.slug
    } : {
      name: 'CLIC Team',
      avatar: '/images/team/default-avatar.jpg',
      slug: null
    },
    countryContext: countryCode
  };
}
function processAdvisor(advisor, language, trackingString, countryCode) {
  const fullName = `${advisor.first_name || ''} ${advisor.last_name || ''}`.trim();
  // Procesar contenido multiidioma
  let processedPosition = advisor.position || '';
  let processedBiography = advisor.biography || '';
  let processedLanguages = advisor.languages || [
    'Spanish'
  ];
  let processedSlug = advisor.slug || '';
  let specialtyDescription = '';
  // Obtener contenido traducido si existe
  const multilingualContent = processMultilingualContent(advisor, language);
  if (multilingualContent.position) processedPosition = multilingualContent.position;
  if (multilingualContent.description) processedBiography = multilingualContent.description;
  if (multilingualContent.languages) processedLanguages = multilingualContent.languages;
  if (multilingualContent.slug) processedSlug = multilingualContent.slug;
  if (multilingualContent.specialty_description) specialtyDescription = multilingualContent.specialty_description;
  // Limpiar y construir slug/URL correctamente
  let finalSlug = processedSlug;
  // Si el slug ya incluye el prefijo de idioma/ruta, limpiar
  if (finalSlug.includes('/')) {
    const slugParts = finalSlug.split('/');
    finalSlug = slugParts[slugParts.length - 1]; // Tomar solo la última parte
  }
  // Construir ruta base según idioma
  const basePath = language === 'es' ? 'asesores' : language === 'en' ? 'advisors' : 'conseillers';
  // Construir URL final
  let finalUrl = `${basePath}/${finalSlug}`;
  if (language !== 'es') {
    finalUrl = `${language}/${finalUrl}`;
  }
  return {
    id: advisor.id,
    name: fullName || `Asesor ${countryCode}`,
    avatar: advisor.profile_photo_url || '/images/team/default-advisor.jpg',
    position: processedPosition || getUIText('REAL_ESTATE_ADVISOR', language),
    bio: processedBiography,
    biography: processedBiography,
    description: processedBiography,
    slug: finalSlug,
    phone: advisor.phone || '',
    whatsapp: advisor.phone || '',
    yearsExperience: advisor.years_experience || 0,
    totalSales: advisor.sales_count || 0,
    clientSatisfaction: 5.0,
    specialties: specialtyDescription ? [
      specialtyDescription
    ] : [],
    specialty_description: specialtyDescription,
    languagesSpoken: processedLanguages,
    languages: processedLanguages,
    url: `/${finalUrl}${trackingString}`,
    countryContext: countryCode,
    // Datos adicionales para compatibilidad con diferentes componentes
    content_type: 'advisor',
    multilingual: {
      hasTranslation: !!(multilingualContent.position || multilingualContent.description),
      language: language
    }
  };
}
function processFaq(faq, language) {
  let processedQuestion = faq.question || '';
  let processedAnswer = faq.answer || '';
  const faqContent = processMultilingualContent(faq, language);
  if (faqContent.question) processedQuestion = faqContent.question;
  if (faqContent.answer) processedAnswer = faqContent.answer;
  return {
    id: faq.id,
    question: processedQuestion,
    answer: processedAnswer
  };
}
// ============================================================================
// CONSTRUCCIÓN DE SECCIONES DINÁMICAS CON CONTENIDO REAL Y URLS CORREGIDAS
// ============================================================================
function buildDynamicSections(params) {
  const { heroConfig, processedFeatured, processedRecent, processedTestimonials, processedAdvisors, processedArticles, processedVideos, processedFaqs, countryCode, language, trackingString, isDefaultCountry, globalConfig } = params;
  // ✅ Obtener texto SEO-optimizado para botones de propiedades
  const viewMorePropertiesText = getViewMorePropertiesText(language);
  const sections = [
    // Hero siempre presente
    {
      id: 'hero',
      type: 'hero',
      ...heroConfig,
      searchFilters: {},
      countrySpecific: {
        code: countryCode,
        isDefault: isDefaultCountry,
        showReneBranding: isDefaultCountry,
        founderName: isDefaultCountry ? 'René Castillo' : globalConfig?.social?.founder?.name
      }
    }
  ];
  // Propiedades destacadas - Solo si hay contenido real
  if (processedFeatured.length > 0) {
    sections.push({
      id: 'featured-properties',
      type: 'property-carousel',
      title: getCountryLocalizedText('FEATURED_PROPERTIES', language, countryCode),
      properties: processedFeatured,
      viewAllUrl: buildBuyUrl(language, trackingString),
      viewAllText: viewMorePropertiesText,
      countryContext: {
        code: countryCode,
        totalProperties: processedFeatured.length,
        isDynamic: true,
        sourceTag: 'home-page'
      }
    });
  }
  // Propiedades recientes - Solo si hay contenido adicional
  if (processedRecent.length > 0) {
    sections.push({
      id: 'recent-properties',
      type: 'property-grid',
      title: getCountryLocalizedText('RECENT_PROPERTIES', language, countryCode),
      properties: processedRecent,
      viewAllUrl: buildBuyUrl(language, trackingString),
      viewAllText: viewMorePropertiesText,
      countryContext: {
        code: countryCode,
        totalProperties: processedRecent.length,
        isDynamic: true
      }
    });
  }
  // Testimonios - Solo si hay contenido real
  if (processedTestimonials.length > 0) {
    sections.push({
      id: 'testimonials',
      type: 'testimonials',
      title: getCountryLocalizedText('CLIENT_TESTIMONIALS', language, countryCode),
      testimonials: processedTestimonials,
      viewAllUrl: buildTestimonialsUrl(language, trackingString),
      countryContext: {
        code: countryCode,
        averageRating: processedTestimonials.reduce((sum, t)=>sum + t.rating, 0) / processedTestimonials.length,
        isDynamic: true
      }
    });
  }
  // Equipo - Solo si hay contenido real
  if (processedAdvisors.length > 0) {
    sections.push({
      id: 'advisors',
      type: 'advisors',
      title: getCountryLocalizedText('EXPERT_TEAM', language, countryCode),
      advisors: processedAdvisors,
      viewAllUrl: buildLocalizedUrl('asesores', language, trackingString),
      countrySpecific: {
        showReneStory: isDefaultCountry,
        teamSize: processedAdvisors.length,
        countryCode,
        isDynamic: true
      }
    });
  }
  // Artículos y videos - Solo si hay contenido real
  if (processedArticles.length > 0 || processedVideos.length > 0) {
    if (isDefaultCountry && (processedArticles.length > 0 || processedVideos.length > 0)) {
      // Historia de René solo para DOM
      sections.push({
        id: 'rene-story',
        type: 'founder-story',
        title: language === 'en' ? 'René Castillo: The Content Real Estate Revolution' : language === 'fr' ? 'René Castillo: La Révolution Immobilière du Contenu' : 'René Castillo: La Revolución Inmobiliaria del Contenido',
        founder: {
          name: 'René Castillo',
          experience: '18+ años en medios, 6 años en inmobiliaria',
          followers: globalConfig?.seo?.founder_followers || '600K+',
          achievements: [
            language === 'en' ? 'TV Host & Producer' : 'Presentador y Productor de TV',
            language === 'en' ? '600K+ Social Media Followers' : '600K+ Seguidores en Redes',
            language === 'en' ? 'Real Estate Content Pioneer' : 'Pionero del Contenido Inmobiliario'
          ]
        },
        recentContent: {
          articles: processedArticles.slice(0, 8),
          videos: processedVideos.slice(0, 8) // ✅ Aumentado a 8
        },
        isDynamic: true
      });
    } else {
      // Contenido para otros países
      sections.push({
        id: 'recent-content',
        type: 'content-mix',
        title: getCountryLocalizedText('LATEST_INSIGHTS', language, countryCode),
        articles: processedArticles.slice(0, 8),
        videos: processedVideos.slice(0, 8),
        countryContext: {
          code: countryCode,
          localTeam: processedAdvisors.length > 0,
          isDynamic: true
        }
      });
    }
  }
  // FAQs - Solo si hay contenido real
  if (processedFaqs.length > 0) {
    sections.push({
      id: 'faqs',
      type: 'faq',
      title: getCountryLocalizedText('FREQUENTLY_ASKED', language, countryCode),
      faqs: processedFaqs,
      countryContext: {
        code: countryCode,
        isDynamic: true
      }
    });
  }
  return sections;
}
function buildDynamicQuickStats({ processedFeatured, processedRecent, processedAdvisors, processedTestimonials, processedArticles, processedVideos }) {
  const averageRating = processedTestimonials.length > 0 ? Math.round(processedTestimonials.reduce((sum, t)=>sum + t.rating, 0) / processedTestimonials.length * 10) / 10 : 0;
  return {
    totalProperties: processedFeatured.length + processedRecent.length,
    totalProjects: processedFeatured.filter((p)=>p.isProject).length + processedRecent.filter((p)=>p.isProject).length,
    totalAdvisors: processedAdvisors.length,
    averageRating,
    totalArticles: processedArticles.length,
    totalVideos: processedVideos.length,
    totalTestimonials: processedTestimonials.length,
    citiesCovered: 0,
    sectorsCovered: 0,
    isDynamic: true,
    sourceTag: 'home-page'
  };
}
// ============================================================================
// FUNCIONES AUXILIARES MEJORADAS
// ============================================================================
// ✅ NUEVA FUNCIÓN: Construir URLs de compra según idioma
function buildBuyUrl(language, trackingString) {
  const buyPaths = {
    es: 'comprar',
    en: 'buy',
    fr: 'acheter'
  };
  const basePath = buyPaths[language] || 'comprar';
  let url = basePath;
  if (language !== 'es') {
    url = `${language}/${basePath}`;
  }
  return `/${url}${trackingString}`;
}
// ✅ NUEVA FUNCIÓN: Construir URL de testimonios según idioma
function buildTestimonialsUrl(language, trackingString) {
  const testimonialsPaths = {
    es: 'testimonios',
    en: 'testimonials',
    fr: 'temoignages'
  };
  const basePath = testimonialsPaths[language] || 'testimonios';
  let url = basePath;
  if (language !== 'es') {
    url = `${language}/${basePath}`;
  }
  return `/${url}${trackingString}`;
}
// ✅ NUEVA FUNCIÓN: Obtener texto SEO-optimizado para "Ver más propiedades"
function getViewMorePropertiesText(language) {
  const texts = {
    es: 'Ver más propiedades a la venta',
    en: 'View more properties for sale',
    fr: 'Voir plus de propriétés à vendre'
  };
  return texts[language] || texts.es;
}
// Función para obtener campo multiidioma
function getMultilingualField(item, fieldName, language) {
  if (language === 'en' && item[`${fieldName}_en`]) {
    try {
      const content = typeof item[`${fieldName}_en`] === 'string' ? JSON.parse(item[`${fieldName}_en`]) : item[`${fieldName}_en`];
      return content[fieldName] || content.name || content.title;
    } catch (e) {
      return null;
    }
  }
  if (language === 'fr' && item[`${fieldName}_fr`]) {
    try {
      const content = typeof item[`${fieldName}_fr`] === 'string' ? JSON.parse(item[`${fieldName}_fr`]) : item[`${fieldName}_fr`];
      return content[fieldName] || content.name || content.title;
    } catch (e) {
      return null;
    }
  }
  return null;
}
function getSlugByLanguage(item, language, defaultField = 'slug') {
  if (language === 'en' && item.slug_en) return item.slug_en;
  if (language === 'fr' && item.slug_fr) return item.slug_fr;
  return item[defaultField] || item.slug;
}
function processGalleryImages(galleryImagesUrl) {
  if (!galleryImagesUrl) return [];
  if (Array.isArray(galleryImagesUrl)) return galleryImagesUrl;
  if (typeof galleryImagesUrl === 'string') {
    try {
      return JSON.parse(galleryImagesUrl);
    } catch (e) {
      return galleryImagesUrl.split(',').map((img)=>img.trim()).filter(Boolean);
    }
  }
  return [];
}
function buildFinalImagesArray(mainImageUrl, galleryImages) {
  const fallbackImage = 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Sin+Imagen';
  const mainImage = mainImageUrl?.trim() || fallbackImage;
  const safeGalleryImages = Array.isArray(galleryImages) ? galleryImages : [];
  const finalImages = [
    mainImage,
    ...safeGalleryImages.filter((img)=>img !== mainImage)
  ];
  return {
    mainImage,
    finalImages
  };
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
function getSmartAmenityBadges(propertyId, propertyAmenitiesMap, prop, userTags, language) {
  const badges = [];
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
    'vigilancia'
  ];
  // Buscar amenidades prioritarias
  for (const amenity of propertyAmenities){
    if (badges.length >= 2) break;
    const amenityName = getAmenityName(amenity, language).toLowerCase();
    const isHighPriority = priorityAmenities.some((priority)=>amenityName.includes(priority.toLowerCase()));
    if (isHighPriority) {
      badges.push({
        text: getAmenityName(amenity, language),
        icon: amenity.icon,
        category: amenity.category
      });
    }
  }
  return badges.slice(0, 2);
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
// Función para formatear precios (necesaria para formatPropertyPrice)
function formatPrice(price, currency, operation, language) {
  if (!price) return getUIText('PRICE_ON_CONSULTATION', language);
  const formatter = new Intl.NumberFormat(language === 'en' ? 'en-US' : 'es-DO', {
    style: 'currency',
    currency: currency || 'USD',
    maximumFractionDigits: 0
  });
  let formattedPrice = formatter.format(price);
  if (operation === 'rental' || operation === 'temp_rental' || operation === 'furnished_rental') {
    formattedPrice += language === 'en' ? '/month' : '/mes';
  }
  return formattedPrice;
}
// ============================================================================
// FUNCIONES EXISTENTES MANTENIDAS
// ============================================================================
function buildCountrySpecificHero(globalConfig, countryCode, language) {
  const isDefault = countryCode === 'DOM';
  // Usar configuración específica del país desde el config
  if (globalConfig?.hero && !isDefault) {
    const heroConfig = globalConfig.hero;
    return {
      title: heroConfig.title?.[language] || heroConfig.title?.es || getDefaultTitle(language, countryCode),
      subtitle: heroConfig.subtitle?.[language] || heroConfig.subtitle?.es || getDefaultSubtitle(language, countryCode),
      backgroundImage: heroConfig.background_image || '/images/hero/default.jpg',
      overlayOpacity: heroConfig.overlay_opacity || 0.4,
      countrySpecific: true,
      showFounderBranding: false,
      companyName: globalConfig?.legal?.company_name || `CLIC Real Estate ${countryCode}`,
      tagline: getCountryTagline(language, countryCode)
    };
  }
  // Configuración por defecto para República Dominicana
  if (isDefault) {
    return {
      title: language === 'en' ? 'Find Your Dream Property in Dominican Republic' : language === 'fr' ? 'Trouvez Votre Propriété de Rêve en République Dominicaine' : 'Encuentra Tu Propiedad Soñada en República Dominicana',
      subtitle: language === 'en' ? 'Discover luxury homes, investment opportunities, and vacation rentals in paradise with René Castillo' : language === 'fr' ? 'Découvrez maisons de luxe, opportunités d\'investissement et locations vacances au paradis avec René Castillo' : 'Descubre casas de lujo, oportunidades de inversión y rentas vacacionales en el paraíso con René Castillo',
      backgroundImage: globalConfig?.hero?.background_image || 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1920&h=1080&fit=crop&auto=format&q=80',
      overlayOpacity: 0.5,
      countrySpecific: true,
      showFounderBranding: true,
      companyName: 'CLIC Inmobiliaria',
      tagline: language === 'en' ? 'The Content Real Estate Company' : language === 'fr' ? 'L\'Immobilier du Contenu' : 'La Inmobiliaria del Contenido'
    };
  }
  // Fallback genérico
  return {
    title: getDefaultTitle(language, countryCode),
    subtitle: getDefaultSubtitle(language, countryCode),
    backgroundImage: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1920&h=1080&fit=crop&auto=format&q=80',
    overlayOpacity: 0.4,
    countrySpecific: false,
    showFounderBranding: false,
    companyName: `CLIC Real Estate`,
    tagline: getCountryTagline(language, countryCode)
  };
}
function getDefaultTitle(language, countryCode) {
  const countryNames = {
    'DOM': {
      es: 'República Dominicana',
      en: 'Dominican Republic',
      fr: 'République Dominicaine'
    },
    'PAN': {
      es: 'Panamá',
      en: 'Panama',
      fr: 'Panama'
    },
    'MEX': {
      es: 'México',
      en: 'Mexico',
      fr: 'Mexique'
    }
  };
  const countryName = countryNames[countryCode]?.[language] || countryNames[countryCode]?.es || countryCode;
  switch(language){
    case 'en':
      return `Find Your Perfect Property in ${countryName}`;
    case 'fr':
      return `Trouvez Votre Propriété Parfaite en ${countryName}`;
    default:
      return `Encuentra Tu Propiedad Perfecta en ${countryName}`;
  }
}
function getDefaultSubtitle(language, countryCode) {
  switch(language){
    case 'en':
      return 'Discover luxury properties and investment opportunities with expert guidance';
    case 'fr':
      return 'Découvrez propriétés de luxe et opportunités d\'investissement avec guidance experte';
    default:
      return 'Descubre propiedades de lujo y oportunidades de inversión con orientación experta';
  }
}
function getCountryTagline(language, countryCode) {
  if (countryCode === 'DOM') {
    return language === 'en' ? 'The Content Real Estate Company' : language === 'fr' ? 'L\'Immobilier du Contenu' : 'La Inmobiliaria del Contenido';
  }
  return language === 'en' ? 'Your Trusted Real Estate Partner' : language === 'fr' ? 'Votre Partenaire Immobilier de Confiance' : 'Tu Socio Inmobiliario de Confianza';
}
function getCountryLocalizedText(key, language, countryCode) {
  const countryNames = {
    'DOM': {
      es: 'República Dominicana',
      en: 'Dominican Republic',
      fr: 'République Dominicaine'
    },
    'PAN': {
      es: 'Panamá',
      en: 'Panama',
      fr: 'Panama'
    },
    'MEX': {
      es: 'México',
      en: 'Mexico',
      fr: 'Mexique'
    }
  };
  const countryName = countryNames[countryCode]?.[language] || countryNames[countryCode]?.es || countryCode;
  const texts = {
    'FEATURED_PROPERTIES': {
      es: `Propiedades Destacadas en ${countryName}`,
      en: `Featured Properties in ${countryName}`,
      fr: `Propriétés Vedettes en ${countryName}`
    },
    'RECENT_PROPERTIES': {
      es: `Propiedades Recientes en ${countryName}`,
      en: `Recent Properties in ${countryName}`,
      fr: `Propriétés Récentes en ${countryName}`
    },
    'CLIENT_TESTIMONIALS': {
      es: `Testimonios de Clientes en ${countryName}`,
      en: `Client Testimonials in ${countryName}`,
      fr: `Témoignages Clients en ${countryName}`
    },
    'EXPERT_TEAM': {
      es: `Nuestro Equipo Experto en ${countryName}`,
      en: `Our Expert Team in ${countryName}`,
      fr: `Notre Équipe d'Experts en ${countryName}`
    },
    'LATEST_INSIGHTS': {
      es: `Últimas Novedades de ${countryName}`,
      en: `Latest Insights from ${countryName}`,
      fr: `Dernières Insights de ${countryName}`
    },
    'FREQUENTLY_ASKED': {
      es: `Preguntas Frecuentes - ${countryName}`,
      en: `Frequently Asked Questions - ${countryName}`,
      fr: `Questions Fréquemment Posées - ${countryName}`
    }
  };
  return texts[key]?.[language] || texts[key]?.es || key;
}
function buildLocalizedUrl(basePath, language, trackingString) {
  const pathMap = {
    'propiedades': {
      en: 'properties',
      fr: 'proprietes'
    },
    'testimonios': {
      en: 'testimonials',
      fr: 'temoignages'
    },
    'asesores': {
      en: 'advisors',
      fr: 'conseillers'
    }
  };
  let url = pathMap[basePath]?.[language] || basePath;
  if (language !== 'es') url = `${language}/${url}`;
  return `/${url}${trackingString}`;
}
function buildCountrySEO({ countryCode, language, globalConfig, isDefaultCountry, propertiesCount }) {
  const countryNames = {
    'DOM': {
      es: 'República Dominicana',
      en: 'Dominican Republic',
      fr: 'République Dominicaine'
    },
    'PAN': {
      es: 'Panamá',
      en: 'Panama',
      fr: 'Panama'
    },
    'MEX': {
      es: 'México',
      en: 'Mexico',
      fr: 'Mexique'
    }
  };
  const countryName = countryNames[countryCode]?.[language] || countryNames[countryCode]?.es || countryCode;
  const companyName = globalConfig?.legal?.company_name || `CLIC Real Estate ${countryCode}`;
  if (isDefaultCountry) {
    return {
      title: language === 'en' ? `${countryName} Real Estate | Luxury Properties & Investment | René Castillo - CLIC Inmobiliaria` : language === 'fr' ? `Immobilier ${countryName} | Propriétés Luxe & Investissement | René Castillo - CLIC Inmobiliaria` : `Bienes Raíces ${countryName} | Propiedades de Lujo e Inversión | René Castillo - CLIC Inmobiliaria`,
      description: language === 'en' ? `René Castillo, renowned TV host with 600K+ followers, leads CLIC Real Estate in ${countryName}. Find luxury properties, investment opportunities, and vacation rentals in paradise.` : language === 'fr' ? `René Castillo, présentateur TV reconnu avec 600K+ followers, dirige CLIC Immobilier en ${countryName}. Trouvez propriétés de luxe, opportunités d'investissement et locations vacances au paradis.` : `René Castillo, reconocido presentador de TV con 600K+ seguidores, lidera CLIC Inmobiliaria en ${countryName}. Encuentra propiedades de lujo, oportunidades de inversión y rentas vacacionales en el paraíso.`,
      canonical_url: language === 'es' ? '/' : `/${language}/`
    };
  }
  const founderName = globalConfig?.social?.founder?.name || 'Equipo CLIC';
  return {
    title: language === 'en' ? `${countryName} Real Estate | Premium Properties & Investment | ${companyName}` : language === 'fr' ? `Immobilier ${countryName} | Propriétés Premium & Investissement | ${companyName}` : `Bienes Raíces ${countryName} | Propiedades Premium e Inversión | ${companyName}`,
    description: language === 'en' ? `Find premium real estate in ${countryName} with ${companyName}. Expert guidance from ${founderName} and local team. ${propertiesCount}+ luxury properties available.` : language === 'fr' ? `Trouvez immobilier premium en ${countryName} avec ${companyName}. Guidance experte de ${founderName} et équipe locale. ${propertiesCount}+ propriétés de luxe disponibles.` : `Encuentra bienes raíces premium en ${countryName} con ${companyName}. Orientación experta de ${founderName} y equipo local. ${propertiesCount}+ propiedades de lujo disponibles.`,
    canonical_url: language === 'es' ? '/' : `/${language}/`
  };
}
function buildFallbackSEO(countryCode, language) {
  const countryNames = {
    'DOM': {
      es: 'República Dominicana',
      en: 'Dominican Republic',
      fr: 'République Dominicaine'
    },
    'PAN': {
      es: 'Panamá',
      en: 'Panama',
      fr: 'Panama'
    },
    'MEX': {
      es: 'México',
      en: 'Mexico',
      fr: 'Mexique'
    }
  };
  const countryName = countryNames[countryCode]?.[language] || countryNames[countryCode]?.es || 'Real Estate Market';
  return {
    title: `CLIC Real Estate - ${countryName}`,
    description: language === 'en' ? `Premium real estate services in ${countryName}. Find your perfect property with CLIC Real Estate.` : language === 'fr' ? `Services immobiliers premium en ${countryName}. Trouvez votre propriété parfaite avec CLIC Real Estate.` : `Servicios inmobiliarios premium en ${countryName}. Encuentra tu propiedad perfecta con CLIC Real Estate.`,
    canonical_url: language === 'es' ? '/' : `/${language}/`
  };
}
async function getBasicSearchFilters(supabase, language, countryTagId) {
  const operations = [
    {
      value: 'sale',
      label: language === 'en' ? 'Buy' : language === 'fr' ? 'Acheter' : 'Comprar'
    },
    {
      value: 'rental',
      label: language === 'en' ? 'Rent' : language === 'fr' ? 'Louer' : 'Alquilar'
    },
    {
      value: 'temp_rental',
      label: language === 'en' ? 'Vacation Rental' : language === 'fr' ? 'Location Vacances' : 'Renta Vacacional'
    }
  ];
  const priceRanges = [
    {
      min: 0,
      max: 100000,
      label: language === 'en' ? 'Under $100K' : 'Menos de $100K'
    },
    {
      min: 100000,
      max: 250000,
      label: '$100K - $250K'
    },
    {
      min: 250000,
      max: 500000,
      label: '$250K - $500K'
    },
    {
      min: 500000,
      max: 1000000,
      label: '$500K - $1M'
    },
    {
      min: 1000000,
      max: null,
      label: language === 'en' ? 'Over $1M' : 'Más de $1M'
    }
  ];
  const bedrooms = [
    {
      value: '1',
      label: '1+'
    },
    {
      value: '2',
      label: '2+'
    },
    {
      value: '3',
      label: '3+'
    },
    {
      value: '4',
      label: '4+'
    },
    {
      value: '5',
      label: '5+'
    }
  ];
  return {
    operations,
    propertyTypes: [],
    cities: [],
    priceRanges,
    bedrooms
  };
}
