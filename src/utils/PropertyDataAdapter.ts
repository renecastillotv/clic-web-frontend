// src/utils/PropertyDataAdapter.ts
export interface EdgeFunctionResponse {
  properties: any[];
  related_content: any[];
  carousels: any[];
  hot_items: {
    properties: any[];
    cities: any[];
    sectors: any[];
    agents: any[];
    projects: any[];
    custom: any[];
  };
  seo: any;
  pagination: any;
  [key: string]: any;
}

export interface AdaptedPropertyData {
  properties: any[];
  relatedContent: {
    articles: any[];
    videos: any[];
    faqs: any[];
    carousels: any[];
    blog_posts: any[];
    media_gallery: any[];
  };
  content: {
    faqs: any[];
    articles: any[];
  };
  featuredProperties: any[];
  hotItems: any;
  seo: any;
  pagination: any;
  searchResults: {
    properties: any[];
    pagination: any;
    tags: any[];
  };
  [key: string]: any;
}

export class PropertyDataAdapter {
  
  /**
   * Adapta la respuesta de la edge function al formato esperado por los componentes
   */
  static adapt(edgeResponse: EdgeFunctionResponse): AdaptedPropertyData {
    console.log('🔄 Adaptando datos de edge function...');
    
    // Categorizar related_content por tipo
    const categorizedContent = this.categorizeRelatedContent(edgeResponse.related_content || []);
    
    // Extraer propiedades destacadas de hot_items
    const featuredProperties = this.extractFeaturedProperties(edgeResponse.hot_items);
    
    // Procesar carouseles
    const processedCarousels = this.processCarousels(edgeResponse.carousels || []);
    
    const adapted: AdaptedPropertyData = {
      // Datos principales
      properties: edgeResponse.properties || [],
      
      // Estructura que esperan los componentes
      relatedContent: {
        articles: categorizedContent.articles,
        videos: categorizedContent.videos,
        faqs: categorizedContent.faqs,
        carousels: processedCarousels,
        blog_posts: categorizedContent.blog_posts,
        media_gallery: categorizedContent.media_gallery
      },
      
      // Estructura alternativa para FAQs
      content: {
        faqs: categorizedContent.faqs,
        articles: categorizedContent.articles
      },
      
      // Propiedades destacadas
      featuredProperties: featuredProperties,
      
      // Hot items procesados
      hotItems: this.processHotItems(edgeResponse.hot_items),
      
      // Datos de búsqueda en formato esperado
      searchResults: {
        properties: edgeResponse.properties || [],
        pagination: edgeResponse.pagination,
        tags: edgeResponse.tags || []
      },
      
      // Pasar datos originales
      seo: edgeResponse.seo,
      pagination: edgeResponse.pagination,
      tags: edgeResponse.tags,
      language: edgeResponse.language,
      country: edgeResponse.country,
      
      // Mantener compatibilidad con datos originales
      ...edgeResponse
    };
    
    console.log('✅ Datos adaptados:', {
      articles: adapted.relatedContent.articles.length,
      videos: adapted.relatedContent.videos.length,
      faqs: adapted.relatedContent.faqs.length,
      carousels: adapted.relatedContent.carousels.length,
      featuredProperties: adapted.featuredProperties.length,
      totalProperties: adapted.properties.length
    });
    
    return adapted;
  }
  
  /**
   * Categoriza el array related_content por content_type
   */
  private static categorizeRelatedContent(relatedContent: any[]) {
    console.log('📊 Categorizando related_content:', relatedContent.length, 'items');
    
    const categorized = {
      articles: [] as any[],
      videos: [] as any[],
      faqs: [] as any[],
      blog_posts: [] as any[],
      media_gallery: [] as any[]
    };
    
    relatedContent.forEach(item => {
      switch (item.content_type) {
        case 'article':
          categorized.articles.push(this.normalizeArticle(item));
          break;
          
        case 'video':
          categorized.videos.push(this.normalizeVideo(item));
          break;
          
        case 'faq':
          categorized.faqs.push(this.normalizeFAQ(item));
          break;
          
        case 'blog_post':
        case 'blog':
          categorized.blog_posts.push(this.normalizeArticle(item));
          break;
          
        case 'media':
        case 'gallery':
          categorized.media_gallery.push(item);
          break;
          
        default:
          console.warn('⚠️ Tipo de contenido desconocido:', item.content_type);
          // Intentar inferir el tipo por campos disponibles
          if (item.question && item.answer) {
            categorized.faqs.push(this.normalizeFAQ(item));
          } else if (item.video_slug || item.thumbnail || item.duration) {
            categorized.videos.push(this.normalizeVideo(item));
          } else if (item.title && (item.excerpt || item.content)) {
            categorized.articles.push(this.normalizeArticle(item));
          }
      }
    });
    
    console.log('📈 Contenido categorizado:', {
      articles: categorized.articles.length,
      videos: categorized.videos.length,
      faqs: categorized.faqs.length,
      blog_posts: categorized.blog_posts.length,
      media_gallery: categorized.media_gallery.length
    });
    
    return categorized;
  }
  
  /**
   * Normaliza un artículo al formato esperado por RelatedArticles
   */
  private static normalizeArticle(item: any) {
    return {
      id: item.id,
      title: item.title,
      excerpt: item.excerpt || item.description || item.content?.substring(0, 200),
      slug: item.slug,
      slug_en: item.slug_en,
      slug_fr: item.slug_fr,
      featuredImage: item.featured_image || item.image || item.thumbnail,
      featured_image: item.featured_image || item.image || item.thumbnail,
      url: item.url,
      author: item.author || { 
        name: 'Equipo CLIC', 
        avatar: '/images/team/clic-experts.jpg' 
      },
      publishedAt: item.published_at || item.date || new Date().toISOString(),
      published_at: item.published_at || item.date || new Date().toISOString(),
      readTime: item.read_time || '8 min',
      read_time: item.read_time || '8 min',
      category: item.category || 'Artículos',
      views: item.views,
      featured: item.featured === true,
      // Campos de ordenamiento de la API
      total_weight: item.total_weight || 0,
      content_priority: item.content_priority || 'default',
      sort_order: item.sort_order || 0
    };
  }
  
  /**
   * Normaliza un video al formato esperado por VideoGallery
   */
  private static normalizeVideo(item: any) {
    return {
      id: item.id,
      title: item.title,
      description: item.description || item.summary,
      thumbnail: item.thumbnail || item.image || item.featured_image,
      duration: item.duration || '10:00',
      views: item.views,
      category: item.category || 'videos',
      videoId: item.video_id || item.youtube_id,
      video_id: item.video_id || item.youtube_id,
      videoSlug: item.video_slug || item.slug,
      video_slug: item.video_slug || item.slug,
      slug: item.slug,
      slug_en: item.slug_en,
      slug_fr: item.slug_fr,
      url: item.url,
      featured: item.featured === true,
      // Campos de ordenamiento de la API
      total_weight: item.total_weight || 0,
      content_priority: item.content_priority || 'default',
      sort_order: item.sort_order || 0
    };
  }
  
  /**
   * Normaliza un FAQ al formato esperado por DynamicFAQs
   */
  private static normalizeFAQ(item: any) {
    return {
      id: item.id || `faq-${Date.now()}-${Math.random()}`,
      question: item.question || item.title,
      answer: item.answer || item.content || item.description,
      category: item.category || 'general',
      tags: item.tags || []
    };
  }
  
  /**
   * Procesa los carouseles para el formato esperado
   */
  private static processCarousels(carousels: any[]) {
    return carousels.map(carousel => ({
      title: carousel.title || carousel.name,
      subtitle: carousel.subtitle || carousel.description,
      properties: carousel.properties || [],
      viewAllLink: carousel.viewAllLink || carousel.url || '#',
      theme: carousel.theme || 'default',
      group_id: carousel.group_id,
      icon: carousel.icon,
      color: carousel.color,
      carousel_url: carousel.carousel_url
    }));
  }
  
  /**
   * Extrae propiedades destacadas de hot_items
   */
  private static extractFeaturedProperties(hotItems: any) {
    if (!hotItems) return [];
    
    return [
      ...(hotItems.properties || []),
      ...(hotItems.projects || [])
    ].slice(0, 8);
  }
  
  /**
   * Procesa hot_items manteniendo la estructura original
   */
  private static processHotItems(hotItems: any) {
    return hotItems || {
      properties: [],
      cities: [],
      sectors: [],
      agents: [],
      projects: [],
      custom: []
    };
  }
  
  /**
   * Valida que los datos adaptados tengan la estructura mínima requerida
   */
  static validate(adaptedData: AdaptedPropertyData): boolean {
    const required = [
      'properties',
      'relatedContent',
      'content',
      'searchResults'
    ];
    
    const missing = required.filter(key => !adaptedData[key]);
    
    if (missing.length > 0) {
      console.error('❌ Faltan campos requeridos:', missing);
      return false;
    }
    
    return true;
  }
  
  /**
   * Método de utilidad para debug
   */
  static debug(edgeResponse: EdgeFunctionResponse) {
    console.log('🔍 Debug de edge function response:', {
      mainKeys: Object.keys(edgeResponse),
      relatedContentTypes: edgeResponse.related_content?.map(item => item.content_type),
      carouselsCount: edgeResponse.carousels?.length || 0,
      hotItemsCategories: edgeResponse.hot_items ? Object.keys(edgeResponse.hot_items) : [],
      propertiesCount: edgeResponse.properties?.length || 0
    });
  }
}