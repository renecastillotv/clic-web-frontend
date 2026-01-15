// articles-handler.ts - CORREGIDO CON CONTENT_CATEGORIES
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
function buildArticleUrl(article, language, trackingString) {
  let slug;
  if (language === 'en' && article.slug_en) {
    slug = article.slug_en;
  } else if (language === 'fr' && article.slug_fr) {
    slug = article.slug_fr;
  } else {
    slug = article.slug;
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
function buildCategoryUrl(category, language, trackingString) {
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
  return `/${slug}${trackingString}`;
}
// ============================================================================
// HELPER FUNCTIONS FOR SECURE CROSS-CONTENT WITH BASEDATA
// ============================================================================
async function getPopularTagsFromArticles(supabase, countryTag, limit = 6) {
  if (!countryTag?.id) {
    console.warn('NO COUNTRYTAG - Aborting popular tags query');
    return [];
  }
  const { data, error } = await supabase.from('content_tags').select(`
      tag_id, 
      tags(id, display_name, display_name_en, display_name_fr, slug, slug_en, slug_fr, category)
    `).eq('content_type', 'article').order('created_at', {
    ascending: false
  }).limit(limit * 3);
  if (error) {
    console.warn('Error fetching popular tags:', error);
    return [];
  }
  const uniqueTags = [];
  const seenIds = new Set([
    countryTag.id
  ]);
  uniqueTags.push(countryTag);
  for (const item of data || []){
    if (item.tags && !seenIds.has(item.tags.id)) {
      seenIds.add(item.tags.id);
      uniqueTags.push(item.tags);
      if (uniqueTags.length >= limit + 1) break;
    }
  }
  console.log('Popular tags with country protection:', {
    countryTagIncluded: true,
    totalTags: uniqueTags.length,
    countryTagId: countryTag.id
  });
  return uniqueTags;
}
async function getArticleSpecificTags(supabase, articleId, countryTag) {
  if (!countryTag?.id) {
    console.warn('NO COUNTRYTAG - Aborting article tags query');
    return [
      countryTag
    ].filter(Boolean);
  }
  const { data, error } = await supabase.from('content_tags').select(`
      tag_id, weight,
      tags(id, display_name, display_name_en, display_name_fr, slug, category)
    `).eq('content_id', articleId).eq('content_type', 'article').order('weight', {
    ascending: false
  });
  if (error) {
    console.warn('Error fetching article tags:', error);
    return [
      countryTag
    ];
  }
  const allTags = [
    countryTag
  ];
  const articleTags = (data || []).map((ct)=>ct.tags).filter((tag)=>tag && tag.id !== countryTag.id);
  allTags.push(...articleTags);
  console.log('Article tags with country protection:', {
    countryTagId: countryTag.id,
    articleTags: articleTags.length,
    totalTags: allTags.length
  });
  return allTags;
}
async function processRelatedContent(supabase, contentRpcResult, language, trackingString) {
  const relatedContent = {
    articles: [],
    videos: [],
    faqs: [],
    testimonials: [],
    properties: []
  };
  if (!contentRpcResult?.data || !Array.isArray(contentRpcResult.data)) {
    return relatedContent;
  }
  // Filtrar y ordenar por tipo ANTES de limitar
  const articleIds = contentRpcResult.data.filter((result)=>result.content_type === 'article').sort((a, b)=>(b.total_weight || 0) - (a.total_weight || 0) || (b.matched_tags || 0) - (a.matched_tags || 0)).slice(0, 15).map((c)=>c.content_id);
  const videoIds = contentRpcResult.data.filter((result)=>result.content_type === 'video').sort((a, b)=>(b.total_weight || 0) - (a.total_weight || 0) || (b.matched_tags || 0) - (a.matched_tags || 0)).slice(0, 15).map((c)=>c.content_id);
  const faqIds = contentRpcResult.data.filter((result)=>result.content_type === 'faq').sort((a, b)=>(b.total_weight || 0) - (a.total_weight || 0) || (b.matched_tags || 0) - (a.matched_tags || 0)).slice(0, 15).map((c)=>c.content_id);
  const testimonialIds = contentRpcResult.data.filter((result)=>result.content_type === 'testimonial').sort((a, b)=>(b.total_weight || 0) - (a.total_weight || 0) || (b.matched_tags || 0) - (a.matched_tags || 0)).slice(0, 15).map((c)=>c.content_id);
  const propertyIds = contentRpcResult.data.filter((result)=>result.content_type === 'property').sort((a, b)=>(b.total_weight || 0) - (a.total_weight || 0) || (b.matched_tags || 0) - (a.matched_tags || 0)).slice(0, 15).map((c)=>c.content_id);
  const contentPromises = [];
  if (videoIds.length > 0) {
    contentPromises.push(supabase.from('videos').select(`
          id, title, description, video_slug, slug_en, slug_fr, thumbnail, published_at, 
          views, duration, featured, content_en, content_fr, created_by_id, category_id,
          users:users!videos_created_by_id_fkey(first_name, last_name, profile_photo_url, slug),
          content_categories:content_categories!videos_category_id_fkey(display_name, display_name_en, display_name_fr, slug)
        `).in('id', videoIds).eq('status', 'published').order('featured', {
      ascending: false
    }).order('views', {
      ascending: false
    }).order('published_at', {
      ascending: false
    }).then(({ data })=>(data || []).map((item)=>({
          ...item,
          content_type: 'video'
        }))));
  }
  if (testimonialIds.length > 0) {
    contentPromises.push(supabase.from('testimonials').select(`
          id, slug, slug_en, slug_fr, title, excerpt, full_testimonial, rating, client_name, 
          client_avatar, client_location, client_verified, featured, published_at, 
          content_en, content_fr, agent_id,
          users:users!testimonials_agent_id_fkey(first_name, last_name, profile_photo_url, slug)
        `).in('id', testimonialIds).eq('status', 'published').then(({ data })=>(data || []).map((item)=>({
          ...item,
          content_type: 'testimonial'
        }))));
  }
  if (faqIds.length > 0) {
    contentPromises.push(supabase.from('faqs').select('id, question, answer, content_en, content_fr').in('id', faqIds).eq('status', 'published').then(({ data })=>(data || []).map((item)=>({
          ...item,
          content_type: 'faq'
        }))));
  }
  if (propertyIds.length > 0) {
    contentPromises.push(supabase.from('properties').select(`
          id, name, slug_url, slug_en, slug_fr, content_en, content_fr,
          sale_price, rental_price, sale_currency, rental_currency,
          temp_rental_price, temp_rental_currency,
          furnished_rental_price, furnished_rental_currency,
          bedrooms, bathrooms, built_area, main_image_url, is_project,
          property_categories(name, name_en, name_fr), 
          cities(name), sectors(name)
        `).in('id', propertyIds).eq('property_status', 'Publicada').eq('availability', 1).then(({ data })=>(data || []).map((item)=>({
          ...item,
          content_type: 'property'
        }))));
  }
  const contentResults = await Promise.all(contentPromises);
  const allContent = contentResults.flat();
  allContent.forEach((item)=>{
    if (!item) return;
    if (item.content_type === 'video') {
      let processedTitle = item.title || '';
      let processedDescription = item.description || '';
      const videoContent = processMultilingualContent(item, language);
      if (videoContent.title) processedTitle = videoContent.title;
      if (videoContent.description) processedDescription = videoContent.description;
      const slug = language === 'en' && item.slug_en ? item.slug_en : language === 'fr' && item.slug_fr ? item.slug_fr : item.video_slug;
      let url = slug;
      if (language === 'en') url = `en/${slug}`;
      if (language === 'fr') url = `fr/${slug}`;
      relatedContent.videos.push({
        id: item.id,
        title: processedTitle,
        description: processedDescription,
        thumbnail: item.thumbnail,
        duration: item.duration || '10:00',
        views: item.views || 0,
        featured: item.featured || false,
        publishedAt: item.published_at,
        url: `/${url}${trackingString}`,
        slug: slug,
        author: item.users ? {
          name: `${item.users.first_name || ''} ${item.users.last_name || ''}`.trim() || getUIText('TEAM_CLIC', language),
          avatar: item.users.profile_photo_url || '/images/team/clic-experts.jpg'
        } : {
          name: getUIText('TEAM_CLIC', language),
          avatar: '/images/team/clic-experts.jpg'
        },
        category: item.content_categories ? language === 'en' && item.content_categories.display_name_en ? item.content_categories.display_name_en : language === 'fr' && item.content_categories.display_name_fr ? item.content_categories.display_name_fr : item.content_categories.display_name : getUIText('VIDEOS', language)
      });
    } else if (item.content_type === 'testimonial') {
      let processedTitle = item.title || '';
      let processedExcerpt = item.excerpt || '';
      const testimonialContent = processMultilingualContent(item, language);
      if (testimonialContent.title) processedTitle = testimonialContent.title;
      if (testimonialContent.excerpt) processedExcerpt = testimonialContent.excerpt;
      const slug = language === 'en' && item.slug_en ? item.slug_en : language === 'fr' && item.slug_fr ? item.slug_fr : item.slug;
      let url = slug;
      if (language === 'en') url = `en/${slug}`;
      if (language === 'fr') url = `fr/${slug}`;
      relatedContent.testimonials.push({
        id: item.id,
        title: processedTitle,
        excerpt: processedExcerpt,
        rating: item.rating || 5,
        clientName: item.client_name,
        clientAvatar: item.client_avatar || '/images/default-avatar.jpg',
        clientLocation: item.client_location,
        featured: item.featured || false,
        publishedAt: item.published_at,
        url: `/${url}${trackingString}`,
        slug: slug
      });
    } else if (item.content_type === 'faq') {
      let processedQuestion = item.question || '';
      let processedAnswer = item.answer || '';
      const faqContent = processMultilingualContent(item, language);
      if (faqContent.question) processedQuestion = faqContent.question;
      if (faqContent.answer) processedAnswer = faqContent.answer;
      relatedContent.faqs.push({
        id: item.id,
        question: processedQuestion,
        answer: processedAnswer
      });
    } else if (item.content_type === 'property') {
      let processedName = item.name || '';
      const propertyContent = processMultilingualContent(item, language);
      if (propertyContent.name) processedName = propertyContent.name;
      let propertySlug = item.slug_url;
      if (language === 'en' && item.slug_en) propertySlug = item.slug_en;
      if (language === 'fr' && item.slug_fr) propertySlug = item.slug_fr;
      let propertyUrl = propertySlug;
      if (language === 'en') propertyUrl = `en/${propertySlug}`;
      if (language === 'fr') propertyUrl = `fr/${propertySlug}`;
      let formattedPrice = getUIText('PRICE_ON_CONSULTATION', language);
      if (item.sale_price && item.sale_currency) {
        formattedPrice = `${item.sale_currency} ${item.sale_price.toLocaleString()}`;
      } else if (item.rental_price && item.rental_currency) {
        formattedPrice = `${item.rental_currency} ${item.rental_price.toLocaleString()}/mes`;
      }
      relatedContent.properties.push({
        id: item.id,
        name: processedName,
        price: formattedPrice,
        bedrooms: item.bedrooms || 0,
        bathrooms: item.bathrooms || 0,
        area: item.built_area || 0,
        image: item.main_image_url || '/images/placeholder-property.jpg',
        isProject: item.is_project || false,
        location: item.sectors?.name || item.cities?.name,
        category: item.property_categories ? language === 'en' && item.property_categories.name_en ? item.property_categories.name_en : language === 'fr' && item.property_categories.name_fr ? item.property_categories.name_fr : item.property_categories.name : getUIText('PROPERTY', language),
        url: `/${propertyUrl}${trackingString}`,
        slug: propertySlug
      });
    }
  });
  return relatedContent;
}
// ============================================================================
// MAIN HANDLER FUNCTIONS WITH COUNTRY FILTERING
// ============================================================================
async function handleArticlesMain(params) {
  const { supabase, language, queryParams, trackingString, baseData } = params;
  const countryTag = baseData?.countryTag;
  const globalConfig = baseData?.globalConfig;
  console.log('📰 Handling articles main with country filtering');
  console.log('🛡️ CountryTag from baseData:', !!countryTag?.id, 'Config:', !!globalConfig);
  try {
    if (!countryTag?.id) {
      console.error('❌ CRITICAL: No countryTag in baseData');
      return createFallbackResponse(language, trackingString, 'Missing country context from baseData');
    }
    // PASO 1: Obtener IDs de artículos del país
    const { data: articlesByCountry } = await supabase.from('content_tags').select('content_id').eq('content_type', 'article').eq('tag_id', countryTag.id);
    const countryArticleIds = (articlesByCountry || []).map((ct)=>ct.content_id);
    console.log(`Found ${countryArticleIds.length} articles for country ${countryTag.id}`);
    // PASO 2: Obtener featured y recent FILTRADOS por país
    const [featuredArticles, recentArticles] = await Promise.all([
      countryArticleIds.length > 0 ? supabase.from('articles').select(`
          id, title, excerpt, slug, slug_en, slug_fr, featured_image, published_at, 
          views, read_time, subtitle, featured, content, content_en, content_fr, 
          author_id, category_id, category, tags, status
        `).in('id', countryArticleIds).eq('status', 'published').eq('featured', true).order('published_at', {
        ascending: false
      }).limit(6) : {
        data: []
      },
      countryArticleIds.length > 0 ? supabase.from('articles').select(`
          id, title, excerpt, slug, slug_en, slug_fr, featured_image, published_at, 
          views, read_time, subtitle, content, content_en, content_fr, 
          author_id, category_id, category, tags, status
        `).in('id', countryArticleIds).eq('status', 'published').order('published_at', {
        ascending: false
      }).limit(12) : {
        data: []
      }
    ]);
    // FASE 2: Obtener autores
    const allArticles = [
      ...featuredArticles.data || [],
      ...recentArticles.data || []
    ];
    const authorIds = [
      ...new Set(allArticles.map((a)=>a.author_id).filter(Boolean))
    ];
    let authorsMap = {};
    if (authorIds.length > 0) {
      const { data: authors } = await supabase.from('users').select('id, first_name, last_name, profile_photo_url, slug, position, country_code').in('id', authorIds);
      if (authors) {
        authorsMap = authors.reduce((acc, author)=>{
          acc[author.id] = author;
          return acc;
        }, {});
      }
    }
    // FASE 3: Obtener categorías FILTRADAS POR PAÍS desde content_categories
    const { data: articleCategories } = await supabase.from('content_categories').select('*').eq('content_type', 'articles').eq('active', true).eq('country_code', baseData?.countryCode || 'DOM').order('display_name');
    console.log(`Found ${articleCategories?.length || 0} article categories for country`);
    // Contar artículos por categoría
    let processedCategories = [];
    if (articleCategories?.length > 0) {
      const categoryPromises = articleCategories.map(async (cat)=>{
        const { data: catArticles } = await supabase.from('articles').select('id').eq('category_id', cat.id).in('id', countryArticleIds).eq('status', 'published');
        const categoryName = getCategoryDisplayName(cat, language);
        return {
          id: cat.id,
          name: categoryName,
          slug: cat.slug,
          url: buildCategoryUrl(cat, language, trackingString),
          articleCount: catArticles?.length || 0,
          description: language === 'en' && cat.description_en ? cat.description_en : language === 'fr' && cat.description_fr ? cat.description_fr : cat.description
        };
      });
      processedCategories = await Promise.all(categoryPromises);
      processedCategories = processedCategories.filter((cat)=>cat.articleCount > 0);
    }
    // FASE 4: Obtener contenido cruzado seguro
    console.log('🔗 Fetching SECURE cross content with countryTag...');
    const popularTags = await getPopularTagsFromArticles(supabase, countryTag, 6);
    let crossContent = {
      videos: [],
      properties: [],
      testimonials: [],
      faqs: []
    };
    if (popularTags.length > 0) {
      const tagIds = popularTags.map((t)=>t.id);
      const { data: crossContentData, error: crossContentError } = await supabase.rpc('get_all_content_by_tags', {
        tag_ids: tagIds,
        limit_per_type: 6
      });
      if (!crossContentError && crossContentData) {
        crossContent = await processRelatedContent(supabase, {
          data: crossContentData
        }, language, trackingString);
      }
    }
    // FASE 5: Procesar artículos
    const enrichedFeatured = (featuredArticles.data || []).map((article)=>({
        ...article,
        users: authorsMap[article.author_id] || null
      }));
    const enrichedRecent = (recentArticles.data || []).map((article)=>({
        ...article,
        users: authorsMap[article.author_id] || null
      }));
    const processedFeatured = enrichedFeatured.map((article)=>processArticle(article, language, trackingString));
    const processedRecent = enrichedRecent.map((article)=>processArticle(article, language, trackingString));
    // FASE 6: Estadísticas
    const stats = {
      totalArticles: processedRecent.length,
      totalCategories: processedCategories.length,
      totalViews: processedRecent.reduce((sum, article)=>sum + (article.views || 0), 0),
      averageReadTime: Math.round(processedRecent.reduce((sum, article)=>sum + (article.readTimeMinutes || 5), 0) / Math.max(processedRecent.length, 1)),
      publishedThisMonth: processedRecent.filter((article)=>{
        const publishedDate = new Date(article.publishedAt);
        const now = new Date();
        return publishedDate.getMonth() === now.getMonth() && publishedDate.getFullYear() === now.getFullYear();
      }).length,
      featuredCount: processedFeatured.length,
      categoriesWithContent: processedCategories.filter((cat)=>cat.articleCount > 0).length
    };
    const seo = {
      title: language === 'en' ? 'Real Estate Articles & Insights | CLIC Inmobiliaria' : language === 'fr' ? 'Articles & Insights Immobiliers | CLIC Inmobiliaria' : 'Artículos e Insights Inmobiliarios | CLIC Inmobiliaria',
      description: language === 'en' ? 'Discover the latest real estate trends, market insights, and expert advice from CLIC Inmobiliaria.' : language === 'fr' ? 'Découvrez les dernières tendances immobilières et conseils d\'experts de CLIC Inmobiliaria.' : 'Descubre las últimas tendencias inmobiliarias y consejos expertos de CLIC Inmobiliaria.',
      h1: language === 'en' ? 'Real Estate Articles & Market Insights' : language === 'fr' ? 'Articles Immobiliers & Insights du Marché' : 'Artículos Inmobiliarios e Insights del Mercado',
      h2: language === 'en' ? 'Expert insights to make informed property decisions' : language === 'fr' ? 'Insights d\'experts pour prendre des décisions immobilières éclairées' : 'Insights expertos para tomar decisiones inmobiliarias informadas',
      canonical_url: language === 'es' ? '/articulos' : `/${language}/articles`,
      breadcrumbs: [
        {
          name: getUIText('HOME', language),
          url: language === 'es' ? '/' : `/${language}/`
        },
        {
          name: getUIText('ARTICLES', language),
          url: language === 'es' ? '/articulos' : `/${language}/articles`
        }
      ]
    };
    console.log('🎯 SECURE articles main response ready:', {
      featuredArticles: processedFeatured.length,
      recentArticles: processedRecent.length,
      categories: processedCategories.length,
      crossContentVideos: crossContent.videos.length,
      crossContentProperties: crossContent.properties.length,
      countryProtected: true,
      countryTagId: countryTag.id
    });
    return {
      type: 'articles-main',
      pageType: 'articles-main',
      contentType: 'articles',
      seo,
      featuredArticles: processedFeatured,
      recentArticles: processedRecent,
      categories: processedCategories,
      stats,
      crossContent,
      debug: {
        handlerVersion: 'country-filtered-content-categories',
        authorsLoaded: Object.keys(authorsMap).length,
        originalArticlesCount: allArticles.length,
        crossContentTypes: Object.keys(crossContent).filter((k)=>crossContent[k]?.length > 0),
        countryTagId: countryTag.id,
        popularTagsUsed: popularTags.length,
        securityLevel: 'country-protected-strict'
      }
    };
  } catch (error) {
    console.error('❌ Error in country-filtered handleArticlesMain:', error);
    return createFallbackResponse(language, trackingString, error.message);
  }
}
async function handleArticlesCategory(params) {
  const { supabase, language, contentSegments, trackingString, baseData } = params;
  const countryTag = baseData?.countryTag;
  if (contentSegments.length === 0) {
    throw new Error('Category slug required');
  }
  if (!countryTag?.id) {
    throw new Error('Country context required - missing from baseData');
  }
  const categorySlug = contentSegments[0];
  console.log('📂 Handling articles category with country filter:', categorySlug);
  // Construir el slug completo según el idioma
  let fullSlug;
  if (language === 'en') {
    fullSlug = `articles/${categorySlug}`;
  } else if (language === 'fr') {
    fullSlug = `articles/${categorySlug}`;
  } else {
    fullSlug = `articulos/${categorySlug}`;
  }
  const slugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
  // Buscar en content_categories
  const { data: categoryData } = await supabase.from('content_categories').select('*').eq(slugField, fullSlug).eq('content_type', 'articles').eq('active', true).eq('country_code', baseData?.countryCode || 'DOM').single();
  if (!categoryData) {
    throw new Error(`Article category "${categorySlug}" not found for this country`);
  }
  // PASO 1: Obtener artículos del país (como siempre)
  const { data: articlesByCountry } = await supabase.from('content_tags').select('content_id').eq('content_type', 'article').eq('tag_id', countryTag.id);
  const countryArticleIds = (articlesByCountry || []).map((ct)=>ct.content_id);
  if (countryArticleIds.length === 0) {
    return {
      type: 'articles-category',
      pageType: 'articles-category',
      contentType: 'articles',
      seo: buildCategorySEOFromContentCategory(categoryData, language, fullSlug),
      category: {
        id: categoryData.id,
        name: getCategoryDisplayName(categoryData, language),
        slug: categoryData.slug
      },
      articles: [],
      crossContent: {
        videos: [],
        properties: [],
        testimonials: [],
        faqs: []
      },
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
  // PASO 2: Buscar artículos que cumplan AMBAS condiciones:
  // - Pertenecen al país (countryArticleIds)
  // - Pertenecen a la categoría (category_id)
  const { data: articles, count } = await supabase.from('articles').select(`
      id, title, excerpt, slug, slug_en, slug_fr, featured_image, published_at, 
      views, read_time, subtitle, content_en, content_fr, author_id
    `, {
    count: 'exact'
  }).in('id', countryArticleIds) // ← FILTRO POR PAÍS
  .eq('category_id', categoryData.id) // ← FILTRO POR CATEGORÍA
  .eq('status', 'published').order('published_at', {
    ascending: false
  }).range(offset, offset + limit - 1);
  if (!articles || articles.length === 0) {
    return {
      type: 'articles-category',
      pageType: 'articles-category',
      contentType: 'articles',
      seo: buildCategorySEOFromContentCategory(categoryData, language, fullSlug),
      category: {
        id: categoryData.id,
        name: getCategoryDisplayName(categoryData, language),
        slug: categoryData.slug
      },
      articles: [],
      crossContent: {
        videos: [],
        properties: [],
        testimonials: [],
        faqs: []
      },
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
  // Resto del código igual (autores, crossContent, procesamiento)
  const authorIds = [
    ...new Set(articles.map((a)=>a.author_id).filter(Boolean))
  ];
  let authorsMap = {};
  if (authorIds.length > 0) {
    const { data: authors } = await supabase.from('users').select('id, first_name, last_name, profile_photo_url, slug, position').in('id', authorIds);
    if (authors) {
      authorsMap = authors.reduce((acc, author)=>{
        acc[author.id] = author;
        return acc;
      }, {});
    }
  }
  const categoryTags = [
    countryTag
  ].filter(Boolean);
  let crossContent = {
    videos: [],
    properties: [],
    testimonials: [],
    faqs: []
  };
  if (categoryTags.length > 0) {
    const tagIds = categoryTags.map((t)=>t.id);
    const { data: categoryCrossContentData, error } = await supabase.rpc('get_all_content_by_tags', {
      tag_ids: tagIds,
      limit_per_type: 4
    });
    if (!error && categoryCrossContentData) {
      crossContent = await processRelatedContent(supabase, {
        data: categoryCrossContentData
      }, language, trackingString);
    }
  }
  const enrichedArticles = articles.map((article)=>({
      ...article,
      users: authorsMap[article.author_id] || null
    }));
  const processedArticles = enrichedArticles.map((article)=>processArticle(article, language, trackingString));
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
  return {
    type: 'articles-category',
    pageType: 'articles-category',
    contentType: 'articles',
    seo,
    category: {
      id: categoryData.id,
      name: getCategoryDisplayName(categoryData, language),
      slug: categoryData.slug
    },
    articles: processedArticles,
    crossContent,
    pagination,
    debug: {
      handlerVersion: 'country-filtered-content-categories',
      categoryId: categoryData.id,
      countryTagId: countryTag.id,
      countryArticleIds: countryArticleIds.length,
      totalArticlesInCategory: count || 0,
      securityLevel: 'country-protected-strict'
    }
  };
}
// Helper para obtener el nombre de categoría según idioma
function getCategoryDisplayName(category, language) {
  if (language === 'en' && category.display_name_en) {
    return category.display_name_en;
  }
  if (language === 'fr' && category.display_name_fr) {
    return category.display_name_fr;
  }
  return category.display_name;
}
// Helper para construir SEO desde content_categories
function buildCategorySEOFromContentCategory(categoryData, language, fullSlug) {
  const categoryName = getCategoryDisplayName(categoryData, language);
  return {
    title: language === 'en' ? `${categoryName} Articles | CLIC Inmobiliaria` : language === 'fr' ? `Articles ${categoryName} | CLIC Inmobiliaria` : `Artículos de ${categoryName} | CLIC Inmobiliaria`,
    description: language === 'en' ? `Read the latest ${categoryName.toLowerCase()} articles and insights from CLIC Inmobiliaria real estate experts.` : language === 'fr' ? `Lisez les derniers articles et insights ${categoryName.toLowerCase()} des experts immobiliers CLIC Inmobiliaria.` : `Lee los últimos artículos e insights de ${categoryName.toLowerCase()} de los expertos inmobiliarios de CLIC Inmobiliaria.`,
    h1: `${categoryName} - ${getUIText('ARTICLES', language)}`,
    h2: language === 'en' ? `Expert insights on ${categoryName.toLowerCase()}` : language === 'fr' ? `Insights d'experts sur ${categoryName.toLowerCase()}` : `Insights expertos sobre ${categoryName.toLowerCase()}`,
    canonical_url: `/${fullSlug}`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: getUIText('ARTICLES', language),
        url: language === 'es' ? '/articulos' : `/${language}/articles`
      },
      {
        name: categoryName,
        url: `/${fullSlug}`
      }
    ]
  };
}
async function handleSingleArticle(params) {
  const { supabase, language, contentSegments, trackingString, baseData } = params;
  const countryTag = baseData?.countryTag;
  if (contentSegments.length < 2) {
    throw new Error('Category and article slug required');
  }
  if (!countryTag?.id) {
    throw new Error('Country context required - missing from baseData');
  }
  const categorySlug = contentSegments[0];
  const articleSlug = contentSegments[1];
  console.log('📄 Handling single article with country filter and enhanced relations:', categorySlug, articleSlug);
  const requestedPath = `articulos/${categorySlug}/${articleSlug}`;
  const slugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
  // Buscar artículo con todos los campos
  const { data: article, error: articleError } = await supabase.from('articles').select('*').eq(slugField, requestedPath).eq('status', 'published').single();
  if (!article) {
    // Código para caso de error (no modificado)
    // ...
    return {
      type: 'articles-single-404'
    };
  }
  // Obtener autor del artículo (no modificado)
  let authorData = null;
  if (article.author_id) {
    const { data: author } = await supabase.from('users').select('id, first_name, last_name, profile_photo_url, slug, position, country_code, email, phone, biography').eq('id', article.author_id).single();
    authorData = author;
  }
  // Obtener tags del artículo (código existente)
  const articleTags = await getArticleSpecificTags(supabase, article.id, countryTag);
  // Obtener categoría del artículo - MOVIDO AQUÍ PARA RESOLVER EL ERROR
  const fullSlug = language === 'en' ? `articles/${categorySlug}` : language === 'fr' ? `articles/${categorySlug}` : `articulos/${categorySlug}`;
  const categorySlugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
  const { data: categoryData } = await supabase.from('content_categories').select('*').eq(categorySlugField, fullSlug).eq('content_type', 'articles').eq('active', true).single();
  // Definir categoryInfo ANTES de usarlo
  let categoryInfo;
  if (categoryData) {
    categoryInfo = {
      id: categoryData.id,
      name: getCategoryDisplayName(categoryData, language),
      slug: categoryData.slug,
      slug_en: categoryData.slug_en,
      slug_fr: categoryData.slug_fr
    };
  } else {
    categoryInfo = {
      name: categorySlug.replace(/-/g, ' ').replace(/\b\w/g, (l)=>l.toUpperCase()),
      slug: categorySlug
    };
  }
  // ======================================================================
  // FUNCIÓN AUXILIAR PARA MANEJAR JSON DE FORMA SEGURA
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
  // PROCESAMIENTO DE CONTENIDO PRECARGADO
  // ======================================================================
  // Procesar propiedades similares precargadas
  let preloadedSimilarProperties = [];
  const propsData = safeGetJsonField(article, 'similar_properties');
  if (propsData && Array.isArray(propsData)) {
    preloadedSimilarProperties = propsData;
    console.log(`Found ${preloadedSimilarProperties.length} preloaded similar properties`);
  }
  // Procesar videos relacionados precargados
  let preloadedRelatedVideos = [];
  const relatedVideosData = safeGetJsonField(article, 'related_videos');
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
  const articlesData = safeGetJsonField(article, 'related_articles');
  if (articlesData && Array.isArray(articlesData)) {
    preloadedRelatedArticles = articlesData.map((relArticle)=>({
        id: relArticle.id,
        title: relArticle.title,
        slug: relArticle.slug,
        excerpt: relArticle.excerpt,
        category: relArticle.category,
        read_time: relArticle.read_time || 5,
        featuredImage: relArticle.featured_image,
        weight: relArticle.weight || 1,
        order: relArticle.order || 1,
        relation_type: relArticle.relation_type || 'related'
      })).sort((a, b)=>a.order - b.order);
    console.log(`Processed ${preloadedRelatedArticles.length} preloaded related articles`);
  }
  // ======================================================================
  // OBTENCIÓN DE CONTENIDO RELACIONADO POR TAGS
  // ======================================================================
  // Variables para almacenar contenidos relacionados
  let relatedProperties = [];
  let relatedVideos = [];
  let additionalRelatedArticles = [];
  // Solo buscar contenido relacionado si hay tags
  if (articleTags.length > 0) {
    try {
      // Obtener IDs de los tags
      const tagIds = articleTags.map((tag)=>tag.id);
      // Incluir el tag del país para filtrado correcto
      if (countryTag?.id) {
        // Verificar que no esté ya incluido
        if (!tagIds.includes(countryTag.id)) {
          tagIds.push(countryTag.id);
        }
      }
      console.log(`🔍 Buscando contenido relacionado para ${tagIds.length} tags (incluyendo país)`);
      // Una sola llamada para obtener todo el contenido relacionado
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
        const articleResults = contentResult.filter((item)=>item.content_type === 'article' && item.content_id !== article.id).sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags);
        const videoResults = contentResult.filter((item)=>item.content_type === 'video').sort((a, b)=>b.total_weight - a.total_weight || b.matched_tags - a.matched_tags);
        console.log(`Found: ${propertyResults.length} properties, ${articleResults.length} articles, ${videoResults.length} videos`);
        // Procesar propiedades relacionadas (si hay resultados)
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
        // Procesar artículos relacionados (si hay resultados)
        if (articleResults.length > 0) {
          const articleIds = articleResults.slice(0, 6).map((item)=>item.content_id);
          if (articleIds.length > 0) {
            const { data: articlesData } = await supabase.from('articles').select(`
                id, title, excerpt, slug, slug_en, slug_fr, featured_image, 
                published_at, views, read_time, content_en, content_fr,
                users:author_id(first_name, last_name, profile_photo_url, slug, position)
              `).in('id', articleIds).eq('status', 'published').neq('id', article.id);
            if (articlesData && articlesData.length > 0) {
              additionalRelatedArticles = articlesData.map((relArticle)=>{
                // Procesar contenido multilingüe
                let articleTitle = relArticle.title || '';
                let articleExcerpt = relArticle.excerpt || '';
                const articleContent = processMultilingualContent(relArticle, language);
                if (articleContent.title) articleTitle = articleContent.title;
                if (articleContent.excerpt) articleExcerpt = articleContent.excerpt;
                // Determinar slug y URL
                let articleSlug = relArticle.slug || '';
                if (language === 'en' && relArticle.slug_en) articleSlug = relArticle.slug_en;
                if (language === 'fr' && relArticle.slug_fr) articleSlug = relArticle.slug_fr;
                let articleUrl = articleSlug;
                if (language === 'en') articleUrl = `en/${articleSlug}`;
                if (language === 'fr') articleUrl = `fr/${articleSlug}`;
                // Información del autor
                const author = {
                  name: relArticle.users ? `${relArticle.users.first_name || ''} ${relArticle.users.last_name || ''}`.trim() : getUIText('TEAM_CLIC', language),
                  avatar: relArticle.users?.profile_photo_url || '/images/team/clic-experts.jpg',
                  position: relArticle.users?.position || '',
                  slug: relArticle.users?.slug || null
                };
                return {
                  id: relArticle.id,
                  title: articleTitle,
                  excerpt: articleExcerpt,
                  featuredImage: relArticle.featured_image,
                  publishedAt: relArticle.published_at,
                  views: relArticle.views || 0,
                  readTime: `${relArticle.read_time || 5} ${getUIText('MINUTES_READ', language)}`,
                  readTimeMinutes: relArticle.read_time || 5,
                  url: `/${articleUrl}${trackingString || ''}`,
                  slug: articleSlug,
                  author
                };
              });
              console.log(`Processed ${additionalRelatedArticles.length} related articles`);
            }
          }
        }
        // Procesar videos relacionados (si hay resultados)
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
              relatedVideos = videosData.map((relVideo)=>{
                // Procesar contenido multilingüe
                let videoTitle = relVideo.title || '';
                let videoDescription = relVideo.description || '';
                const videoContent = processMultilingualContent(relVideo, language);
                if (videoContent.title) videoTitle = videoContent.title;
                if (videoContent.description) videoDescription = videoContent.description;
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
                  slug: relVideo.users?.slug || null
                };
                return {
                  id: relVideo.id,
                  title: videoTitle,
                  description: videoDescription,
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
  // COMBINACIÓN DE CONTENIDO PRECARGADO Y DINÁMICO
  // ======================================================================
  // Combinar propiedades relacionadas, evitando duplicados
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
  relatedVideos.forEach((video)=>{
    if (!seenVideoIds.has(video.id)) {
      finalRelatedVideos.push(video);
      seenVideoIds.add(video.id);
    }
  });
  const limitedRelatedVideos = finalRelatedVideos.slice(0, 6);
  // Preparar artículos relacionados - AHORA categoryInfo está definido
  let relatedArticles = [];
  // Obtener artículos relacionados del código original
  if (categoryInfo.id) {
    // Obtener artículos del país que también pertenezcan a esta categoría
    const { data: articlesByCountry } = await supabase.from('content_tags').select('content_id').eq('content_type', 'article').eq('tag_id', countryTag.id);
    const countryArticleIds = (articlesByCountry || []).map((ct)=>ct.content_id);
    const { data: relatedData } = await supabase.from('articles').select(`
        id, title, excerpt, slug, slug_en, slug_fr, featured_image, published_at, 
        views, read_time, subtitle, content_en, content_fr, author_id
      `).in('id', countryArticleIds).eq('category_id', categoryInfo.id).neq('id', article.id).eq('status', 'published').order('published_at', {
      ascending: false
    }).limit(3);
    if (relatedData?.length > 0) {
      const relatedAuthorIds = [
        ...new Set(relatedData.map((a)=>a.author_id).filter(Boolean))
      ];
      let relatedAuthorsMap = {};
      if (relatedAuthorIds.length > 0) {
        const { data: relatedAuthors } = await supabase.from('users').select('id, first_name, last_name, profile_photo_url, slug, email, phone, position').in('id', relatedAuthorIds);
        if (relatedAuthors) {
          relatedAuthorsMap = relatedAuthors.reduce((acc, author)=>{
            acc[author.id] = author;
            return acc;
          }, {});
        }
      }
      const enrichedRelated = relatedData.map((article)=>({
          ...article,
          users: relatedAuthorsMap[article.author_id] || null
        }));
      relatedArticles = enrichedRelated.map((article)=>processArticle(article, language, trackingString));
    }
  }
  // Combinar los artículos relacionados precargados con los encontrados por tags
  const finalRelatedArticles = [];
  const seenArticleIds = new Set();
  // Primero añadir artículos precargados
  preloadedRelatedArticles.forEach((relArticle)=>{
    if (!seenArticleIds.has(relArticle.id)) {
      finalRelatedArticles.push(relArticle);
      seenArticleIds.add(relArticle.id);
    }
  });
  // Luego añadir artículos por categoría (del código original)
  relatedArticles.forEach((relArticle)=>{
    if (!seenArticleIds.has(relArticle.id)) {
      finalRelatedArticles.push(relArticle);
      seenArticleIds.add(relArticle.id);
    }
  });
  // Finalmente añadir artículos encontrados por tags
  additionalRelatedArticles.forEach((relArticle)=>{
    if (!seenArticleIds.has(relArticle.id)) {
      finalRelatedArticles.push(relArticle);
      seenArticleIds.add(relArticle.id);
    }
  });
  // Limitar a 6 artículos relacionados
  const limitedRelatedArticles = finalRelatedArticles.slice(0, 6);
  // Procesar el artículo principal
  const enrichedArticle = {
    ...article,
    users: authorData
  };
  const processedArticle = processArticle(enrichedArticle, language, trackingString);
  // Incrementar vistas
  await supabase.from('articles').update({
    views: (article.views || 0) + 1
  }).eq('id', article.id);
  // Construir SEO
  const seo = {
    title: `${processedArticle.title} | CLIC Inmobiliaria`,
    description: processedArticle.excerpt,
    h1: processedArticle.title,
    h2: processedArticle.subtitle || categoryInfo.name,
    canonical_url: processedArticle.url?.replace(trackingString, ''),
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: getUIText('ARTICLES', language),
        url: language === 'es' ? '/articulos' : `/${language}/articles`
      },
      {
        name: categoryInfo.name,
        url: buildCategoryUrl({
          slug: categoryInfo.slug,
          slug_en: categoryData?.slug_en,
          slug_fr: categoryData?.slug_fr
        }, language, '') // ← SIN trackingString
      },
      {
        name: processedArticle.title,
        url: processedArticle.url?.replace(trackingString, '') // ← Remover trackingString
      }
    ]
  };
  // Respuesta final enriquecida
  return {
    type: 'articles-single',
    pageType: 'articles-single',
    contentType: 'articles',
    found: true,
    seo,
    article: processedArticle,
    relatedArticles: limitedRelatedArticles,
    category: categoryInfo,
    crossContent: {
      videos: limitedRelatedVideos,
      properties: limitedRelatedProperties
    },
    debug: {
      handlerVersion: 'enhanced-content-relations',
      articleId: article.id,
      countryTagId: countryTag.id,
      articleTagsUsed: articleTags.length,
      hasAuthor: !!authorData,
      relatedArticlesCount: limitedRelatedArticles.length,
      relatedVideosCount: limitedRelatedVideos.length,
      relatedPropertiesCount: limitedRelatedProperties.length,
      uniqueContentCounts: {
        uniquePropertiesCount: seenPropertyIds.size,
        uniqueVideosCount: seenVideoIds.size,
        uniqueArticlesCount: seenArticleIds.size
      },
      securityLevel: 'country-protected-strict'
    }
  };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function processArticle(article, language, trackingString) {
  let processedTitle = article.title;
  let processedExcerpt = article.excerpt;
  let processedSubtitle = article.subtitle;
  let processedContent = article.content;
  const multilingualContent = processMultilingualContent(article, language);
  if (multilingualContent.title) processedTitle = multilingualContent.title;
  if (multilingualContent.excerpt) processedExcerpt = multilingualContent.excerpt;
  if (multilingualContent.subtitle) processedSubtitle = multilingualContent.subtitle;
  if (multilingualContent.content) processedContent = multilingualContent.content;
  const url = buildArticleUrl(article, language, trackingString);
  let author;
  if (article.users) {
    author = {
      name: `${article.users.first_name || ''} ${article.users.last_name || ''}`.trim() || getUIText('TEAM_CLIC', language),
      avatar: article.users.profile_photo_url || '/images/team/clic-experts.jpg',
      slug: article.users.slug || null,
      position: article.users.position || null,
      country: article.users.country_code || 'DO',
      bio: article.users.biography || null,
      email: article.users.email || null,
      phone: article.users.phone || null,
      whatsapp: article.users.phone || null
    };
  } else {
    author = {
      name: getUIText('TEAM_CLIC', language),
      avatar: '/images/team/clic-experts.jpg',
      slug: null,
      position: null,
      country: 'DO'
    };
  }
  let processedTags = [];
  if (article.tags && Array.isArray(article.tags)) {
    processedTags = article.tags.map((tag)=>{
      let parsedTag = tag;
      if (typeof tag === 'string') {
        try {
          parsedTag = JSON.parse(tag);
        } catch (e) {
          return null;
        }
      }
      return {
        id: parsedTag.id,
        name: parsedTag.display_name || parsedTag.name,
        slug: parsedTag.slug,
        color: parsedTag.color,
        category: parsedTag.category
      };
    }).filter(Boolean);
  }
  return {
    id: article.id,
    title: processedTitle,
    excerpt: processedExcerpt,
    subtitle: processedSubtitle,
    content: processedContent,
    featuredImage: article.featured_image,
    publishedAt: article.published_at,
    views: article.views || 0,
    readTime: `${article.read_time || 5} ${getUIText('MINUTES_READ', language)}`,
    readTimeMinutes: article.read_time || 5,
    featured: article.featured || false,
    url,
    slug: article.slug,
    slug_en: article.slug_en,
    slug_fr: article.slug_fr,
    author,
    tags: processedTags,
    category: article.category,
    language: article.language || language
  };
}
function createFallbackResponse(language, trackingString, errorMessage = null) {
  return {
    type: 'articles-main',
    pageType: 'articles-main',
    contentType: 'articles',
    seo: {
      title: language === 'en' ? 'Real Estate Articles | CLIC Inmobiliaria' : language === 'fr' ? 'Articles Immobiliers | CLIC Inmobiliaria' : 'Artículos Inmobiliarios | CLIC Inmobiliaria',
      description: 'Discover real estate insights and expert advice.',
      canonical_url: language === 'es' ? '/articulos' : `/${language}/articles`,
      breadcrumbs: [
        {
          name: getUIText('HOME', language),
          url: language === 'es' ? '/' : `/${language}/`
        },
        {
          name: getUIText('ARTICLES', language),
          url: language === 'es' ? '/articulos' : `/${language}/articles`
        }
      ]
    },
    featuredArticles: [],
    recentArticles: [],
    categories: [],
    crossContent: {
      videos: [],
      properties: [],
      testimonials: [],
      faqs: []
    },
    stats: {
      totalArticles: 0,
      totalCategories: 0,
      totalViews: 0,
      averageReadTime: 0,
      publishedThisMonth: 0,
      featuredCount: 0,
      categoriesWithContent: 0
    },
    error: {
      message: 'No articles data available',
      details: errorMessage,
      fallback: true
    }
  };
}
// ============================================================================
// MAIN EXPORT HANDLER
// ============================================================================
export async function handleArticles(params) {
  try {
    const { contentSegments } = params;
    if (contentSegments.length === 0) {
      return await handleArticlesMain(params);
    } else if (contentSegments.length === 1) {
      return await handleArticlesCategory(params);
    } else if (contentSegments.length === 2) {
      return await handleSingleArticle(params);
    } else {
      throw new Error('Invalid article path structure');
    }
  } catch (error) {
    console.error('Error in country-filtered articles handler:', error);
    throw error;
  }
}
