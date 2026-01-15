// advisors-handler.ts
import { getUIText } from './ui-texts.ts';
// ============================================================================
// ADVISORS HANDLER - ASESORES INMOBILIARIOS FILTRADOS POR PAÍS
// ============================================================================
/** Normaliza una URL opcional a null si viene vacía o en blanco */ function asNullableUrl(v) {
  if (!v) return null;
  if (typeof v === 'string' && v.trim() === '') return null;
  return v;
}
async function handleAdvisorsMain(params) {
  const { supabase, language, trackingString, baseData } = params;
  // Extraer información del país detectado
  const countryCode = baseData?.domainInfo?.country?.code || 'DOM';
  console.log('👥 Handling advisors main page for country:', countryCode);
  // Obtener asesores activos FILTRADOS POR PAÍS
  const { data: advisors } = await supabase.from('users').select(`
      id, first_name, last_name, profile_photo_url, slug, position, biography, 
      phone, email, country_code, years_experience, sales_count,
      specialty_cities, specialty_sectors, specialty_property_categories, specialty_description,
      languages, facebook_url, instagram_url, twitter_url, linkedin_url, youtube_url,
      active, created_at, updated_at, company_start_date, content_en, content_fr
    `).eq('active', true).eq('show_on_website', true).eq('country_code', countryCode) // ← FILTRO POR PAÍS
  .order('sales_count', {
    ascending: false
  }).order('years_experience', {
    ascending: false
  }).order('created_at', {
    ascending: false
  });
  console.log(`Found ${advisors?.length || 0} advisors for country ${countryCode}`);
  // Obtener estadísticas adicionales para cada asesor
  const advisorsWithStats = await Promise.all((advisors || []).map(async (advisor)=>{
    // Contar propiedades activas del asesor
    const { count: activeListings } = await supabase.from('properties').select('id', {
      count: 'exact'
    }).eq('agent_id', advisor.id).eq('status', 'active');
    // Obtener testimonios recientes
    const { data: recentTestimonials } = await supabase.from('testimonials').select('id, rating, client_name').eq('agent_id', advisor.id).eq('status', 'published').order('published_at', {
      ascending: false
    }).limit(3);
    return {
      ...advisor,
      activeListings: activeListings || 0,
      recentTestimonials: recentTestimonials || [],
      // Calcular satisfacción promedio de testimonios
      avgRating: recentTestimonials && recentTestimonials.length > 0 ? recentTestimonials.reduce((sum, t)=>sum + (t.rating || 5), 0) / recentTestimonials.length : 5.0
    };
  }));
  // Procesar asesores
  const processedAdvisors = advisorsWithStats.map((advisor)=>processAdvisor(advisor, language, trackingString));
  // Separar asesores destacados (por ejemplo, los que tienen más ventas)
  const featuredAdvisors = processedAdvisors.filter((a)=>a.stats.totalSales > 10 || a.stats.yearsExperience > 3).slice(0, 6);
  const regularAdvisors = processedAdvisors.filter((a)=>!(a.stats.totalSales > 10 || a.stats.yearsExperience > 3));
  // Obtener especialidades más comunes desde specialty_cities y specialty_sectors
  const allCitySpecialties = advisorsWithStats.flatMap((advisor)=>{
    try {
      return Array.isArray(advisor.specialty_cities) ? advisor.specialty_cities : JSON.parse(advisor.specialty_cities || '[]');
    } catch  {
      return [];
    }
  }).filter(Boolean);
  const allSectorSpecialties = advisorsWithStats.flatMap((advisor)=>{
    try {
      return Array.isArray(advisor.specialty_sectors) ? advisor.specialty_sectors : JSON.parse(advisor.specialty_sectors || '[]');
    } catch  {
      return [];
    }
  }).filter(Boolean);
  // Crear especialidades simplificadas adaptadas al país
  const countrySpecificSpecialties = getCountrySpecificSpecialties(countryCode, language, processedAdvisors.length, trackingString);
  // Calcular estadísticas generales
  const totalExperience = advisorsWithStats.reduce((sum, advisor)=>sum + (advisor.years_experience || 0), 0);
  const totalSales = advisorsWithStats.reduce((sum, advisor)=>sum + (advisor.sales_count || 0), 0);
  const averageSatisfaction = advisorsWithStats.length > 0 ? advisorsWithStats.reduce((sum, advisor)=>sum + (advisor.avgRating || 5), 0) / advisorsWithStats.length : 5.0;
  // SEO adaptado al país
  const countryName = getCountryName(countryCode, language);
  const seo = {
    title: language === 'en' ? `Expert Real Estate Advisors in ${countryName} | CLIC Inmobiliaria` : language === 'fr' ? `Conseillers Immobiliers Experts ${countryName} | CLIC Inmobiliaria` : `Asesores Inmobiliarios Expertos en ${countryName} | CLIC Inmobiliaria`,
    description: language === 'en' ? `Meet our certified real estate advisors in ${countryName}. Professional guidance for buying, selling, and investing in properties. Personalized service guaranteed.` : language === 'fr' ? `Rencontrez nos conseillers immobiliers certifiés ${countryName}. Guidance professionnelle pour acheter, vendre et investir en propriétés. Service personnalisé garanti.` : `Conoce a nuestros asesores inmobiliarios certificados en ${countryName}. Orientación profesional para comprar, vender e invertir en propiedades. Servicio personalizado garantizado.`,
    h1: language === 'en' ? 'Expert Real Estate Advisors' : language === 'fr' ? 'Conseillers Immobiliers Experts' : 'Asesores Inmobiliarios Expertos',
    h2: language === 'en' ? `Professional guidance from certified ${countryName} specialists` : language === 'fr' ? `Guidance professionnelle de spécialistes certifiés ${countryName}` : `Orientación profesional de especialistas certificados en ${countryName}`,
    canonical_url: language === 'es' ? '/asesores' : `/${language}/advisors`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: language === 'en' ? 'Advisors' : language === 'fr' ? 'Conseillers' : 'Asesores',
        url: language === 'es' ? '/asesores' : `/${language}/advisors`
      }
    ]
  };
  return {
    type: 'advisors-main',
    pageType: 'advisors-main',
    seo,
    advisors: processedAdvisors,
    featuredAdvisors,
    regularAdvisors,
    specialties: countrySpecificSpecialties,
    countryCode,
    stats: {
      totalAdvisors: processedAdvisors.length,
      totalExperience,
      totalSales,
      averageSatisfaction: Math.round(averageSatisfaction * 10) / 10,
      averageListingsPerAdvisor: Math.round(advisorsWithStats.reduce((sum, advisor)=>sum + (advisor.activeListings || 0), 0) / (processedAdvisors.length || 1))
    }
  };
}
async function handleSingleAdvisor(params) {
  const { supabase, language, contentSegments, trackingString, baseData } = params;
  // Validación inicial
  if (contentSegments.length === 0) {
    throw new Error('Advisor slug required');
  }
  const advisorSlug = contentSegments[0];
  const countryCode = baseData?.domainInfo?.country?.code || 'DOM';
  console.log('👤 Processing single advisor page');
  console.log('Slug:', advisorSlug);
  console.log('Country:', countryCode);
  console.log('Language:', language);
  // ============================================
  // PASO 1: Obtener datos del asesor
  // ============================================
  let advisor = null;
  // Intentar búsqueda principal
  const { data: advisorData, error: advisorError } = await supabase.from('users').select(`
      id,
      first_name,
      last_name,
      profile_photo_url,
      slug,
      position,
      biography,
      phone,
      email,
      country_code,
      years_experience,
      sales_count,
      specialty_cities,
      specialty_sectors,
      specialty_property_categories,
      specialty_description,
      languages,
      facebook_url,
      instagram_url,
      twitter_url,
      linkedin_url,
      youtube_url,
      active,
      created_at,
      updated_at,
      company_start_date,
      content_en,
      content_fr,
      show_on_website
    `).eq('slug', advisorSlug).eq('active', true).eq('show_on_website', true).eq('country_code', countryCode).single();
  if (!advisorError && advisorData) {
    advisor = advisorData;
  } else {
    // Intentar búsqueda con contenido multiidioma
    console.log('Primary search failed, trying multilingual search...');
    const slugField = language === 'en' ? 'content_en' : language === 'fr' ? 'content_fr' : null;
    if (slugField) {
      const { data: allAdvisors } = await supabase.from('users').select('*').eq('active', true).eq('show_on_website', true).eq('country_code', countryCode);
      if (allAdvisors) {
        for (const adv of allAdvisors){
          try {
            const content = JSON.parse(adv[slugField] || '{}');
            if (content.slug === advisorSlug) {
              advisor = adv;
              break;
            }
          } catch (e) {
          // Continue to next advisor
          }
        }
      }
    }
  }
  if (!advisor) {
    throw new Error(`Advisor "${advisorSlug}" not found for country ${countryCode}`);
  }
  console.log('✅ Advisor found:', advisor.id, `${advisor.first_name} ${advisor.last_name}`);
  // ============================================
  // PASO 2: Contar propiedades activas del asesor
  // ============================================
  console.log('📊 Counting total properties for advisor ID:', advisor.id);
  const { count: totalActiveProperties, error: countError } = await supabase.from('properties').select('id', {
    count: 'exact',
    head: true
  }).eq('agent_id', advisor.id).eq('availability', 1).eq('property_status', 'Publicada');
  if (countError) {
    console.log('❌ Error counting properties:', countError);
  }
  console.log('📊 Total active properties:', totalActiveProperties || 0);
  // ============================================
  // PASO 2.1: NUEVO - Obtener propiedades del asesor (hasta 32)
  // ============================================
  let properties = [];
  try {
    const { data: propertiesData, error: propertiesError } = await supabase.from('properties').select(`
        id, 
        name, 
        description,
        main_image_url,
        sale_price,
        sale_currency,
        rental_price, 
        rental_currency,
        furnished_sale_price,
        furnished_sale_currency,
        furnished_rental_price,
        furnished_rental_currency,
        temp_rental_price,
        temp_rental_currency,
        bedrooms,
        bathrooms,
        parking_spots,
        built_area,
        land_area,
        property_status,
        availability,
        is_project,
        category_id,
        countries:country_id(id, name, code),
        provinces:province_id(id, name),
        cities:city_id(id, name),
        sectors:sector_id(id, name),
        property_categories:category_id(id, name, name_en, name_fr),
        slug_url,
        slug_en,
        slug_fr,
        content_en,
        content_fr
      `).eq('agent_id', advisor.id).eq('availability', 1).eq('property_status', 'Publicada').order('created_at', {
      ascending: false
    }).limit(32);
    if (propertiesError) {
      console.log('❌ Error fetching properties:', propertiesError);
    } else {
      properties = (propertiesData || []).map((property)=>processAdvisorProperty(property, language, trackingString));
      console.log(`📊 Fetched ${properties.length} properties for advisor`);
    }
  } catch (e) {
    console.log('❌ Exception fetching properties:', e.message);
  }
  // ============================================
  // PASO 2.2: NUEVO - Obtener videos del asesor (al menos 6)
  // ============================================
  let videos = [];
  try {
    const { data: videosData, error: videosError } = await supabase.from('videos').select(`
        id,
        video_slug,
        title,
        description,
        thumbnail,
        video_id,
        video_platform,
        duration,
        views,
        category,
        featured,
        published_at,
        location,
        property_type,
        slug_en,
        slug_fr,
        content_en,
        content_fr
      `).eq('created_by_id', advisor.id).eq('status', 'published').order('published_at', {
      ascending: false
    }).limit(6);
    if (videosError) {
      console.log('❌ Error fetching videos:', videosError);
    } else {
      // Procesar videos para formato de presentación
      videos = (videosData || []).map((video)=>{
        // Determinar el slug según el idioma
        let videoSlug = video.video_slug;
        if (language === 'en' && video.slug_en) videoSlug = video.slug_en;
        if (language === 'fr' && video.slug_fr) videoSlug = video.slug_fr;
        // Procesar contenido multiidioma si existe
        let multilingual = {};
        if (language === 'en' && video.content_en) {
          try {
            // Verificar si content_en ya es un objeto o necesita ser parseado
            multilingual = typeof video.content_en === 'object' ? video.content_en : JSON.parse(video.content_en);
          } catch (e) {
            console.warn('Failed to parse video EN content:', e);
          }
        } else if (language === 'fr' && video.content_fr) {
          try {
            // Verificar si content_fr ya es un objeto o necesita ser parseado
            multilingual = typeof video.content_fr === 'object' ? video.content_fr : JSON.parse(video.content_fr);
          } catch (e) {
            console.warn('Failed to parse video FR content:', e);
          }
        }
        // Construir la URL base con el prefijo de idioma si es necesario
        let url = videoSlug;
        if (language === 'en') url = `en/${videoSlug}`;
        if (language === 'fr') url = `fr/${videoSlug}`;
        return {
          id: video.id,
          title: multilingual.title || video.title,
          description: multilingual.description || video.description,
          thumbnail: video.thumbnail,
          videoId: video.video_id,
          platform: video.video_platform || 'youtube',
          duration: video.duration,
          views: video.views || 0,
          category: video.category,
          featured: video.featured || false,
          publishedAt: video.published_at,
          location: video.location,
          propertyType: video.property_type,
          url: `/${url}${trackingString}`
        };
      });
      console.log(`📊 Fetched ${videos.length} videos for advisor`);
    }
  } catch (e) {
    console.log('❌ Exception fetching videos:', e.message);
  }
  // ============================================
  // PASO 3: Obtener testimonios del asesor
  // ============================================
  let testimonials = [];
  try {
    const { data: testimonialsData } = await supabase.from('testimonials').select(`
        id,
        title,
        excerpt,
        full_testimonial,
        rating,
        client_name,
        client_avatar,
        client_location,
        published_at,
        featured
      `).eq('agent_id', advisor.id).eq('status', 'published').order('featured', {
      ascending: false
    }).order('published_at', {
      ascending: false
    }).limit(6);
    testimonials = testimonialsData || [];
  } catch (e) {
    console.log('Testimonials not available:', e.message);
  }
  // ============================================
  // PASO 4: Obtener artículos del asesor
  // ============================================
  const { data: articles } = await supabase.from('articles').select(`
      id,
      title,
      excerpt,
      slug,
      slug_en,
      slug_fr,
      featured_image,
      published_at,
      views,
      read_time
    `).eq('author_id', advisor.id).eq('status', 'published').order('published_at', {
    ascending: false
  }).limit(6);
  // ============================================
  // PASO 5: Procesar todos los datos
  // ============================================
  // Procesar datos del asesor
  const fullName = `${advisor.first_name || ''} ${advisor.last_name || ''}`.trim();
  // Calcular rating promedio
  const avgRating = testimonials.length > 0 ? testimonials.reduce((sum, t)=>sum + (t.rating || 5), 0) / testimonials.length : 5.0;
  // Procesar especialidades
  let specialties = [];

  // Primero agregar specialty_description si existe
  if (advisor.specialty_description && advisor.specialty_description.trim() !== '') {
    specialties.push(advisor.specialty_description);
  }

  // Luego agregar especialidades genéricas basadas en cities/sectors
  try {
    if (advisor.specialty_cities) {
      const cities = JSON.parse(advisor.specialty_cities);
      if (cities.length > 0 && specialties.length < 3) {
        specialties.push(getUIText('CITY_SPECIALIST', language));
      }
    }
    if (advisor.specialty_sectors) {
      const sectors = JSON.parse(advisor.specialty_sectors);
      if (sectors.length > 0 && specialties.length < 3) {
        specialties.push(getUIText('SECTOR_EXPERT', language));
      }
    }
  } catch (e) {
  // Ignore parsing errors
  }
  // Procesar idiomas
  let languagesSpoken = ['Español'];
  try {
    if (advisor.languages) {
      // Si ya es un array, usarlo directamente
      if (Array.isArray(advisor.languages)) {
        languagesSpoken = advisor.languages;
      } else if (typeof advisor.languages === 'string') {
        // Si es string JSON, parsearlo
        languagesSpoken = JSON.parse(advisor.languages);
      }
    }
  } catch (e) {
    console.warn('Failed to parse languages for advisor:', advisor.id, e);
    // Keep default
  }
  // Procesar enlaces sociales
  const socialLinks = {};
  if (advisor.facebook_url) socialLinks.facebook = advisor.facebook_url;
  if (advisor.instagram_url) socialLinks.instagram = advisor.instagram_url;
  if (advisor.twitter_url) socialLinks.twitter = advisor.twitter_url;
  if (advisor.linkedin_url) socialLinks.linkedin = advisor.linkedin_url;
  if (advisor.youtube_url) socialLinks.youtube = advisor.youtube_url;
  // Procesar testimonios
  const processedTestimonials = testimonials.map((testimonial)=>({
      id: testimonial.id,
      title: testimonial.title,
      excerpt: testimonial.excerpt,
      rating: testimonial.rating || 5,
      clientName: testimonial.client_name,
      clientAvatar: asNullableUrl(testimonial.client_avatar),
      clientLocation: testimonial.client_location,
      publishedAt: testimonial.published_at,
      featured: testimonial.featured || false
    }));
  // Procesar artículos
  const processedArticles = (articles || []).map((article)=>{
    let slug = article.slug;
    if (language === 'en' && article.slug_en) slug = article.slug_en;
    if (language === 'fr' && article.slug_fr) slug = article.slug_fr;
    let url = slug;
    if (language === 'en') url = `en/${slug}`;
    if (language === 'fr') url = `fr/${slug}`;
    return {
      id: article.id,
      title: article.title,
      excerpt: article.excerpt,
      featuredImage: article.featured_image,
      publishedAt: article.published_at,
      views: article.views || 0,
      readTime: `${article.read_time || 5} ${getUIText('MINUTES_READ', language)}`,
      url: `/${url}${trackingString}`
    };
  });
  // ============================================
  // PASO 6: Construir SEO y respuesta final
  // ============================================
  const countryName = getCountryName(countryCode, language);
  const actualPropertiesCount = totalActiveProperties || 0;
  const seo = {
    title: `${fullName} - ${getUIText('REAL_ESTATE_ADVISOR', language)} ${countryName} | CLIC Inmobiliaria`,
    description: language === 'en' ? `Meet ${fullName}, expert real estate advisor with ${advisor.years_experience || 0}+ years of experience in ${countryName}. ${actualPropertiesCount} active properties available.` : language === 'fr' ? `Rencontrez ${fullName}, conseiller immobilier expert avec ${advisor.years_experience || 0}+ années d'expérience ${countryName}. ${actualPropertiesCount} propriétés actives disponibles.` : `Conoce a ${fullName}, asesor inmobiliario experto con ${advisor.years_experience || 0}+ años de experiencia en ${countryName}. ${actualPropertiesCount} propiedades activas disponibles.`,
    h1: fullName,
    h2: advisor.position || getUIText('REAL_ESTATE_ADVISOR', language),
    canonical_url: buildAdvisorUrl(advisor, language, ''),
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: getUIText('ADVISORS', language),
        url: language === 'es' ? '/asesores' : `/${language}/advisors`
      },
      {
        name: fullName,
        url: buildAdvisorUrl(advisor, language, trackingString)
      }
    ]
  };
  // Construir timeline de carrera
  const timeline = [];
  const startYear = new Date().getFullYear() - (advisor.years_experience || 0);
  timeline.push({
    year: startYear,
    title: getUIText('CAREER_START', language),
    description: getUIText('CAREER_START_DESC', language)
  });
  if (advisor.company_start_date) {
    const clicYear = new Date(advisor.company_start_date).getFullYear();
    timeline.push({
      year: clicYear,
      title: getUIText('JOINED_CLIC', language),
      description: getUIText('JOINED_CLIC_DESC', language)
    });
  }
  // Construir métodos de contacto
  const contactMethods = [
    {
      type: 'whatsapp',
      label: 'WhatsApp',
      value: advisor.phone,
      icon: 'message-circle',
      action: `https://wa.me/${(advisor.phone || '').replace(/[^\d]/g, '')}`,
      available: getUIText('INSTANT_RESPONSE', language)
    },
    {
      type: 'phone',
      label: getUIText('CALL_DIRECT', language),
      value: advisor.phone,
      icon: 'phone',
      action: `tel:${(advisor.phone || '').replace(/[^\d+]/g, '')}`,
      available: getUIText('BUSINESS_HOURS', language)
    },
    {
      type: 'email',
      label: getUIText('SEND_EMAIL', language),
      value: advisor.email,
      icon: 'mail',
      action: `mailto:${advisor.email || ''}`,
      available: getUIText('RESPONSE_24H', language)
    },
    {
      type: 'schedule',
      label: getUIText('SCHEDULE_MEETING', language),
      value: getUIText('BOOK_CONSULTATION', language),
      icon: 'calendar',
      action: `/contacto?advisor=${advisor.slug}`,
      available: getUIText('FREE_CONSULTATION', language)
    }
  ];
  // ============================================
  // RETORNAR RESPUESTA COMPLETA
  // ============================================
  return {
    type: 'advisor-single',
    pageType: 'advisor-single',
    seo,
    advisor: {
      id: advisor.id,
      name: fullName,
      firstName: advisor.first_name,
      lastName: advisor.last_name,
      avatar: asNullableUrl(advisor.profile_photo_url),
      position: advisor.position || getUIText('REAL_ESTATE_ADVISOR', language),
      bio: advisor.biography,
      slug: advisor.slug,
      phone: advisor.phone,
      email: advisor.email,
      countryCode: advisor.country_code || 'DOM',
      yearsExperience: advisor.years_experience || 0,
      specialties,
      languagesSpoken,
      socialLinks,
      url: buildAdvisorUrl(advisor, language, trackingString),
      stats: {
        totalSales: advisor.sales_count || 0,
        clientSatisfaction: Math.round(avgRating * 10) / 10,
        activeListings: actualPropertiesCount,
        yearsExperience: advisor.years_experience || 0
      }
    },
    properties: properties,
    videos: videos,
    testimonials: processedTestimonials,
    articles: processedArticles,
    countryCode,
    stats: {
      totalProperties: actualPropertiesCount,
      totalTestimonials: processedTestimonials.length,
      totalArticles: processedArticles.length,
      totalVideos: videos.length,
      averageRating: Math.round(avgRating * 10) / 10
    },
    timeline: timeline.sort((a, b)=>a.year - b.year),
    services: buildAdvisorServices(language),
    contactMethods
  };
}
// ============================================================================
// HELPER FUNCTIONS ACTUALIZADAS
// ============================================================================
function getCountryName(countryCode, language) {
  const countryNames = {
    DOM: {
      es: 'República Dominicana',
      en: 'Dominican Republic',
      fr: 'République Dominicaine'
    },
    PAN: {
      es: 'Panamá',
      en: 'Panama',
      fr: 'Panama'
    }
  };
  return countryNames[countryCode]?.[language] || countryNames['DOM'][language];
}
function getCountrySpecificSpecialties(countryCode, language, advisorCount, trackingString) {
  const baseSpecialties = {
    DOM: {
      es: [
        {
          name: 'Propiedades de Lujo',
          slug: 'luxury'
        },
        {
          name: 'Propiedades de Inversión',
          slug: 'investment'
        },
        {
          name: 'Propiedades Frente al Mar',
          slug: 'beachfront'
        },
        {
          name: 'Condominios Piantini',
          slug: 'piantini'
        }
      ],
      en: [
        {
          name: 'Luxury Properties',
          slug: 'luxury'
        },
        {
          name: 'Investment Properties',
          slug: 'investment'
        },
        {
          name: 'Beachfront Properties',
          slug: 'beachfront'
        },
        {
          name: 'Piantini Condominiums',
          slug: 'piantini'
        }
      ],
      fr: [
        {
          name: 'Propriétés de Luxe',
          slug: 'luxury'
        },
        {
          name: "Propriétés d'Investissement",
          slug: 'investment'
        },
        {
          name: 'Propriétés en Bord de Mer',
          slug: 'beachfront'
        },
        {
          name: 'Condominiums Piantini',
          slug: 'piantini'
        }
      ]
    },
    PAN: {
      es: [
        {
          name: 'Torres de Lujo',
          slug: 'luxury-towers'
        },
        {
          name: 'Propiedades de Inversión',
          slug: 'investment'
        },
        {
          name: 'Casco Antiguo',
          slug: 'casco-antiguo'
        },
        {
          name: 'Costa del Este',
          slug: 'costa-del-este'
        }
      ],
      en: [
        {
          name: 'Luxury Towers',
          slug: 'luxury-towers'
        },
        {
          name: 'Investment Properties',
          slug: 'investment'
        },
        {
          name: 'Casco Antiguo',
          slug: 'casco-antiguo'
        },
        {
          name: 'Costa del Este',
          slug: 'costa-del-este'
        }
      ],
      fr: [
        {
          name: 'Tours de Luxe',
          slug: 'luxury-towers'
        },
        {
          name: "Propriétés d'Investissement",
          slug: 'investment'
        },
        {
          name: 'Casco Antiguo',
          slug: 'casco-antiguo'
        },
        {
          name: 'Costa del Este',
          slug: 'costa-del-este'
        }
      ]
    }
  };
  const specialties = baseSpecialties[countryCode]?.[language] || baseSpecialties['DOM'][language];
  return specialties.map((specialty)=>({
      name: specialty.name,
      slug: specialty.slug,
      count: Math.floor(advisorCount * (Math.random() * 0.3 + 0.2)),
      url: buildSpecialtyUrl(specialty.slug, language, trackingString)
    }));
}
function processAdvisor(advisor, language, trackingString, detailed = false) {
  const fullName = `${advisor.first_name || ''} ${advisor.last_name || ''}`.trim();

  // Procesar especialidades - PRIORIZAR specialty_description
  let specialties = [];

  // Primero: specialty_description personalizado
  if (advisor.specialty_description && advisor.specialty_description.trim() !== '') {
    specialties.push(advisor.specialty_description);
  }

  // Luego: agregar especialidades genéricas si no hay suficientes
  try {
    if (specialties.length < 3) {
      const cities = Array.isArray(advisor.specialty_cities) ? advisor.specialty_cities : JSON.parse(advisor.specialty_cities || '[]');
      const sectors = Array.isArray(advisor.specialty_sectors) ? advisor.specialty_sectors : JSON.parse(advisor.specialty_sectors || '[]');

      if (cities.length > 0 && specialties.length < 3) {
        specialties.push(language === 'en' ? 'City Specialist' : language === 'fr' ? 'Spécialiste Ville' : 'Especialista en Ciudades');
      }
      if (sectors.length > 0 && specialties.length < 3) {
        specialties.push(language === 'en' ? 'Sector Expert' : language === 'fr' ? 'Expert Secteur' : 'Experto en Sectores');
      }
    }
  } catch (e) {
    console.warn('Failed to parse specialties:', e);
  }

  // Procesar idiomas
  let languagesSpoken = ['Español'];
  try {
    if (advisor.languages) {
      if (Array.isArray(advisor.languages)) {
        languagesSpoken = advisor.languages;
      } else if (typeof advisor.languages === 'string') {
        languagesSpoken = JSON.parse(advisor.languages);
      }
    }
  } catch (e) {
    console.warn('Failed to parse languages:', e);
  }
  // Construir enlaces sociales
  const socialLinks = {};
  if (advisor.facebook_url) socialLinks.facebook = advisor.facebook_url;
  if (advisor.instagram_url) socialLinks.instagram = advisor.instagram_url;
  if (advisor.twitter_url) socialLinks.twitter = advisor.twitter_url;
  if (advisor.linkedin_url) socialLinks.linkedin = advisor.linkedin_url;
  if (advisor.youtube_url) socialLinks.youtube = advisor.youtube_url;
  const processedAdvisor = {
    id: advisor.id,
    name: fullName,
    firstName: advisor.first_name,
    lastName: advisor.last_name,
    avatar: asNullableUrl(advisor.profile_photo_url),
    position: advisor.position || getUIText('REAL_ESTATE_ADVISOR', language),
    bio: advisor.biography,
    slug: advisor.slug,
    phone: advisor.phone,
    email: advisor.email,
    countryCode: advisor.country_code || 'DOM',
    yearsExperience: advisor.years_experience || 0,
    specialties,
    languagesSpoken,
    socialLinks,
    featured: (advisor.sales_count || 0) > 10,
    url: buildAdvisorUrl(advisor, language, trackingString),
    stats: {
      totalSales: advisor.sales_count || 0,
      clientSatisfaction: advisor.avgRating || 5.0,
      activeListings: advisor.activeListings || 0,
      yearsExperience: advisor.years_experience || 0
    },
    recentTestimonials: advisor.recentTestimonials || []
  };
  // Agregar información detallada si se solicita
  if (detailed) {
    processedAdvisor.specialtyDescription = advisor.specialty_description;
    processedAdvisor.companyStartDate = advisor.company_start_date;
    processedAdvisor.createdAt = advisor.created_at;
    processedAdvisor.updatedAt = advisor.updated_at;
  }
  return processedAdvisor;
}
function processAdvisorProperty(property, language, trackingString) {
  // Determinar el slug según el idioma
  let propertySlug = property.slug_url;
  if (language === 'en' && property.slug_en) propertySlug = property.slug_en;
  if (language === 'fr' && property.slug_fr) propertySlug = property.slug_fr;
  // Construir la URL con el idioma correcto
  let url = propertySlug;
  if (language === 'en') url = `en/${propertySlug}`;
  if (language === 'fr') url = `fr/${propertySlug}`;
  // Procesar contenido multiidioma si existe
  let multilingual = {};
  if (language === 'en' && property.content_en) {
    try {
      // Verificar si content_en ya es un objeto o necesita ser parseado
      multilingual = typeof property.content_en === 'object' ? property.content_en : JSON.parse(property.content_en);
    } catch (e) {
      console.warn('Failed to parse EN content:', e);
    }
  } else if (language === 'fr' && property.content_fr) {
    try {
      // Verificar si content_fr ya es un objeto o necesita ser parseado
      multilingual = typeof property.content_fr === 'object' ? property.content_fr : JSON.parse(property.content_fr);
    } catch (e) {
      console.warn('Failed to parse FR content:', e);
    }
  }
  // Determinar precio principal a mostrar
  let mainPrice = property.sale_price || property.rental_price || property.furnished_sale_price || property.furnished_rental_price || property.temp_rental_price || 0;
  let mainCurrency = property.sale_currency || property.rental_currency || property.furnished_sale_currency || property.furnished_rental_currency || property.temp_rental_currency || 'USD';
  // Determinar tipo de operación basado en los precios disponibles
  let operation = null;
  if (property.sale_price) {
    operation = 'sale';
  } else if (property.rental_price) {
    operation = 'rental';
  } else if (property.furnished_rental_price) {
    operation = 'furnished_rental';
  } else if (property.temp_rental_price) {
    operation = 'temp_rental';
  }
  return {
    id: property.id,
    name: multilingual.name || multilingual.title || property.name,
    description: multilingual.description || property.description,
    mainImage: property.main_image_url,
    salePrice: property.sale_price,
    rentalPrice: property.rental_price,
    mainPrice: mainPrice,
    mainCurrency: mainCurrency,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    parkingSpots: property.parking_spots,
    builtArea: property.built_area,
    landArea: property.land_area,
    propertyType: property.property_categories?.name,
    operation: operation,
    city: property.cities?.name,
    sector: property.sectors?.name,
    category: property.property_categories?.name,
    categoryDisplay: language === 'en' ? property.property_categories?.name_en : language === 'fr' ? property.property_categories?.name_fr : property.property_categories?.name,
    featured: property.featured || false,
    isProject: property.is_project,
    url: `/${url}${trackingString}`
  };
}
function buildAdvisorUrl(advisor, language, trackingString) {
  if (!advisor.slug) return null;
  const basePath = language === 'es' ? 'asesores' : language === 'en' ? 'advisors' : 'conseillers';
  let url = `${basePath}/${advisor.slug}`;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  return `/${url}${trackingString}`;
}
function buildArticleUrl(article, language, trackingString) {
  const slug = language === 'en' && article.slug_en || language === 'fr' && article.slug_fr || article.slug;
  if (!slug) return null;
  let url = slug;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  return `/${url}${trackingString}`;
}
function buildSpecialtyUrl(specialty, language, trackingString) {
  const specialtySlug = specialty.toLowerCase().replace(/\s+/g, '-');
  const basePath = language === 'es' ? 'asesores' : language === 'en' ? 'advisors' : 'conseillers';
  let url = `${basePath}?specialty=${specialtySlug}`;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  return `/${url}${trackingString}`;
}
function buildCareerTimeline(advisor, language) {
  const timeline = [];
  // Inicio de carrera
  const startYear = new Date().getFullYear() - (advisor.years_experience || 0);
  timeline.push({
    year: startYear,
    title: language === 'en' ? 'Started Real Estate Career' : language === 'fr' ? 'Début Carrière Immobilière' : 'Inició Carrera Inmobiliaria',
    description: language === 'en' ? 'Began professional journey in real estate' : language === 'fr' ? 'Débuta parcours professionnel immobilier' : 'Comenzó trayectoria profesional inmobiliaria'
  });
  // Unión a CLIC
  if (advisor.company_start_date) {
    const clicYear = new Date(advisor.company_start_date).getFullYear();
    timeline.push({
      year: clicYear,
      title: language === 'en' ? 'Joined CLIC Inmobiliaria' : language === 'fr' ? 'Rejoint CLIC Inmobiliaria' : 'Se Unió a CLIC Inmobiliaria',
      description: language === 'en' ? 'Became part of the CLIC expert team' : language === 'fr' ? "Devenu membre de l'équipe d'experts CLIC" : 'Se convirtió en parte del equipo experto de CLIC'
    });
  }
  return timeline.sort((a, b)=>a.year - b.year);
}
function buildAdvisorServices(language) {
  return [
    {
      title: language === 'en' ? 'Property Search & Selection' : language === 'fr' ? 'Recherche & Sélection Propriétés' : 'Búsqueda y Selección de Propiedades',
      description: language === 'en' ? 'Personalized property search based on your specific needs and budget' : language === 'fr' ? 'Recherche immobilière personnalisée basée sur vos besoins spécifiques et budget' : 'Búsqueda inmobiliaria personalizada basada en tus necesidades específicas y presupuesto',
      icon: 'search',
      included: true
    },
    {
      title: language === 'en' ? 'Market Analysis & Pricing' : language === 'fr' ? 'Analyse Marché & Prix' : 'Análisis de Mercado y Precios',
      description: language === 'en' ? 'Comprehensive market analysis and fair pricing strategies for optimal results' : language === 'fr' ? 'Analyse de marché complète et stratégies de prix équitables pour résultats optimaux' : 'Análisis completo de mercado y estrategias de precios justas para resultados óptimos',
      icon: 'trending-up',
      included: true
    },
    {
      title: language === 'en' ? 'Negotiation & Closing' : language === 'fr' ? 'Négociation & Clôture' : 'Negociación y Cierre',
      description: language === 'en' ? 'Expert negotiation skills and complete closing support from offer to keys' : language === 'fr' ? "Compétences de négociation expertes et support complet de l'offre aux clés" : 'Habilidades expertas de negociación y soporte completo desde oferta hasta llaves',
      icon: 'handshake',
      included: true
    },
    {
      title: language === 'en' ? 'Legal & Documentation' : language === 'fr' ? 'Juridique & Documentation' : 'Legal y Documentación',
      description: language === 'en' ? 'Complete legal assistance and documentation management for secure transactions' : language === 'fr' ? 'Assistance juridique complète et gestion documentation pour transactions sécurisées' : 'Asistencia legal completa y gestión de documentación para transacciones seguras',
      icon: 'file-text',
      included: true
    },
    {
      title: language === 'en' ? 'Investment Consulting' : language === 'fr' ? 'Consultation Investissement' : 'Consultoría de Inversión',
      description: language === 'en' ? 'ROI analysis, investment opportunities, and portfolio diversification strategies' : language === 'fr' ? "Analyse ROI, opportunités d'investissement et stratégies diversification portefeuille" : 'Análisis ROI, oportunidades de inversión y estrategias de diversificación de portafolio',
      icon: 'bar-chart',
      premium: true
    },
    {
      title: language === 'en' ? 'Post-Sale Support' : language === 'fr' ? 'Support Après-Vente' : 'Soporte Post-Venta',
      description: language === 'en' ? 'Ongoing support for property management, renovations, and future transactions' : language === 'fr' ? 'Support continu pour gestion propriété, rénovations et transactions futures' : 'Soporte continuo para gestión de propiedades, renovaciones y transacciones futuras',
      icon: 'shield',
      included: true
    }
  ];
}
// ============================================================================
// MAIN EXPORT HANDLER
// ============================================================================
export async function handleAdvisors(params) {
  try {
    const { contentSegments } = params;
    if (contentSegments.length === 0) {
      // Página principal de asesores
      return await handleAdvisorsMain(params);
    } else if (contentSegments.length === 1) {
      // Página individual de asesor
      return await handleSingleAdvisor(params);
    } else {
      throw new Error('Invalid advisors path structure');
    }
  } catch (error) {
    console.error('Error in advisors handler:', error);
    throw error;
  }
}
