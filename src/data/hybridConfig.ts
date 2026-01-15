// src/data/hybridConfig.ts - CONFIGURACIÓN CORREGIDA
import type { ProviderConfig, DynamicPageConfig } from './types';

/**
 * ⚙️ CONFIGURACIÓN HÍBRIDA CORREGIDA
 * 
 * Controla cómo se comporta el proveedor híbrido
 */
export const HYBRID_CONFIG: ProviderConfig & DynamicPageConfig = {
  // 🔗 Configuración de API (ACTIVADA) - Usando nueva API de Neon en Vercel
  use_real_api: true,
  api_base_url: 'https://clic-api-neon.vercel.app',
  fallback_to_mock: true,
  cache_duration: 300, // 5 minutos
  debug_mode: true, // Activado para debugging
  
  // 🎯 Configuración híbrida por contenido (PROPIEDADES API ACTIVADAS)
  enable_hybrid: true,
  content_sources: {
    properties: 'api',           // 🔥 CAMBIO: Solo API real para propiedades
    articles: 'mock',            // 📄 Solo mock por ahora
    advisors: 'mock',            // 👥 Solo mock por ahora  
    videos: 'mock',              // 🎬 Solo mock por ahora
    testimonials: 'mock'         // 💬 Solo mock por ahora
  },
  
  // 🛠️ Estrategias mejoradas
  fallback_strategy: 'mock',
  cache_strategy: 'conservative'
};

/**
 * 🎨 CONFIGURACIÓN DE CONTENIDO COMPLEMENTARIO
 */
export const CONTENT_ENRICHMENT = {
  'property-list': {
    videos: 3,
    articles: 3,
    testimonials: 3,
    advisors: 2,
    thematic_lists: 2,
    faqs: 5
  },
  'property': {
    related_properties: 3,
    testimonials: 3,
    advisors: 1,
    articles: 2,
    virtual_tour: true
  },
  'article': {
    related_articles: 3,
    related_properties: 4,
    advisors: 2,
    testimonials: 2
  },
  'advisor': {
    advisor_properties: 6,
    testimonials: 4,
    articles: 2,
    performance_stats: true
  }
};

/**
 * 🗺️ MAPEO DE RUTAS A TIPOS DE CONTENIDO
 */
export const ROUTE_MAPPING = {
  // Propiedades (API REAL)
  '/comprar': 'property-list',
  '/alquilar': 'property-list',
  '/propiedad': 'property',
  
  // Contenido (MOCK)
  '/articulos': 'article',
  '/asesores': 'advisor',
  '/videos': 'video',
  '/testimonios': 'testimonial',
  
  // Páginas especiales
  '/search': 'search',
  '/favoritos': 'favorites',
  '/comparar': 'compare'
};

/**
 * 🏷️ CONFIGURACIÓN DE ETIQUETAS DINÁMICAS EXPANDIDA
 */
export const DYNAMIC_TAGS = {
  property_types: {
    'apartamento': 'Apartamentos',
    'apartamentos': 'Apartamentos',
    'villa': 'Villas',
    'casa': 'Casas',
    'casas': 'Casas',
    'penthouse': 'Penthouses',
    'terreno': 'Terrenos',
    'terrenos': 'Terrenos',
    'local': 'Locales Comerciales',
    'oficina': 'Oficinas',
    'bodega': 'Bodegas'
  },
  
  locations: {
    'distrito-nacional': 'Distrito Nacional',
    'santo-domingo-norte': 'Santo Domingo Norte',
    'santo-domingo-este': 'Santo Domingo Este',
    'santo-domingo-oeste': 'Santo Domingo Oeste',
    'santiago': 'Santiago',
    'punta-cana': 'Punta Cana',
    'bavaro': 'Bávaro',
    'la-romana': 'La Romana',
    'puerto-plata': 'Puerto Plata',
    'san-pedro': 'San Pedro de Macorís',
    'la-vega': 'La Vega'
  },
  
  sectors: {
    'piantini': 'Piantini',
    'naco': 'Naco',
    'evaristo-morales': 'Evaristo Morales',
    'serralles': 'Serralles',
    'gazcue': 'Gazcue',
    'zona-colonial': 'Zona Colonial',
    'bella-vista': 'Bella Vista',
    'ensanche-julieta': 'Ensanche Julieta',
    'los-cacicazgos': 'Los Cacicazgos',
    'mirador-sur': 'Mirador Sur'
  },
  
  actions: {
    'comprar': 'en venta',
    'alquilar': 'en alquiler'
  },
  
  currencies: {
    'USD': '$',
    'DOP': 'RD$'
  }
};

/**
 * 🎯 CONFIGURACIÓN SEO DINÁMICA
 */
export const SEO_CONFIG = {
  default_titles: {
    'property-list': '{tipo} {accion} en {ubicacion} | CLIC Inmobiliaria',
    'property': '{titulo} | CLIC Inmobiliaria',
    'article': '{titulo} | Blog CLIC',
    'advisor': '{nombre} - Asesor Inmobiliario | CLIC'
  },
  
  default_descriptions: {
    'property-list': 'Encuentra {total} {tipo} {accion} en {ubicacion}. Los mejores precios y asesores especializados en República Dominicana.',
    'property': '{descripcion} - Propiedad en {sector} con {habitaciones} habitaciones y {banos} baños.',
    'article': '{excerpt}',
    'advisor': 'Conoce a {nombre}, asesor especializado en {especialidades} con {experiencia} de experiencia.'
  },
  
  default_keywords: {
    base: 'inmobiliaria, republica dominicana, propiedades, bienes raices',
    'property-list': '{tipo}, {accion}, {ubicacion}, {caracteristicas}',
    'property': '{tipo}, {sector}, {habitaciones} habitaciones, {precio}',
    'article': '{categoria}, {tags}',
    'advisor': 'asesor inmobiliario, {especialidades}, {areas}'
  }
};

/**
 * 🔄 CONFIGURACIÓN DE CACHÉ
 */
export const CACHE_CONFIG = {
  durations: {
    'property-list': 300,    // 5 minutos
    'property': 600,         // 10 minutos  
    'article': 3600,         // 1 hora
    'advisor': 1800,         // 30 minutos
    'search': 180,           // 3 minutos
    'statistics': 900        // 15 minutos
  },
  
  invalidation: {
    'property-list': ['new_property', 'price_change', 'status_change'],
    'property': ['property_update', 'price_change'],
    'search': ['new_property', 'property_update']
  },
  
  headers: {
    'property-list': 'public, max-age=300, s-maxage=600',
    'property': 'public, max-age=600, s-maxage=1200',
    'article': 'public, max-age=3600, s-maxage=7200',
    'advisor': 'public, max-age=1800, s-maxage=3600'
  }
};

/**
 * 📊 CONFIGURACIÓN DE ANALYTICS
 */
export const ANALYTICS_CONFIG = {
  track_page_views: true,
  track_search_queries: true,
  track_property_views: true,
  track_contact_attempts: true,
  track_filter_usage: true,
  
  events: {
    property_view: 'property_detail_view',
    search_performed: 'property_search',
    filter_applied: 'search_filter_applied',
    contact_agent: 'agent_contact_attempt',
    property_favorite: 'property_favorited',
    virtual_tour: 'virtual_tour_viewed'
  }
};

/**
 * 🔧 FUNCIONES DE UTILIDAD PARA CONFIGURACIÓN
 */
export class ConfigHelper {
  
  /**
   * Determina si debe usar la API real para un tipo de contenido
   */
  static shouldUseRealAPI(contentType: keyof typeof HYBRID_CONFIG.content_sources): boolean {
    if (!HYBRID_CONFIG.use_real_api) {
      console.log(`🔧 API real desactivada globalmente para ${contentType}`);
      return false;
    }
    
    const source = HYBRID_CONFIG.content_sources[contentType];
    const shouldUse = source === 'api' || source === 'hybrid';
    
    console.log(`🔧 ConfigHelper.shouldUseRealAPI(${contentType}): ${shouldUse} (source: ${source})`);
    return shouldUse;
  }
  
  /**
   * Determina si debe hacer fallback a mock
   */
  static shouldFallbackToMock(contentType: keyof typeof HYBRID_CONFIG.content_sources): boolean {
    if (!HYBRID_CONFIG.fallback_to_mock) return false;
    
    const source = HYBRID_CONFIG.content_sources[contentType];
    return source === 'mock' || source === 'hybrid';
  }
  
  /**
   * Obtiene la duración de caché para un tipo de contenido
   */
  static getCacheDuration(contentType: keyof typeof CACHE_CONFIG.durations): number {
    return CACHE_CONFIG.durations[contentType] || HYBRID_CONFIG.cache_duration;
  }
  
  /**
   * Genera un título SEO dinámico
   */
  static generateSEOTitle(
    type: keyof typeof SEO_CONFIG.default_titles, 
    params: Record<string, string>
  ): string {
    let template = SEO_CONFIG.default_titles[type];
    
    Object.entries(params).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    
    return template.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();
  }
  
  /**
   * Genera una descripción SEO dinámica
   */
  static generateSEODescription(
    type: keyof typeof SEO_CONFIG.default_descriptions,
    params: Record<string, string>
  ): string {
    let template = SEO_CONFIG.default_descriptions[type];
    
    Object.entries(params).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{${key}}`, 'g'), value);
    });
    
    return template.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();
  }
  
  /**
   * Verifica si está en modo debug
   */
  static isDebugMode(): boolean {
    return HYBRID_CONFIG.debug_mode;
  }
  
  /**
   * Log debug condicional
   */
  static debugLog(message: string, data?: any): void {
    if (this.isDebugMode()) {
      console.log(`🔍 [HYBRID DEBUG] ${message}`, data || '');
    }
  }
  
  /**
   * 🆕 Validar configuración
   */
  static validateConfig(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    if (!HYBRID_CONFIG.api_base_url) {
      issues.push('api_base_url no configurada');
    }
    
    if (HYBRID_CONFIG.use_real_api && !HYBRID_CONFIG.api_base_url.includes('clic-api-neon')) {
      issues.push('URL de API no parece ser de Neon');
    }
    
    if (HYBRID_CONFIG.content_sources.properties === 'api' && !HYBRID_CONFIG.fallback_to_mock) {
      issues.push('Propiedades configuradas solo para API sin fallback');
    }
    
    return {
      valid: issues.length === 0,
      issues
    };
  }
}

/**
 * 🚀 EXPORTACIONES DE CONVENIENCIA
 */
export const useRealAPI = (contentType: keyof typeof HYBRID_CONFIG.content_sources) => 
  ConfigHelper.shouldUseRealAPI(contentType);

export const useMockFallback = (contentType: keyof typeof HYBRID_CONFIG.content_sources) => 
  ConfigHelper.shouldFallbackToMock(contentType);

export const debugLog = ConfigHelper.debugLog;

export const isDebug = ConfigHelper.isDebugMode;

// 🔧 Validar configuración al cargar
const configValidation = ConfigHelper.validateConfig();
if (!configValidation.valid) {
  console.warn('⚠️ Problemas de configuración híbrida:', configValidation.issues);
}

console.log('🔧 Configuración híbrida cargada:', {
  useRealAPI: HYBRID_CONFIG.use_real_api,
  propertiesSource: HYBRID_CONFIG.content_sources.properties,
  fallbackEnabled: HYBRID_CONFIG.fallback_to_mock,
  debugMode: HYBRID_CONFIG.debug_mode
});