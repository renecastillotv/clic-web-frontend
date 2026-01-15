// src/data/types.ts - UPDATED FOR HYBRID

/**
 * 🏠 PROPIEDAD INMOBILIARIA (COMPATIBLE CON API REAL)
 */
export interface Property {
  slug: string;
  titulo: string;
  precio: string;
  descripcion?: string;
  imagen: string;
  imagenes?: string[];
  sector: string;
  habitaciones: number;
  banos: number;
  metros?: number;
  terreno?: number;
  tipo?: string;
  amenidades?: string[];
  caracteristicas?: Record<string, string>;
  destacado?: boolean;
  nuevo?: boolean;
  descuento?: string;
  
  // 🆕 CAMPOS ADICIONALES DE LA API REAL
  id?: string | number;
  price_usd?: number;
  price_dop?: number;
  currency?: 'USD' | 'DOP';
  area_m2?: number;
  lot_size_m2?: number;
  property_type?: string;
  location?: {
    province?: string;
    city?: string;
    sector?: string;
    coordinates?: [number, number];
  };
  features?: string[];
  agent_id?: string;
  created_at?: string;
  updated_at?: string;
  status?: 'active' | 'sold' | 'rented' | 'pending';
  views?: number;
  likes?: number;
  virtual_tour_url?: string;
  video_url?: string;
}

/**
 * 📄 ARTÍCULO DEL BLOG
 */
export interface Article {
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  featuredImage?: string;
  author: {
    name: string;
    avatar?: string;
  };
  publishedAt: string;
  readTime?: string;
  category?: string;
  views?: string;
  tags?: string[];
  featured?: boolean;
}

/**
 * 👥 ASESOR INMOBILIARIO
 */
export interface Advisor {
  slug: string;
  name: string;
  title: string;
  avatar?: string;
  specialties: string[];
  areas: string[];
  languages: string[];
  experience: string;
  totalSales: string;
  propertiesSold: number;
  avgDays: number;
  rating: number;
  reviewCount: number;
  phone: string;
  whatsapp: string;
  email: string;
  bio?: string;
  achievements?: string[];
  featured?: boolean;
}

/**
 * 🎬 VIDEO
 */
export interface Video {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  duration: string;
  views: string;
  category?: string;
  videoId: string;
  videoSlug?: string;
  featured?: boolean;
}

/**
 * 💬 TESTIMONIO
 */
export interface Testimonial {
  id: string;
  slug: string;
  category: string;
  author: {
    name: string;
    avatar?: string;
    location?: string;
    verified?: boolean;
  };
  rating: number;
  text: string;
  excerpt: string;
  propertyType?: string;
  location?: string;
  date: string;
  views?: string;
  readTime?: string;
  stayDuration?: string;
  groupSize?: string;
}

/**
 * 🔢 ESTADÍSTICAS DE BÚSQUEDA (DE LA API REAL)
 */
export interface SearchStatistics {
  total_properties: number;
  price_range: {
    min_price: number;
    max_price: number;
    avg_price: number;
  };
  property_types?: Record<string, number>;
  locations?: Record<string, number>;
  avg_bedrooms?: number;
  avg_bathrooms?: number;
  newest_property?: string;
  oldest_property?: string;
}

/**
 * 🗺️ BREADCRUMB
 */
export interface Breadcrumb {
  name: string;
  url: string;
}

/**
 * 📊 DATOS DE PÁGINA COMPLETOS (HÍBRIDOS)
 */
export interface PageData {
  // Tipo de página
  type: 'property-list' | 'property' | 'article' | 'advisor' | '404';
  
  // Contenido principal según el tipo
  property?: Property;
  listings?: Property[];
  article?: Article;
  advisor?: Advisor;
  
  // Metadatos para SEO (pueden venir de la API)
  meta?: {
    title: string;
    description: string;
    canonical?: string;
    keywords?: string;
  };
  
  // 🆕 DATOS DE LA API REAL
  statistics?: SearchStatistics;
  appliedFilters?: Record<string, any>;
  availableFilters?: Record<string, any>;
  breadcrumbs?: Breadcrumb[];
  
  // Datos adicionales para listados
  total?: number;
  filters?: SearchFilters;
  pagination?: {
    current_page: number;
    total_pages: number;
    per_page: number;
    total_items: number;
    has_next: boolean;
    has_prev: boolean;
  };
  
  // 🎨 CONTENIDO COMPLEMENTARIO (MOCK)
  videos?: Video[];
  articles?: Article[];
  testimonials?: Testimonial[];
  advisors?: Advisor[];
  thematicLists?: ThematicList[];
  propertyCarousels?: PropertyCarousel[];
  faqs?: FAQ[];
  relatedProperties?: Property[];
  relatedArticles?: Article[];
  advisorProperties?: Property[];
}

/**
 * 📝 LISTA TEMÁTICA
 */
export interface ThematicList {
  id: string;
  title: string;
  subtitle: string;
  propertyCount: number;
  averagePrice: string;
  image?: string;
  url?: string;
}

/**
 * 🎠 CARRUSEL DE PROPIEDADES
 */
export interface PropertyCarousel {
  id: string;
  title: string;
  description?: string;
  properties: Property[];
  viewAllUrl?: string;
}

/**
 * ❓ FAQ
 */
export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

/**
 * 🔍 FILTROS DE BÚSQUEDA (EXPANDIDOS)
 */
export interface SearchFilters {
  // Filtros básicos
  accion?: 'comprar' | 'alquilar';
  tipo?: string;
  ubicacion?: string;
  sector?: string;
  precioMin?: string;
  precioMax?: string;
  moneda?: 'USD' | 'DOP';
  habitaciones?: string;
  banos?: string;
  parqueos?: string;
  caracteristicas?: string[];
  
  // 🆕 FILTROS AVANZADOS PARA LA API
  metros_min?: string;
  metros_max?: string;
  terreno_min?: string;
  terreno_max?: string;
  ano_construccion?: string;
  estado?: string;
  amueblado?: boolean;
  mascotas?: boolean;
  jardin?: boolean;
  piscina?: boolean;
  vista_al_mar?: boolean;
  cerca_playa?: boolean;
  golf?: boolean;
  seguridad?: boolean;
  gimnasio?: boolean;
  
  // Filtros de agente
  agente?: string;
  agencia?: string;
  
  // Filtros de tiempo
  fecha_desde?: string;
  fecha_hasta?: string;
  
  // Búsqueda por texto
  q?: string;
  
  // Filtros geográficos
  coordenadas?: {
    lat: number;
    lng: number;
    radio: number; // en km
  };
}

/**
 * 📄 RESULTADO DE BÚSQUEDA PAGINADA (MEJORADO)
 */
export interface SearchResult {
  properties: Property[];
  total: number;
  hasMore: boolean;
  currentPage?: number;
  totalPages?: number;
  statistics?: SearchStatistics;
  appliedFilters?: Record<string, any>;
  availableFilters?: Record<string, any>;
  searchTime?: number; // en ms
  suggestions?: string[];
}

/**
 * 🎯 OPCIONES PARA FUNCIONES DE BÚSQUEDA
 */
export interface SearchOptions {
  limit?: number;
  offset?: number;
  page?: number;
  sortBy?: 'precio-asc' | 'precio-desc' | 'habitaciones-desc' | 'fecha-desc' | 'metros-desc' | 'relevancia';
  include_stats?: boolean;
  include_filters?: boolean;
  include_similar?: boolean;
}

/**
 * 🔧 RESPUESTA DE API (ESTANDARIZADA)
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    pages?: number;
    has_next?: boolean;
    has_prev?: boolean;
  };
  filters?: {
    applied: Record<string, any>;
    available: Record<string, any>;
  };
  statistics?: SearchStatistics;
  seo?: {
    title: string;
    description: string;
    keywords: string;
    canonical: string;
  };
  breadcrumbs?: Breadcrumb[];
  execution_time?: number;
}

/**
 * ⚙️ CONFIGURACIÓN DEL PROVEEDOR
 */
export interface ProviderConfig {
  use_real_api: boolean;
  api_base_url: string;
  fallback_to_mock: boolean;
  cache_duration: number;
  debug_mode: boolean;
}

/**
 * 📊 MÉTRICAS Y ANALÍTICAS
 */
export interface Analytics {
  page_views: number;
  unique_visitors: number;
  bounce_rate: number;
  avg_session_duration: number;
  popular_searches: Array<{
    query: string;
    count: number;
  }>;
  popular_locations: Array<{
    location: string;
    count: number;
  }>;
  conversion_rate: number;
}

/**
 * 🎯 CONFIGURACIÓN DE PÁGINA DINÁMICA
 */
export interface DynamicPageConfig {
  enable_hybrid: boolean;
  content_sources: {
    properties: 'api' | 'mock' | 'hybrid';
    articles: 'api' | 'mock' | 'hybrid';
    advisors: 'api' | 'mock' | 'hybrid';
    videos: 'api' | 'mock' | 'hybrid';
    testimonials: 'api' | 'mock' | 'hybrid';
  };
  fallback_strategy: 'mock' | 'error' | 'minimal';
  cache_strategy: 'aggressive' | 'conservative' | 'none';
}