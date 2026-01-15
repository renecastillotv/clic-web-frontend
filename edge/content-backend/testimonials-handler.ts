// testimonials-handler.ts
import { getUIText } from './ui-texts.ts';
// ============================================================================
// TESTIMONIALS HANDLER - TESTIMONIOS DE CLIENTES
// ============================================================================
async function handleTestimonialsMain(params) {
  const { supabase, language, trackingString } = params;
  console.log('⭐ Handling testimonials main page');
  // Obtener testimonios destacados
  const { data: featuredTestimonials } = await supabase.from('testimonials').select(`
      id, title, excerpt, full_testimonial, rating, client_name, client_avatar,
      client_location, client_verified, client_profession, transaction_location,
      category, featured, published_at, views, read_time, subtitle,
      content_en, content_fr, slug, slug_en, slug_fr, agent_id,
      users:users!testimonials_agent_id_fkey(first_name, last_name, profile_photo_url, slug, position)
    `).eq('status', 'published').eq('featured', true).order('published_at', {
    ascending: false
  }).limit(6);
  // Obtener testimonios recientes
  const { data: recentTestimonials } = await supabase.from('testimonials').select(`
      id, title, excerpt, full_testimonial, rating, client_name, client_avatar,
      client_location, client_verified, client_profession, transaction_location,
      category, featured, published_at, views, read_time, subtitle,
      content_en, content_fr, slug, slug_en, slug_fr, agent_id,
      users:users!testimonials_agent_id_fkey(first_name, last_name, profile_photo_url, slug, position)
    `).eq('status', 'published').order('published_at', {
    ascending: false
  }).limit(12);
  // Obtener categorías de testimonios
  const categories = [
    ...new Set((recentTestimonials || []).map((t)=>t.category).filter(Boolean))
  ];
  const processedCategories = categories.map((category)=>({
      name: formatCategoryName(category, language),
      slug: category.toLowerCase().replace(/\s+/g, '-'),
      url: buildTestimonialCategoryUrl(category, language, trackingString),
      count: (recentTestimonials || []).filter((t)=>t.category === category).length
    }));
  // Procesar testimonios
  const processedFeatured = (featuredTestimonials || []).map((testimonial)=>processTestimonial(testimonial, language, trackingString));
  const processedRecent = (recentTestimonials || []).map((testimonial)=>processTestimonial(testimonial, language, trackingString));
  // Estadísticas
  const averageRating = calculateAverageRating(recentTestimonials || []);
  const totalViews = (recentTestimonials || []).reduce((sum, t)=>sum + (t.views || 0), 0);
  const seo = {
    title: language === 'en' ? 'Client Testimonials & Success Stories | CLIC Inmobiliaria' : language === 'fr' ? 'Témoignages Clients & Histoires de Réussite | CLIC Inmobiliaria' : 'Testimonios de Clientes e Historias de Éxito | CLIC Inmobiliaria',
    description: language === 'en' ? 'Read authentic testimonials from our satisfied clients. Real experiences from property buyers, sellers, and investors in Dominican Republic with CLIC Inmobiliaria.' : language === 'fr' ? 'Lisez les témoignages authentiques de nos clients satisfaits. Expériences réelles d\'acheteurs, vendeurs et investisseurs immobiliers en République Dominicaine avec CLIC Inmobiliaria.' : 'Lee testimonios auténticos de nuestros clientes satisfechos. Experiencias reales de compradores, vendedores e inversionistas inmobiliarios en República Dominicana con CLIC Inmobiliaria.',
    h1: language === 'en' ? 'Client Testimonials & Success Stories' : language === 'fr' ? 'Témoignages Clients & Histoires de Réussite' : 'Testimonios de Clientes e Historias de Éxito',
    h2: language === 'en' ? `${averageRating}/5 average rating from satisfied clients` : language === 'fr' ? `${averageRating}/5 note moyenne de clients satisfaits` : `${averageRating}/5 calificación promedio de clientes satisfechos`,
    canonical_url: language === 'es' ? '/testimonios' : `/${language}/testimonials`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: getUIText('TESTIMONIALS', language),
        url: language === 'es' ? '/testimonios' : `/${language}/testimonials`
      }
    ]
  };
  return {
    type: 'testimonials-main',
    pageType: 'testimonials-main',
    seo,
    featuredTestimonials: processedFeatured,
    recentTestimonials: processedRecent,
    categories: processedCategories,
    stats: {
      totalTestimonials: (recentTestimonials || []).length,
      averageRating,
      totalCategories: processedCategories.length,
      totalViews,
      verifiedClients: (recentTestimonials || []).filter((t)=>t.client_verified).length
    }
  };
}
async function handleTestimonialsCategory(params) {
  const { supabase, language, contentSegments, trackingString, queryParams } = params;
  if (contentSegments.length === 0) {
    throw new Error('Category slug required');
  }
  const categorySlug = contentSegments[0];
  console.log('📂 Handling testimonials category:', categorySlug);

  // Primero, obtener TODAS las categorías únicas para hacer un match case-insensitive
  const { data: allTestimonials } = await supabase
    .from('testimonials')
    .select('category')
    .eq('status', 'published')
    .not('category', 'is', null);

  const uniqueCategories = [...new Set((allTestimonials || []).map(t => t.category).filter(Boolean))];
  console.log('Available categories in DB:', uniqueCategories);

  // Buscar la categoría que coincida (case-insensitive)
  const categoryName = uniqueCategories.find(cat =>
    cat.toLowerCase().replace(/\s+/g, '-') === categorySlug.toLowerCase()
  );

  if (!categoryName) {
    console.warn(`Category not found for slug: ${categorySlug}. Available: ${uniqueCategories.join(', ')}`);
    // Intentar con formato Title Case como fallback
    const fallbackCategoryName = categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (l)=>l.toUpperCase());
    console.log('Trying fallback category name:', fallbackCategoryName);
  }

  const actualCategoryName = categoryName || categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (l)=>l.toUpperCase());
  console.log('Using category name for query:', actualCategoryName);

  // Obtener testimonios de esta categoría
  const page = parseInt(queryParams.get('page') || '1');
  const limit = 12;
  const offset = (page - 1) * limit;
  const { data: testimonials, count } = await supabase.from('testimonials').select(`
      id, title, excerpt, full_testimonial, rating, client_name, client_avatar,
      client_location, client_verified, client_profession, transaction_location,
      category, featured, published_at, views, read_time, subtitle,
      content_en, content_fr, slug, slug_en, slug_fr, agent_id,
      users:users!testimonials_agent_id_fkey(first_name, last_name, profile_photo_url, slug, position)
    `, {
    count: 'exact'
  }).eq('category', actualCategoryName).eq('status', 'published').order('published_at', {
    ascending: false
  }).range(offset, offset + limit - 1);

  console.log(`Found ${count || 0} testimonials for category "${actualCategoryName}"`);
  const processedTestimonials = (testimonials || []).map((testimonial)=>processTestimonial(testimonial, language, trackingString));
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
  const averageRating = calculateAverageRating(testimonials || []);

  // Formatear el nombre de la categoría para mostrar
  const displayCategoryName = formatCategoryName(actualCategoryName, language);

  const seo = {
    title: language === 'en' ? `${displayCategoryName} Testimonials | CLIC Inmobiliaria` : language === 'fr' ? `Témoignages ${displayCategoryName} | CLIC Inmobiliaria` : `Testimonios de ${displayCategoryName} | CLIC Inmobiliaria`,
    description: language === 'en' ? `Read authentic ${displayCategoryName.toLowerCase()} testimonials from satisfied CLIC Inmobiliaria clients. Real experiences and success stories.` : language === 'fr' ? `Lisez les témoignages authentiques ${displayCategoryName.toLowerCase()} de clients satisfaits de CLIC Inmobiliaria. Expériences réelles et histoires de réussite.` : `Lee testimonios auténticos de ${displayCategoryName.toLowerCase()} de clientes satisfechos de CLIC Inmobiliaria. Experiencias reales e historias de éxito.`,
    h1: `${getUIText('TESTIMONIALS', language)} - ${displayCategoryName}`,
    h2: language === 'en' ? `${count || 0} client experiences with ${displayCategoryName.toLowerCase()}` : language === 'fr' ? `${count || 0} expériences clients avec ${displayCategoryName.toLowerCase()}` : `${count || 0} experiencias de clientes con ${displayCategoryName.toLowerCase()}`,
    canonical_url: buildTestimonialCategoryUrl(actualCategoryName, language, ''),
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: getUIText('TESTIMONIALS', language),
        url: language === 'es' ? '/testimonios' : `/${language}/testimonials`
      },
      {
        name: displayCategoryName,
        url: buildTestimonialCategoryUrl(actualCategoryName, language, trackingString)
      }
    ]
  };
  return {
    type: 'testimonials-category',
    pageType: 'testimonials-category',
    seo,
    category: {
      name: displayCategoryName,
      slug: categorySlug,
      url: buildTestimonialCategoryUrl(actualCategoryName, language, trackingString)
    },
    testimonials: processedTestimonials,
    pagination,
    stats: {
      totalTestimonials: count || 0,
      averageRating,
      verifiedClients: processedTestimonials.filter((t)=>t.clientVerified).length
    }
  };
}
async function handleSingleTestimonial(params) {
  const { supabase, language, contentSegments, trackingString, baseData } = params;
  const countryTag = baseData?.countryTag;
  if (contentSegments.length < 2) {
    throw new Error('Category and testimonial slug required');
  }
  if (!countryTag?.id) {
    console.warn('Missing country context in baseData - will attempt to continue');
  // No lanzamos error para mantener compatibilidad con código existente
  }
  const categorySlug = contentSegments[0]; // "compradores"
  const testimonialSlug = contentSegments[1]; // "abelarda-castillo"
  console.log('⭐ Handling single testimonial with enhanced relations:', categorySlug, testimonialSlug);
  // Reconstruir el path solicitado (sin prefijo de idioma)
  const requestedPath = `testimonios/${categorySlug}/${testimonialSlug}`;
  console.log('Looking for testimonial with path:', requestedPath);
  // Determinar qué campo usar según idioma
  const slugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
  console.log('Using slug field:', slugField);
  // Buscar el testimonio que coincida con el path solicitado
  let { data: testimonial, error: testimonialError } = await supabase.from('testimonials').select(`
      id, title, excerpt, full_testimonial, rating, client_name, client_avatar,
      client_location, client_verified, client_profession, transaction_location,
      category, featured, published_at, views, read_time, subtitle,
      content_en, content_fr, slug, slug_en, slug_fr, agent_id, created_at, updated_at,
      users:users!testimonials_agent_id_fkey(first_name, last_name, profile_photo_url, slug, position, biography, phone, email)
    `).eq(slugField, requestedPath).eq('status', 'published').single();
  console.log('Testimonial query with JOIN error:', testimonialError);
  // Si la query con JOIN falla, intentar sin JOIN
  if (testimonialError || !testimonial) {
    console.log('JOIN query failed, trying without JOIN...');
    const { data: simpleTestimonial, error: simpleError } = await supabase.from('testimonials').select(`
        id, title, excerpt, full_testimonial, rating, client_name, client_avatar,
        client_location, client_verified, client_profession, transaction_location,
        category, featured, published_at, views, read_time, subtitle,
        content_en, content_fr, slug, slug_en, slug_fr, agent_id, created_at, updated_at
      `).eq(slugField, requestedPath).eq('status', 'published').single();
    if (simpleTestimonial) {
      // Obtener el agente por separado si existe
      let agentData = null;
      if (simpleTestimonial.agent_id) {
        const { data: agent } = await supabase.from('users').select('first_name, last_name, profile_photo_url, slug, position, biography, phone, email').eq('id', simpleTestimonial.agent_id).maybeSingle();
        agentData = agent;
      }
      // Agregar el agente al testimonio
      testimonial = {
        ...simpleTestimonial,
        users: agentData
      };
    } else {
      console.log('Simple query also failed:', simpleError);
    }
  }
  console.log('Final testimonial result:', testimonial ? 'Found' : 'Not found');
  // Si no encuentra el testimonio, devolver una respuesta 404
  if (!testimonial) {
    // Mantener el código existente para caso de 404...
    console.log('Testimonial not found, returning 404 response');
  // Código 404 sin cambios...
  // return { type: 'testimonials-single-404', ... }
  }
  // ======================================================================
  // NUEVA FUNCIÓN AUXILIAR PARA MANEJAR JSON DE FORMA SEGURA
  // ======================================================================
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
  // ======================================================================
  // OBTENER TAGS DEL TESTIMONIO PARA RELACIONAR CONTENIDO
  // ======================================================================
  let testimonialTags = [];
  try {
    // Obtener los tags asociados al testimonio
    const { data: tagAssociations } = await supabase.from('content_tags').select('tag_id').eq('content_id', testimonial.id).eq('content_type', 'testimonial');
    if (tagAssociations && tagAssociations.length > 0) {
      const tagIds = tagAssociations.map((ta)=>ta.tag_id);
      console.log(`Found ${tagIds.length} tags associated with testimonial: ${tagIds.join(', ')}`);
      // Obtener detalles de los tags
      const { data: tagDetails } = await supabase.from('tags').select('id, name, category, display_name, display_name_en, display_name_fr, slug, slug_en, slug_fr').in('id', tagIds);
      if (tagDetails && tagDetails.length > 0) {
        testimonialTags = tagDetails;
        console.log(`Retrieved ${testimonialTags.length} tag details`);
      }
    } else {
      console.log('No tags found for this testimonial');
    }
  } catch (tagError) {
    console.error('Error fetching testimonial tags:', tagError);
  }
  // ======================================================================
  // OBTENER CONTENIDO RELACIONADO POR TAGS
  // ======================================================================
  let relatedProperties = [];
  let relatedVideos = [];
  let relatedArticles = [];
  // Solo buscar contenido relacionado si hay tags o si hay un tag de país
  if (testimonialTags.length > 0 || countryTag?.id) {
    try {
      // Crear array de tagIds
      const tagIds = [
        ...testimonialTags.map((tag)=>tag.id)
      ];
      // Incluir el tag del país si existe
      if (countryTag?.id && !tagIds.includes(countryTag.id)) {
        tagIds.push(countryTag.id);
      }
      console.log(`🔍 Buscando contenido relacionado para ${tagIds.length} tags`);
      // Llamar a la función RPC para obtener todo el contenido relacionado
      const { data: contentResult, error: contentError } = await supabase.rpc('get_all_content_by_tags', {
        tag_ids: tagIds,
        limit_per_type: 50
      });
      if (contentError) {
        console.error('Error obteniendo contenido relacionado:', contentError);
      }
      if (contentResult && contentResult.length > 0) {
        console.log(`Found ${contentResult.length} related content items`);
        // Separar por tipos de contenido
        const propertyResults = contentResult.filter((item)=>item.content_type === 'property').sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags);
        const articleResults = contentResult.filter((item)=>item.content_type === 'article').sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags);
        const videoResults = contentResult.filter((item)=>item.content_type === 'video').sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags);
        console.log(`Found: ${propertyResults.length} properties, ${articleResults.length} articles, ${videoResults.length} videos`);
        // Procesar propiedades relacionadas
        if (propertyResults.length > 0) {
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
                // Intentar extraer contenido multilingüe si existe
                if (language === 'en' && property.content_en) {
                  try {
                    const contentEn = typeof property.content_en === 'string' ? JSON.parse(property.content_en) : property.content_en;
                    if (contentEn.name) processedName = contentEn.name;
                    if (contentEn.description) processedDescription = contentEn.description;
                  } catch (e) {
                    console.warn('Failed to parse EN property content');
                  }
                } else if (language === 'fr' && property.content_fr) {
                  try {
                    const contentFr = typeof property.content_fr === 'string' ? JSON.parse(property.content_fr) : property.content_fr;
                    if (contentFr.name) processedName = contentFr.name;
                    if (contentFr.description) processedDescription = contentFr.description;
                  } catch (e) {
                    console.warn('Failed to parse FR property content');
                  }
                }
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
                  formattedPrice = `${property.sale_currency} ${property.sale_price.toLocaleString()}`;
                } else if (property.rental_price && property.rental_currency) {
                  formattedPrice = `${property.rental_currency} ${property.rental_price.toLocaleString()}/mes`;
                }
                // Procesar imágenes
                const galleryImages = property.gallery_images_url || [];
                const mainImage = property.main_image_url || (Array.isArray(galleryImages) && galleryImages.length > 0 ? galleryImages[0] : '/images/placeholder-property.jpg');
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
                  images: Array.isArray(galleryImages) ? [
                    mainImage,
                    ...galleryImages
                  ] : [
                    mainImage
                  ],
                  bedrooms: property.bedrooms || 0,
                  bathrooms: property.bathrooms || 0,
                  area: property.built_area || property.land_area || 0,
                  location: property.sectors?.name || property.cities?.name || '',
                  category: categoryName,
                  is_project: property.is_project || false,
                  url: `/${propertyUrl}${trackingString || ''}`,
                  slug: propertySlug
                };
              });
              console.log(`Processed ${relatedProperties.length} related properties`);
            }
          }
        }
        // Procesar artículos relacionados
        if (articleResults.length > 0) {
          const articleIds = articleResults.slice(0, 6).map((item)=>item.content_id);
          if (articleIds.length > 0) {
            const { data: articlesData } = await supabase.from('articles').select(`
                id, title, excerpt, slug, slug_en, slug_fr, featured_image, 
                published_at, views, read_time, content_en, content_fr,
                users:author_id(first_name, last_name, profile_photo_url, slug, position)
              `).in('id', articleIds).eq('status', 'published');
            if (articlesData && articlesData.length > 0) {
              relatedArticles = articlesData.map((article)=>{
                // Procesar contenido multilingüe
                let articleTitle = article.title || '';
                let articleExcerpt = article.excerpt || '';
                // Intentar extraer contenido multilingüe si existe
                if (language === 'en' && article.content_en) {
                  try {
                    const contentEn = typeof article.content_en === 'string' ? JSON.parse(article.content_en) : article.content_en;
                    if (contentEn.title) articleTitle = contentEn.title;
                    if (contentEn.excerpt) articleExcerpt = contentEn.excerpt;
                  } catch (e) {
                    console.warn('Failed to parse EN article content');
                  }
                } else if (language === 'fr' && article.content_fr) {
                  try {
                    const contentFr = typeof article.content_fr === 'string' ? JSON.parse(article.content_fr) : article.content_fr;
                    if (contentFr.title) articleTitle = contentFr.title;
                    if (contentFr.excerpt) articleExcerpt = contentFr.excerpt;
                  } catch (e) {
                    console.warn('Failed to parse FR article content');
                  }
                }
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
                  slug: article.users?.slug || null
                };
                return {
                  id: article.id,
                  title: articleTitle,
                  excerpt: articleExcerpt,
                  featuredImage: article.featured_image,
                  publishedAt: article.published_at,
                  views: article.views || 0,
                  readTime: `${article.read_time || 5} ${getUIText('MINUTES_READ', language)}`,
                  readTimeMinutes: article.read_time || 5,
                  url: `/${articleUrl}${trackingString || ''}`,
                  slug: articleSlug,
                  author
                };
              });
              console.log(`Processed ${relatedArticles.length} related articles`);
            }
          }
        }
        // Procesar videos relacionados
        if (videoResults.length > 0) {
          const videoIds = videoResults.slice(0, 6).map((item)=>item.content_id);
          if (videoIds.length > 0) {
            const { data: videosData } = await supabase.from('videos').select(`
                id, title, description, video_slug, slug_en, slug_fr, thumbnail,
                published_at, views, duration, video_id, video_platform, category,
                content_en, content_fr, created_by_id,
                users:created_by_id(first_name, last_name, profile_photo_url, slug, position)
              `).in('id', videoIds).eq('status', 'published');
            if (videosData && videosData.length > 0) {
              relatedVideos = videosData.map((video)=>{
                // Procesar contenido multilingüe
                let videoTitle = video.title || '';
                let videoDescription = video.description || '';
                // Intentar extraer contenido multilingüe si existe
                if (language === 'en' && video.content_en) {
                  try {
                    const contentEn = typeof video.content_en === 'string' ? JSON.parse(video.content_en) : video.content_en;
                    if (contentEn.title) videoTitle = contentEn.title;
                    if (contentEn.description) videoDescription = contentEn.description;
                  } catch (e) {
                    console.warn('Failed to parse EN video content');
                  }
                } else if (language === 'fr' && video.content_fr) {
                  try {
                    const contentFr = typeof video.content_fr === 'string' ? JSON.parse(video.content_fr) : video.content_fr;
                    if (contentFr.title) videoTitle = contentFr.title;
                    if (contentFr.description) videoDescription = contentFr.description;
                  } catch (e) {
                    console.warn('Failed to parse FR video content');
                  }
                }
                // Determinar slug y URL
                let videoSlug = video.video_slug;
                if (language === 'en' && video.slug_en) videoSlug = video.slug_en;
                if (language === 'fr' && video.slug_fr) videoSlug = video.slug_fr;
                let url = videoSlug;
                if (language === 'en') url = `en/${videoSlug}`;
                if (language === 'fr') url = `fr/${videoSlug}`;
                // Información del autor
                const author = {
                  name: video.users ? `${video.users.first_name || ''} ${video.users.last_name || ''}`.trim() : getUIText('TEAM_CLIC', language),
                  avatar: video.users?.profile_photo_url || '/images/team/clic-experts.jpg',
                  position: video.users?.position || '',
                  slug: video.users?.slug || null
                };
                return {
                  id: video.id,
                  title: videoTitle,
                  description: videoDescription,
                  thumbnail: video.thumbnail,
                  videoId: video.video_id,
                  platform: video.video_platform || 'youtube',
                  duration: video.duration || '0:00',
                  views: video.views || 0,
                  category: video.category,
                  publishedAt: video.published_at,
                  url: `/${url}${trackingString || ''}`,
                  slug: videoSlug,
                  author
                };
              });
              console.log(`Processed ${relatedVideos.length} related videos`);
            }
          }
        }
      }
    } catch (e) {
      console.error('Error fetching related content:', e);
    }
  }
  // ======================================================================
  // CONTINUAR CON EL CÓDIGO ORIGINAL
  // ======================================================================
  const processedTestimonial = processTestimonial(testimonial, language, trackingString, true);
  // Obtener testimonios relacionados de la misma categoría (código original)
  const { data: relatedTestimonials } = await supabase.from('testimonials').select(`
      id, title, excerpt, rating, client_name, client_avatar,
      client_location, category, published_at, slug, slug_en, slug_fr,
      users:users!testimonials_agent_id_fkey(first_name, last_name, profile_photo_url, slug)
    `).eq('category', testimonial.category).neq('id', testimonial.id).eq('status', 'published').order('published_at', {
    ascending: false
  }).limit(3);
  const processedRelated = (relatedTestimonials || []).map((testimonial)=>processTestimonial(testimonial, language, trackingString));
  // Actualizar vistas
  await supabase.from('testimonials').update({
    views: (testimonial.views || 0) + 1
  }).eq('id', testimonial.id);
  const seo = {
    title: `${processedTestimonial.title} | CLIC Inmobiliaria`,
    description: processedTestimonial.excerpt,
    h1: processedTestimonial.title,
    h2: `${getUIText('TESTIMONIALS', language)} - ${testimonial.category}`,
    canonical_url: processedTestimonial.url.replace(trackingString, ''),
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: getUIText('TESTIMONIALS', language),
        url: language === 'es' ? '/testimonios' : `/${language}/testimonials`
      },
      {
        name: testimonial.category,
        url: buildTestimonialCategoryUrl(testimonial.category, language, trackingString)
      },
      {
        name: processedTestimonial.title,
        url: processedTestimonial.url
      }
    ]
  };
  // Limitar contenido relacionado
  const limitedRelatedVideos = relatedVideos.slice(0, 6);
  const limitedRelatedProperties = relatedProperties.slice(0, 24);
  const limitedRelatedArticles = relatedArticles.slice(0, 6);

  // Respuesta enriquecida con contenido relacionado
  return {
    type: 'testimonials-single',
    pageType: 'testimonials-single',
    found: true,
    seo,
    testimonial: processedTestimonial,
    relatedTestimonials: processedRelated,
    // Campos individuales para retrocompatibilidad
    relatedVideos: limitedRelatedVideos,
    relatedProperties: limitedRelatedProperties,
    relatedArticles: limitedRelatedArticles,
    category: {
      name: testimonial.category,
      slug: categorySlug
    },
    // Contenido cruzado estructurado (formato similar a articles y videos)
    crossContent: {
      videos: limitedRelatedVideos,
      properties: limitedRelatedProperties,
      articles: limitedRelatedArticles,
      testimonials: processedRelated
    },
    tags: testimonialTags,
    debug: {
      handlerVersion: 'enhanced-content-relations-complete',
      testimonialId: testimonial.id,
      countryTagId: countryTag?.id,
      tagsCount: testimonialTags.length,
      relatedVideosCount: limitedRelatedVideos.length,
      relatedPropertiesCount: limitedRelatedProperties.length,
      relatedArticlesCount: limitedRelatedArticles.length,
      relatedTestimonialsCount: processedRelated.length,
      uniqueContentCounts: {
        uniqueVideosCount: limitedRelatedVideos.length,
        uniquePropertiesCount: limitedRelatedProperties.length,
        uniqueArticlesCount: limitedRelatedArticles.length,
        uniqueTestimonialsCount: processedRelated.length
      },
      securityLevel: countryTag?.id ? 'country-protected-strict' : 'standard'
    }
  };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function processTestimonial(testimonial, language, trackingString, detailed = false) {
  // Procesar contenido multiidioma
  let processedTitle = testimonial.title;
  let processedExcerpt = testimonial.excerpt;
  let processedTestimonialText = testimonial.full_testimonial;
  let processedSubtitle = testimonial.subtitle;
  if (language === 'en' && testimonial.content_en) {
    try {
      const contentEn = typeof testimonial.content_en === 'string' ? JSON.parse(testimonial.content_en) : testimonial.content_en;
      if (contentEn.title) processedTitle = contentEn.title;
      if (contentEn.excerpt) processedExcerpt = contentEn.excerpt;
      if (contentEn.full_testimonial) processedTestimonialText = contentEn.full_testimonial;
      if (contentEn.subtitle) processedSubtitle = contentEn.subtitle;
    } catch (e) {
      console.warn('Failed to parse EN testimonial content:', e);
    }
  } else if (language === 'fr' && testimonial.content_fr) {
    try {
      const contentFr = typeof testimonial.content_fr === 'string' ? JSON.parse(testimonial.content_fr) : testimonial.content_fr;
      if (contentFr.title) processedTitle = contentFr.title;
      if (contentFr.excerpt) processedExcerpt = contentFr.excerpt;
      if (contentFr.full_testimonial) processedTestimonialText = contentFr.full_testimonial;
      if (contentFr.subtitle) processedSubtitle = contentFr.subtitle;
    } catch (e) {
      console.warn('Failed to parse FR testimonial content:', e);
    }
  }
  // Construir URL usando el slug completo
  const url = buildTestimonialUrl(testimonial, language, trackingString);
  // Procesar agente
  const agent = testimonial.users ? {
    name: `${testimonial.users.first_name || ''} ${testimonial.users.last_name || ''}`.trim() || getUIText('TEAM_CLIC', language),
    avatar: testimonial.users.profile_photo_url || '/images/team/clic-experts.jpg',
    slug: testimonial.users.slug,
    position: testimonial.users.position || getUIText('REAL_ESTATE_ADVISOR', language),
    bio: testimonial.users.biography,
    phone: testimonial.users.phone,
    email: testimonial.users.email
  } : {
    name: getUIText('TEAM_CLIC', language),
    avatar: '/images/team/clic-experts.jpg',
    slug: null,
    position: getUIText('REAL_ESTATE_ADVISOR', language)
  };
  const processedTestimonial = {
    id: testimonial.id,
    title: processedTitle,
    excerpt: processedExcerpt,
    subtitle: processedSubtitle,
    rating: testimonial.rating || 5,
    clientName: testimonial.client_name,
    clientAvatar: testimonial.client_avatar || '/images/default-avatar.jpg',
    clientLocation: testimonial.client_location,
    clientVerified: testimonial.client_verified || false,
    clientProfession: testimonial.client_profession,
    transactionLocation: testimonial.transaction_location,
    category: testimonial.category,
    featured: testimonial.featured || false,
    publishedAt: testimonial.published_at,
    views: testimonial.views || 0,
    readTime: `${testimonial.read_time || 3} ${getUIText('MINUTES_READ', language)}`,
    url,
    slug: testimonial.slug,
    slug_en: testimonial.slug_en,
    slug_fr: testimonial.slug_fr,
    agent
  };
  // Agregar información detallada si se solicita
  if (detailed) {
    processedTestimonial.fullTestimonial = processedTestimonialText;
    processedTestimonial.rawData = {
      created_at: testimonial.created_at,
      updated_at: testimonial.updated_at
    };
  }
  return processedTestimonial;
}
function buildTestimonialUrl(testimonial, language, trackingString) {
  // Usar el slug completo según el idioma
  let slug;
  if (language === 'en' && testimonial.slug_en) {
    slug = testimonial.slug_en;
  } else if (language === 'fr' && testimonial.slug_fr) {
    slug = testimonial.slug_fr;
  } else {
    slug = testimonial.slug;
  }
  if (!slug) return null;
  // Solo agregar el prefijo de idioma si no es español
  let url = slug;
  if (language === 'en') {
    url = `en/${slug}`;
  } else if (language === 'fr') {
    url = `fr/${slug}`;
  }
  return `/${url}${trackingString}`;
}
function buildTestimonialCategoryUrl(category, language, trackingString) {
  const basePath = language === 'es' ? 'testimonios' : 'testimonials';
  const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
  let url = `${basePath}/${categorySlug}`;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  return `/${url}${trackingString}`;
}
function formatCategoryName(category, language) {
  const categoryNames = {
    'compra': {
      es: 'Compra de Propiedades',
      en: 'Property Purchase',
      fr: 'Achat de Propriétés'
    },
    'compradores': {
      es: 'Compradores',
      en: 'Buyers',
      fr: 'Acheteurs'
    },
    'vendedores': {
      es: 'Vendedores',
      en: 'Sellers',
      fr: 'Vendeurs'
    },
    'venta': {
      es: 'Venta de Propiedades',
      en: 'Property Sale',
      fr: 'Vente de Propriétés'
    },
    'alquiler': {
      es: 'Alquiler de Propiedades',
      en: 'Property Rental',
      fr: 'Location de Propriétés'
    },
    'inquilinos': {
      es: 'Inquilinos',
      en: 'Tenants',
      fr: 'Locataires'
    },
    'inversion': {
      es: 'Inversión Inmobiliaria',
      en: 'Real Estate Investment',
      fr: 'Investissement Immobilier'
    },
    'inversionistas': {
      es: 'Inversionistas',
      en: 'Investors',
      fr: 'Investisseurs'
    },
    'gestion': {
      es: 'Gestión de Propiedades',
      en: 'Property Management',
      fr: 'Gestion de Propriétés'
    }
  };

  // Normalizar la categoría para buscar (minúscula y sin espacios/guiones)
  const categoryKey = category.toLowerCase().replace(/[\s\-]+/g, '_').replace(/_+/g, '_');

  // Intentar con el key normalizado
  if (categoryNames[categoryKey]) {
    return categoryNames[categoryKey][language] || categoryNames[categoryKey].es;
  }

  // Intentar sin guiones bajos (por si viene como "compradores" directo)
  const simpleKey = categoryKey.replace(/_/g, '');
  if (categoryNames[simpleKey]) {
    return categoryNames[simpleKey][language] || categoryNames[simpleKey].es;
  }

  // Si no se encuentra, devolver el original con formato Title Case
  return category.replace(/\b\w/g, (l)=>l.toUpperCase());
}
function calculateAverageRating(testimonials) {
  if (!testimonials.length) return 5.0;
  const sum = testimonials.reduce((acc, testimonial)=>acc + (testimonial.rating || 5), 0);
  return Math.round(sum / testimonials.length * 10) / 10;
}
// ============================================================================
// MAIN EXPORT HANDLER
// ============================================================================
export async function handleTestimonials(params) {
  try {
    const { contentSegments } = params;
    if (contentSegments.length === 0) {
      // Página principal de testimonios
      return await handleTestimonialsMain(params);
    } else if (contentSegments.length === 1) {
      // Categoría de testimonios
      return await handleTestimonialsCategory(params);
    } else if (contentSegments.length === 2) {
      // Testimonio individual
      return await handleSingleTestimonial(params);
    } else {
      throw new Error('Invalid testimonials path structure');
    }
  } catch (error) {
    console.error('Error in testimonials handler:', error);
    throw error;
  }
}
