// src/data/providers/propertyListProvider.ts
// Provider con debug mejorado para identificar el problema

interface EdgeFunctionResponse {
  country?: any;
  language?: string;
  tags?: Array<{
    id: string | number;
    slug: string;
    slug_en?: string;
    slug_fr?: string;
    category?: string;
    display_name?: string;
    display_name_en?: string;
    display_name_fr?: string;
  }>;
  page_type?: string;
  total_properties?: number;
  seo?: {
    title?: string;
    description?: string;
    h1?: string;
    h2?: string;
    canonical_url?: string;
    breadcrumbs?: Array<{
      name: string;
      url: string;
    }>;
    [key: string]: any;
  };
  properties?: Array<{
    id: string | number;
    code?: string;
    name: string;
    description?: string;
    sale_price?: number;
    sale_currency?: string;
    rental_price?: number;
    rental_currency?: string;
    temp_rental_price?: number;
    temp_rental_currency?: string;
    furnished_rental_price?: number;
    furnished_rental_currency?: string;
    bedrooms?: number;
    bathrooms?: number;
    built_area?: number;
    is_project?: boolean;
    main_image_url?: string;
    gallery_images_url?: string | string[];
    sector?: string;
    city?: string;
    category?: string;
    url?: string;
    slug_url?: string;
  }>;
  pagination?: {
    page?: number;
    limit?: number;
    total_properties?: number;
    total_pages?: number;
    has_next_page?: boolean;
    has_prev_page?: boolean;
  };
  related_content?: any[];
  carousels?: any[];
  hot_items?: any;
  special_page?: boolean;
  special_type?: string;
  custom_list_info?: any;
  property?: any;
  // Campos adicionales que podría estar devolviendo
  error?: string;
  [key: string]: any;
}

interface PropertyListProperty {
  id?: string | number;
  slug: string;
  titulo: string;
  precio: string;
  imagen: string;
  imagenes?: string[];
  sector: string;
  habitaciones: number;
  banos: number;
  metros?: number;
  tipo?: string;
  url?: string;
  code?: string;
  isFormattedByProvider?: boolean;
  is_project?: boolean;
}

interface PropertyListResponse {
  type: 'property-list';
  listings: PropertyListProperty[];
  meta: {
    title: string;
    description: string;
  };
  totalCount?: number;
  currentPage?: number;
  totalPages?: number;
  itemsPerPage?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
}

// API de Neon en Vercel (no requiere autenticación)
const BACKEND_URL = 'https://clic-api-neon.vercel.app';

function isValidPropertySegments(segments: string[]): boolean {
  if (!segments || segments.length === 0) return false;
  
  const invalidSegments = [
    'images', 'img', 'assets', 'static', 'public', 'favicon.ico',
    'css', 'js', 'fonts', '_astro', 'api', 'admin', 'robots.txt',
    'sitemap.xml', 'manifest.json', 'sw.js', '.well-known'
  ];
  
  const fileExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
    '.css', '.js', '.json', '.xml', '.txt', '.pdf', '.zip',
    '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3'
  ];
  
  for (const segment of segments) {
    const segmentLower = segment.toLowerCase();
    
    if (invalidSegments.includes(segmentLower)) {
      return false;
    }
    
    if (fileExtensions.some(ext => segmentLower.endsWith(ext))) {
      return false;
    }
    
    if (segment.length < 2 && segments.length === 1) {
      return false;
    }
  }
  
  return true;
}

async function callEdgeFunction(segments: string[], searchParams?: URLSearchParams): Promise<EdgeFunctionResponse> {
  const apiPath = segments.length > 0 ? `/${segments.join('/')}` : '/';
  let apiUrl = `${BACKEND_URL}${apiPath}`;
  
  if (searchParams && searchParams.toString()) {
    apiUrl += `?${searchParams.toString()}`;
  }
  
  console.log('🔗 Calling edge function:', apiUrl);

  // La API de Neon no requiere autenticación
  const response = await fetch(apiUrl, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'CLIC-Inmobiliaria/1.0'
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ HTTP Error:', response.status, response.statusText);
    console.error('❌ Error body:', errorText);
    throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // DEBUG COMPLETO de la respuesta
  console.log('📡 FULL Edge Function Response:', JSON.stringify(data, null, 2));
  console.log('🔍 Response Analysis:', {
    // Campos principales
    page_type: data.page_type,
    language: data.language,
    country: !!data.country,
    total_properties: data.total_properties,
    
    // Arrays
    tags_count: data.tags?.length || 0,
    properties_count: data.properties?.length || 0,
    related_content_count: data.related_content?.length || 0,
    carousels_count: data.carousels?.length || 0,
    
    // Objetos
    has_pagination: !!data.pagination,
    has_seo: !!data.seo,
    has_hot_items: !!data.hot_items,
    
    // Casos especiales
    special_page: data.special_page,
    special_type: data.special_type,
    has_custom_list_info: !!data.custom_list_info,
    has_property: !!data.property,
    
    // Error
    has_error: !!data.error,
    error_message: data.error,
    
    // Todos los campos
    all_keys: Object.keys(data).sort()
  });

  return data;
}

export class PropertyListProvider {
  async getPropertyList(urlSegments: string[], searchParams?: URLSearchParams): Promise<PropertyListResponse | null> {
    try {
      console.log('🏗️  PropertyListProvider: Processing segments:', urlSegments);

      if (!isValidPropertySegments(urlSegments)) {
        console.log('❌ Invalid segments:', urlSegments);
        return null;
      }

      const data = await callEdgeFunction(urlSegments, searchParams);

      // Si hay error en la respuesta
      if (data.error) {
        console.error('❌ Edge function returned error:', data.error);
        return null;
      }

      // ANÁLISIS DETALLADO DE LA RESPUESTA
      console.log('🔍 Analyzing response for property-list compatibility...');
      
      // Caso 1: Single property (redireccionar)
      if (data.page_type === 'single-property' || data.property) {
        console.log('🏠 Detected single property, not a property list');
        return null;
      }
      
      // Caso 2: Página especial
      if (data.special_page) {
        console.log('⭐ Detected special page:', data.special_type);
        // Las páginas especiales pueden tener propiedades, continuamos
      }
      
      // Caso 3: Verificar si realmente es property-list
      // LÓGICA MÁS PERMISIVA: Si tiene SEO y no es single-property, asumir property-list
      const isPropertyList = (
        data.page_type === 'property-list' || 
        data.properties !== undefined ||
        data.pagination !== undefined ||
        (data.seo && !data.property) // Si tiene SEO pero no es single property
      );
      
      if (!isPropertyList) {
        console.log('❌ Not a property list page. Criteria failed:', {
          type: data.type,
          has_searchResults: hasSearchResults,
          has_properties: hasProperties,
          has_property: !!data.property,
          has_seo: !!data.seo
        });
        return null;
      }
      
      console.log('✅ Confirmed property list page');
      
      // Verificar propiedades (puede estar vacío)
      const properties = data.properties || [];
      console.log(`📋 Found ${properties.length} properties`);
      
      // SIEMPRE DEVOLVER RESPUESTA VÁLIDA, incluso si está vacía
      const result = this.transformToPropertyListFormat(data);
      
      console.log('🎯 FINAL PROVIDER RESULT:', {
        type: result.type,
        listings_count: result.listings.length,
        total_count: result.totalCount,
        meta_title: result.meta.title,
        current_page: result.currentPage,
        total_pages: result.totalPages,
        has_next: result.hasNextPage,
        has_prev: result.hasPreviousPage
      });
      
      return result;

    } catch (error) {
      console.error('💥 PropertyListProvider error:', error);
      return null;
    }
  }

  private transformToPropertyListFormat(data: EdgeFunctionResponse): PropertyListResponse {
    const properties = data.properties || [];
    const pagination = data.pagination || {};
    const seo = data.seo || {};
    const language = data.language || 'es';

    console.log(`🔄 Transforming ${properties.length} properties for language: ${language}`);

    const listings = properties.map((property, index) => {
      console.log(`🏠 Processing property ${index + 1}:`, {
        id: property.id,
        name: property.name?.substring(0, 30) + '...',
        sale_price: property.sale_price,
        rental_price: property.rental_price,
        sector: property.sector,
        city: property.city,
        url: property.url
      });
      
      return this.transformProperty(property, language);
    });

    const result = {
      type: 'property-list' as const,
      listings,
      meta: {
        title: seo.title || 'Propiedades | CLIC Inmobiliaria',
        description: seo.description || 'Encuentra las mejores propiedades en República Dominicana'
      },
      totalCount: data.total_properties || properties.length,
      currentPage: pagination.page || 1,
      totalPages: pagination.total_pages || Math.ceil((data.total_properties || properties.length) / (pagination.limit || 32)),
      itemsPerPage: pagination.limit || 32,
      hasNextPage: pagination.has_next_page || false,
      hasPreviousPage: pagination.has_prev_page || false
    };

    console.log('✅ Transformation complete:', {
      listings_count: result.listings.length,
      total_count: result.totalCount,
      current_page: result.currentPage,
      total_pages: result.totalPages
    });

    return result;
  }

  private transformProperty(property: any, language: string): PropertyListProperty {
    const precio = this.formatPrice(property, language);
    const imagenes = this.processImages(property.main_image_url, property.gallery_images_url);
    const sector = this.formatLocation(property.sector, property.city);
    const slug = this.extractSlug(property.url || property.slug_url);

    return {
      id: property.id?.toString() || property.code,
      slug,
      titulo: property.name || 'Propiedad sin nombre',
      precio,
      imagen: imagenes[0] || 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Sin+Imagen',
      imagenes,
      sector,
      habitaciones: property.bedrooms || 0,
      banos: property.bathrooms || 0,
      metros: property.built_area || 0,
      tipo: property.category || 'Propiedad',
      url: property.url || `/${slug}`,
      code: property.code || undefined,
      isFormattedByProvider: true,
      is_project: property.is_project || false
    };
  }

  private formatPrice(property: any, language: string): string {
    if (property.sale_price && property.sale_price > 0) {
      return this.formatCurrency(property.sale_price, property.sale_currency || 'USD');
    }
    
    if (property.rental_price && property.rental_price > 0) {
      const formatted = this.formatCurrency(property.rental_price, property.rental_currency || 'USD');
      const suffix = language === 'en' ? '/month' : language === 'fr' ? '/mois' : '/mes';
      return `${formatted}${suffix}`;
    }
    
    if (property.furnished_rental_price && property.furnished_rental_price > 0) {
      const formatted = this.formatCurrency(property.furnished_rental_price, property.furnished_rental_currency || 'USD');
      const suffix = language === 'en' ? '/month furnished' : language === 'fr' ? '/mois meublé' : '/mes amueblado';
      return `${formatted}${suffix}`;
    }
    
    if (property.temp_rental_price && property.temp_rental_price > 0) {
      const formatted = this.formatCurrency(property.temp_rental_price, property.temp_rental_currency || 'USD');
      const suffix = language === 'en' ? '/night' : language === 'fr' ? '/nuit' : '/noche';
      return `${formatted}${suffix}`;
    }

    return language === 'en' ? 'Price on request' : 
           language === 'fr' ? 'Prix sur demande' : 
           'Precio a consultar';
  }

  private formatCurrency(amount: number, currency: string): string {
    if (!amount || amount <= 0) return '';
    
    const currencySymbol = currency === 'DOP' ? 'RD$' : 
                          currency === 'EUR' ? '€' : 
                          'USD$';
    
    const formatted = new Intl.NumberFormat('en-US').format(amount);
    return `${currencySymbol}${formatted}`;
  }

  private processImages(mainImage?: string, galleryImages?: string | string[]): string[] {
    const images: string[] = [];
    
    if (mainImage && mainImage.trim()) {
      images.push(mainImage.trim());
    }
    
    if (galleryImages) {
      try {
        let gallery: string[] = [];
        
        if (typeof galleryImages === 'string') {
          try {
            gallery = JSON.parse(galleryImages);
          } catch {
            if (galleryImages.trim() && galleryImages !== mainImage) {
              gallery = [galleryImages.trim()];
            }
          }
        } else if (Array.isArray(galleryImages)) {
          gallery = galleryImages;
        }
        
        gallery.forEach(img => {
          if (img && typeof img === 'string' && img.trim() && 
              img !== mainImage && !images.includes(img.trim())) {
            images.push(img.trim());
          }
        });
        
      } catch (error) {
        console.warn('⚠️  Error processing gallery images:', error);
      }
    }
    
    if (images.length === 0) {
      images.push('https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Sin+Imagen');
    }
    
    return images;
  }

  private formatLocation(sector?: string, city?: string): string {
    const parts: string[] = [];
    
    if (sector && sector.trim()) parts.push(sector.trim());
    if (city && city.trim() && city !== sector) parts.push(city.trim());
    
    return parts.length > 0 ? parts.join(', ') : 'Ubicación no especificada';
  }

  private extractSlug(url?: string): string {
    if (!url) return '';
    
    const cleanUrl = url.split('?')[0];
    const slug = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
    
    return slug || '';
  }
}

export const propertyListProvider = new PropertyListProvider();

export async function getPropertyList(urlSegments: string[], searchParams?: URLSearchParams): Promise<PropertyListResponse | null> {
  return await propertyListProvider.getPropertyList(urlSegments, searchParams);
}// UnifiedPropertyProvider.ts - Provider independiente que normaliza cualquier respuesta de API

interface APIResponse {
  // Estructura del documento 1 (detallada)
  searchResults?: {
    properties: any[];
    pagination: any;
    tags?: any[];
  };
  relatedContent?: {
    articles?: any[];
    videos?: any[];
    testimonials?: any[];
    faqs?: any[];
    seo_content?: any[];
  };
  seo?: any;
  breadcrumbs?: any[];
  
  // Estructura del documento 2 (simplificada)
  properties?: any[];
  pagination?: any;
  tags?: any[];
  articles?: any[];
  videos?: any[];
  testimonials?: any[];
  faqs?: any[];
  seo_content?: any[];
  
  // Campos adicionales comunes
  page_type?: string;
  language?: string;
  country?: any;
  total_properties?: number;
  error?: string;
  [key: string]: any;
}

interface NormalizedData {
  propertyList: {
    listings: Array<{
      id: string | number;
      slug: string;
      titulo: string;
      precio: string;
      imagen: string;
      imagenes?: string[];
      sector: string;
      habitaciones: number;
      banos: number;
      metros?: number;
      tipo?: string;
      url?: string;
      code?: string;
      isFormattedByProvider?: boolean;
      is_project?: boolean;
      project_badges?: string[];
      habitaciones_rango?: string;
      banos_rango?: string;
      metros_rango?: string;
      reserva_desde?: string;
    }>;
    meta: {
      title: string;
      description: string;
    };
    totalCount: number;
    currentPage: number;
    totalPages: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  
  faqs: any[] | null;
  relatedArticles: any[] | null;
  videoGallery: any[] | null;
  testimonials: any[] | null;
  seoContent: any[] | null;
  destinationGrid: any[] | null;
  propertyCarousel: any[] | null;
  
  searchContext: {
    location?: string;
    propertyType?: string;
    operation?: string;
  };
}

export class UnifiedPropertyProvider {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, authToken?: string) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'CLIC-Inmobiliaria/1.0'
    };
    
    if (authToken) {
      this.headers['Authorization'] = `Bearer ${authToken}`;
    }
  }

  /**
   * Método principal que llama a la API y normaliza la respuesta
   */
  async getData(segments: string[] = [], searchParams?: URLSearchParams): Promise<NormalizedData | null> {
    try {
      console.log('🔄 UnifiedPropertyProvider: Fetching data for segments:', segments);
      
      const apiResponse = await this.fetchFromAPI(segments, searchParams);
      
      if (!apiResponse) {
        console.warn('⚠️ No data received from API');
        return null;
      }

      console.log('📊 API Response structure:', {
        hasSearchResults: !!apiResponse.searchResults,
        hasProperties: !!(apiResponse.properties || apiResponse.searchResults?.properties),
        hasRelatedContent: !!apiResponse.relatedContent,
        hasSeo: !!apiResponse.seo,
        pageType: apiResponse.page_type,
        totalKeys: Object.keys(apiResponse).length
      });

      return this.normalizeResponse(apiResponse);
      
    } catch (error) {
      console.error('💥 UnifiedPropertyProvider error:', error);
      return null;
    }
  }

  /**
   * Llama a la API con los segmentos y parámetros dados
   */
  private async fetchFromAPI(segments: string[], searchParams?: URLSearchParams): Promise<APIResponse | null> {
    const path = segments.length > 0 ? `/${segments.join('/')}` : '/';
    let url = `${this.baseUrl}${path}`;
    
    if (searchParams && searchParams.toString()) {
      url += `?${searchParams.toString()}`;
    }
    
    console.log('🌐 Calling API:', url);
    
    const response = await fetch(url, {
      headers: this.headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, response.statusText);
      console.error('❌ Error body:', errorText);
      throw new Error(`API Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Debug de la respuesta
    console.log('📡 Raw API Response keys:', Object.keys(data));
    
    return data;
  }

  /**
   * Normaliza la respuesta independientemente de su estructura
   */
  private normalizeResponse(apiResponse: APIResponse): NormalizedData {
    // Detectar estructura y extraer propiedades
    const properties = this.extractProperties(apiResponse);
    const pagination = this.extractPagination(apiResponse);
    const seo = this.extractSeo(apiResponse);
    
    console.log(`🔧 Normalizing ${properties.length} properties`);

    return {
      propertyList: {
        listings: properties.map(property => this.normalizeProperty(property)),
        meta: {
          title: seo.title || 'Propiedades | CLIC Inmobiliaria',
          description: seo.description || 'Encuentra las mejores propiedades'
        },
        totalCount: apiResponse.total_properties || pagination.totalCount || properties.length,
        currentPage: pagination.currentPage || 1,
        totalPages: pagination.totalPages || 1,
        itemsPerPage: pagination.itemsPerPage || 32,
        hasNextPage: pagination.hasNextPage || false,
        hasPreviousPage: pagination.hasPreviousPage || false
      },
      
      faqs: this.extractFAQs(apiResponse),
      relatedArticles: this.extractArticles(apiResponse),
      videoGallery: this.extractVideos(apiResponse),
      testimonials: this.extractTestimonials(apiResponse),
      seoContent: this.extractSeoContent(apiResponse),
      destinationGrid: null, // TODO: Implementar cuando esté disponible
      propertyCarousel: properties.slice(0, 8).map(p => this.normalizePropertyForCarousel(p)),
      
      searchContext: this.extractSearchContext(apiResponse)
    };
  }

  /**
   * Extrae propiedades de cualquier estructura
   */
  private extractProperties(apiResponse: APIResponse): any[] {
    // Estructura documento 1: searchResults.properties
    if (apiResponse.searchResults?.properties) {
      return apiResponse.searchResults.properties;
    }
    
    // Estructura documento 2: properties directamente
    if (apiResponse.properties) {
      return apiResponse.properties;
    }
    
    return [];
  }

  /**
   * Extrae información de paginación
   */
  private extractPagination(apiResponse: APIResponse): any {
    // Estructura documento 1
    if (apiResponse.searchResults?.pagination) {
      const p = apiResponse.searchResults.pagination;
      return {
        currentPage: p.currentPage || 1,
        totalPages: p.totalPages || 1,
        totalCount: p.totalCount || 0,
        itemsPerPage: p.itemsPerPage || 32,
        hasNextPage: p.hasNextPage || false,
        hasPreviousPage: p.hasPreviousPage || false
      };
    }
    
    // Estructura documento 2
    if (apiResponse.pagination) {
      const p = apiResponse.pagination;
      return {
        currentPage: p.page || p.currentPage || 1,
        totalPages: p.total_pages || p.totalPages || 1,
        totalCount: p.total_properties || p.totalCount || 0,
        itemsPerPage: p.limit || p.itemsPerPage || 32,
        hasNextPage: p.has_next_page || p.hasNextPage || false,
        hasPreviousPage: p.has_prev_page || p.hasPreviousPage || false
      };
    }
    
    return {
      currentPage: 1,
      totalPages: 1,
      totalCount: 0,
      itemsPerPage: 32,
      hasNextPage: false,
      hasPreviousPage: false
    };
  }

  /**
   * Extrae información SEO
   */
  private extractSeo(apiResponse: APIResponse): any {
    return apiResponse.seo || {};
  }

  /**
   * Normaliza una propiedad individual
   */
  private normalizeProperty(property: any): any {
    return {
      id: property.id,
      slug: property.slug_url || property.url || '#',
      titulo: property.name || property.titulo || 'Propiedad sin nombre',
      precio: this.formatPrice(property),
      imagen: property.main_image_url || 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Sin+Imagen',
      imagenes: this.formatImages(property),
      sector: property.sector || 'Ubicación no especificada',
      habitaciones: property.bedrooms || property.habitaciones || 0,
      banos: property.bathrooms || property.banos || 0,
      metros: property.built_area || property.metros || 0,
      tipo: property.category || property.tipo || 'Propiedad',
      url: property.url || property.slug_url || '#',
      code: property.code?.toString() || null,
      isFormattedByProvider: true,
      is_project: property.is_project || false,
      
      // 🚧 TODO: Configurar cuando la API tenga datos de proyecto completos
      project_badges: this.extractProjectBadges(property),
      habitaciones_rango: this.formatProjectRange(property, 'bedrooms'),
      banos_rango: this.formatProjectRange(property, 'bathrooms'),
      metros_rango: this.formatProjectRange(property, 'built_area'),
      reserva_desde: this.extractReservaDesde(property)
    };
  }

  /**
   * Formatea precio con moneda
   */
  private formatPrice(property: any): string {
    if (property.sale_price && property.sale_price > 0) {
      return this.formatCurrency(property.sale_price, property.sale_currency || 'USD');
    }
    
    if (property.rental_price && property.rental_price > 0) {
      return this.formatCurrency(property.rental_price, property.rental_currency || 'USD') + '/mes';
    }
    
    if (property.precio) {
      return property.precio;
    }
    
    return 'Precio a consultar';
  }

  /**
   * Formatea moneda
   */
  private formatCurrency(amount: number, currency: string): string {
    if (!amount || amount <= 0) return '';
    
    const formatted = amount.toLocaleString('en-US');
    
    switch (currency?.toUpperCase()) {
      case 'USD':
        return `$${formatted} USD`;
      case 'DOP':
        return `RD$${formatted}`;
      case 'EUR':
        return `€${formatted}`;
      default:
        return `$${formatted}`;
    }
  }

  /**
   * Formatea imágenes
   */
  private formatImages(property: any): string[] {
    const images: string[] = [];
    
    if (property.main_image_url) {
      images.push(property.main_image_url);
    }
    
    if (property.gallery_images_url) {
      if (typeof property.gallery_images_url === 'string') {
        const galleryImages = property.gallery_images_url.split(',').map(img => img.trim()).filter(Boolean);
        images.push(...galleryImages);
      } else if (Array.isArray(property.gallery_images_url)) {
        images.push(...property.gallery_images_url);
      }
    }
    
    if (property.imagenes && Array.isArray(property.imagenes)) {
      images.push(...property.imagenes);
    }
    
    return images.length > 0 ? images : ['https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Sin+Imagen'];
  }

  /**
   * 🚧 TODO: Extraer badges de proyecto
   */
  private extractProjectBadges(property: any): string[] | null {
    if (property.projectDetails?.project_benefits) {
      return property.projectDetails.project_benefits
        .map((benefit: any) => benefit.project_benefits_catalog?.name || benefit.custom_description)
        .filter(Boolean);
    }
    return null;
  }

  /**
   * 🚧 TODO: Formatear rangos para proyectos
   */
  private formatProjectRange(property: any, field: string): string | null {
    if (property.is_project && property.projectDetails?.project_typologies) {
      const values = property.projectDetails.project_typologies
        .map((t: any) => t[field])
        .filter(Boolean);
      
      if (values.length > 1) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        return `${min}-${max}`;
      }
    }
    return null;
  }

  /**
   * 🚧 TODO: Extraer información de reserva
   */
  private extractReservaDesde(property: any): string | null {
    if (property.projectDetails?.project_payment_plans?.[0]) {
      const plan = property.projectDetails.project_payment_plans[0];
      if (plan.reservation_amount && plan.reservation_currency) {
        return this.formatCurrency(plan.reservation_amount, plan.reservation_currency);
      }
    }
    return null;
  }

  /**
   * Extrae FAQs de cualquier estructura
   */
  private extractFAQs(apiResponse: APIResponse): any[] | null {
    const faqs = apiResponse.relatedContent?.faqs || apiResponse.faqs || [];
    
    if (!faqs.length) return null;
    
    return faqs.map((faq: any) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
      category: faq.category,
      tags: faq.context_features || []
    }));
  }

  /**
   * Extrae artículos de cualquier estructura
   */
  private extractArticles(apiResponse: APIResponse): any[] | null {
    const articles = apiResponse.relatedContent?.articles || apiResponse.articles || [];
    
    if (!articles.length) return null;
    
    return articles.map((article: any) => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      featuredImage: article.featured_image || article.featuredImage,
      author: {
        name: article.users?.first_name && article.users?.last_name ? 
              `${article.users.first_name} ${article.users.last_name}` : 
              article.author?.name || 'CLIC Team',
        avatar: article.users?.profile_photo_url || article.author?.avatar
      },
      publishedAt: article.published_at || article.publishedAt,
      readTime: article.read_time ? `${article.read_time} min` : article.readTime || '5 min',
      category: article.category,
      views: article.views,
      featured: article.featured,
      total_weight: article.total_weight,
      content_priority: article.content_priority,
      sort_order: article.sort_order
    }));
  }

  /**
   * Extrae videos de cualquier estructura
   */
  private extractVideos(apiResponse: APIResponse): any[] | null {
    const videos = apiResponse.relatedContent?.videos || apiResponse.videos || [];
    
    if (!videos.length) return null;
    
    return videos.map((video: any) => ({
      id: video.id,
      title: video.title,
      description: video.description,
      thumbnail: video.thumbnail,
      duration: video.duration || 'N/A',
      views: video.views,
      category: this.mapVideoCategory(video.category),
      videoId: video.video_id,
      videoSlug: video.video_slug || video.slug,
      featured: video.featured,
      total_weight: video.total_weight,
      content_priority: video.content_priority,
      sort_order: video.sort_order
    }));
  }

  /**
   * Mapea categorías de video
   */
  private mapVideoCategory(category: string): string {
    const categoryMap: Record<string, string> = {
      'casa-famosos': 'casa-famosos',
      'lanzamientos': 'proyectos',
      'entrevistas': 'entrevistas',
      'recorridos': 'recorridos',
      'tips': 'tips',
      'decoracion': 'decoracion'
    };
    
    return categoryMap[category] || 'recorridos';
  }

  /**
   * Extrae testimonios de cualquier estructura
   */
  private extractTestimonials(apiResponse: APIResponse): any[] | null {
    const testimonials = apiResponse.relatedContent?.testimonials || apiResponse.testimonials || [];
    
    if (!testimonials.length) return null;
    
    return testimonials.map((testimonial: any) => ({
      id: testimonial.id,
      slug: testimonial.slug,
      category: testimonial.category,
      author: {
        name: testimonial.client_name,
        avatar: testimonial.client_avatar,
        location: testimonial.client_location,
        verified: testimonial.client_verified || false,
        isCelebrity: testimonial.client_is_celebrity || false
      },
      rating: testimonial.rating || 5,
      text: testimonial.full_testimonial || testimonial.excerpt,
      excerpt: testimonial.excerpt,
      propertyType: testimonial.property_type,
      location: testimonial.transaction_location,
      date: testimonial.published_at,
      videoTestimonial: testimonial.video_testimonial,
      featured: testimonial.featured,
      views: testimonial.views,
      readTime: testimonial.read_time ? `${testimonial.read_time} min` : null
    }));
  }

  /**
   * Extrae contenido SEO
   */
  private extractSeoContent(apiResponse: APIResponse): any[] | null {
    const seoContent = apiResponse.relatedContent?.seo_content || apiResponse.seo_content || [];
    
    if (!seoContent.length) return null;
    
    return seoContent.map((item: any) => ({
      title: item.title || item.h1_title,
      h2_subtitle: item.h2_subtitle,
      description: item.description,
      content: item.seo_content || item.content,
      content_type: item.content_type || 'seo_content'
    }));
  }

  /**
   * Normaliza propiedad para carousel
   */
  private normalizePropertyForCarousel(property: any): any {
    return {
      slug: property.slug_url || property.url || '#',
      titulo: property.name || 'Propiedad sin nombre',
      precio: this.formatPrice(property),
      imagen: property.main_image_url || 'https://via.placeholder.com/400x300',
      sector: property.sector || 'Ubicación no especificada',
      habitaciones: property.bedrooms || 0,
      banos: property.bathrooms || 0,
      metros: property.built_area || 0,
      tipo: property.category || 'Propiedad',
      destacado: false,
      nuevo: property.is_project || false,
      descuento: null
    };
  }

  /**
   * Extrae contexto de búsqueda
   */
  private extractSearchContext(apiResponse: APIResponse): any {
    const breadcrumbs = apiResponse.breadcrumbs || [];
    const tags = apiResponse.searchResults?.tags || apiResponse.tags || [];

    return {
      location: this.extractFromTags(tags, ['ciudad', 'sector', 'provincia']) || 
               this.extractFromBreadcrumbs(breadcrumbs, ['ciudad', 'sector']),
      propertyType: this.extractFromTags(tags, ['categoria']) || 
                   this.extractFromBreadcrumbs(breadcrumbs, ['categoria']),
      operation: this.extractFromTags(tags, ['operacion']) || 
                this.extractFromBreadcrumbs(breadcrumbs, ['operacion'])
    };
  }

  /**
   * Extrae información de tags
   */
  private extractFromTags(tags: any[], categories: string[]): string | null {
    const tag = tags.find(tag => categories.includes(tag.category));
    return tag?.display_name || null;
  }

  /**
   * Extrae información de breadcrumbs
   */
  private extractFromBreadcrumbs(breadcrumbs: any[], categories: string[]): string | null {
    const crumb = breadcrumbs.find(crumb => categories.includes(crumb.category));
    return crumb?.name || null;
  }
}

// Factory function para crear instancias configuradas
export function createPropertyProvider(config: {
  baseUrl: string;
  authToken?: string;
}): UnifiedPropertyProvider {
  return new UnifiedPropertyProvider(config.baseUrl, config.authToken);
}

// Ejemplo de uso:
/*
const provider = createPropertyProvider({
  baseUrl: 'https://api.example.com',
  authToken: 'your-token'
});

const data = await provider.getData(['comprar', 'apartamento', 'santo-domingo']);

if (data) {
  // Usar en componentes
  <PropertyList {...data.propertyList} />
  <DynamicFAQs faqs={data.faqs} context={data.searchContext} />
  <RelatedArticles articles={data.relatedArticles} />
  <VideoGallery videos={data.videoGallery} />
}
*/