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
  metros_terreno?: number;
  tipo?: string;
  url?: string;
  code?: string;
  isFormattedByProvider?: boolean;
  is_project?: boolean;
  // Campos adicionales de la API para PropertyList.astro
  built_area?: number;
  land_area?: number;
  parking_spots?: number;
  parqueos?: number;
  bedrooms?: number;
  bathrooms?: number;
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
      titulo: property.titulo || property.name || 'Propiedad sin nombre',
      precio: property.precio || precio,
      imagen: property.imagen || imagenes[0] || 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Sin+Imagen',
      imagenes: property.imagenes || imagenes,
      sector: property.sector || sector,
      habitaciones: property.habitaciones || property.bedrooms || 0,
      banos: property.banos || property.bathrooms || 0,
      metros: property.metros || property.built_area || 0,
      metros_terreno: property.metros_terreno || property.land_area || 0,
      tipo: property.tipo || property.category || 'Propiedad',
      url: property.url || `/${slug}`,
      code: property.code || undefined,
      isFormattedByProvider: true,
      is_project: property.is_project || false,
      // Campos adicionales para PropertyList.astro
      built_area: property.built_area || property.metros || 0,
      land_area: property.land_area || property.metros_terreno || 0,
      parking_spots: property.parking_spots || property.parqueos || 0,
      parqueos: property.parqueos || property.parking_spots || 0,
      bedrooms: property.bedrooms || property.habitaciones || 0,
      bathrooms: property.bathrooms || property.banos || 0
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
}