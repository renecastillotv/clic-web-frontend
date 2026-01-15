// src/data/mockProvider.ts
import { mockDatabase } from './mockDatabase';
import type { Property, Article, Advisor, Video, Testimonial, PageData } from './types';

/**
 * 🎯 PROVEEDOR CENTRALIZADO DE DATOS MOCK
 * 
 * Esta clase centraliza toda la lógica de obtención de datos mock
 * y preparara el camino para la migración a Supabase
 */
export class MockProvider {
  
  /**
   * 🔍 FUNCIÓN PRINCIPAL: Obtener datos completos de página
   * Equivalente al actual getMockPageData() pero centralizado
   */
  static async getFullPageData(segments: string[]): Promise<PageData> {
    const path = '/' + segments.join('/');
    console.log('🔍 MockProvider.getFullPageData:', { segments, path });
    
    // 1. Verificar si es una propiedad individual
    if (this.isPropertyDetailRoute(segments)) {
      return this.getPropertyDetailData(segments);
    }
    
    // 2. Verificar si es un artículo
    if (this.isArticleRoute(segments)) {
      return this.getArticleData(segments);
    }
    
    // 3. Verificar si es un asesor
    if (this.isAdvisorRoute(segments)) {
      return this.getAdvisorData(segments);
    }
    
    // 4. Es un listado de propiedades
    if (this.isPropertyListRoute(segments)) {
      return this.getPropertyListData(segments);
    }
    
    // 5. 404
    return this.get404Data();
  }

  /**
   * 🏠 FUNCIÓN ESPECÍFICA: Solo resultados de búsqueda
   * Para fetch parcial y navegación híbrida
   */
  static async getSearchResults(filters: any, options: { limit?: number; offset?: number } = {}): Promise<{
    properties: Property[];
    total: number;
    hasMore: boolean;
  }> {
    console.log('🔍 MockProvider.getSearchResults:', { filters, options });
    
    const allProperties = mockDatabase.getAllProperties();
    const filteredProperties = this.filterProperties(allProperties, filters);
    
    const { limit = 12, offset = 0 } = options;
    const paginatedProperties = filteredProperties.slice(offset, offset + limit);
    
    return {
      properties: paginatedProperties,
      total: filteredProperties.length,
      hasMore: (offset + limit) < filteredProperties.length
    };
  }

  // ===============================
  // 🔧 MÉTODOS PRIVADOS DE DETECCIÓN
  // ===============================

  private static isPropertyDetailRoute(segments: string[]): boolean {
    // Formato: /comprar/villa/punta-cana/villa-slug
    // O formato legacy: /propiedad/villa-slug
    if (segments.length >= 2 && segments[0] === 'propiedad') {
      return true;
    }
    
    if (segments.length >= 3 && (segments[0] === 'comprar' || segments[0] === 'alquilar')) {
      const lastSegment = segments[segments.length - 1];
      return mockDatabase.propertyExists(lastSegment);
    }
    
    return false;
  }

  private static isArticleRoute(segments: string[]): boolean {
    return segments.length >= 2 && segments[0] === 'articulos';
  }

  private static isAdvisorRoute(segments: string[]): boolean {
    return segments.length === 2 && segments[0] === 'asesores';
  }

  private static isPropertyListRoute(segments: string[]): boolean {
    return segments.length >= 1 && 
           (segments[0] === 'comprar' || segments[0] === 'alquilar');
  }

  // ===============================
  // 🏠 GENERADORES DE DATOS POR TIPO
  // ===============================

  private static async getPropertyDetailData(segments: string[]): Promise<PageData> {
    let propertySlug: string;
    
    // Determinar el slug según el formato
    if (segments[0] === 'propiedad') {
      propertySlug = segments[1];
    } else {
      propertySlug = segments[segments.length - 1];
    }
    
    const property = mockDatabase.getPropertyBySlug(propertySlug);
    
    if (!property) {
      return this.get404Data();
    }
    
    return {
      type: 'property',
      property,
      meta: {
        title: property.titulo,
        description: property.descripcion || `${property.titulo} en ${property.sector}`
      }
    };
  }

  private static async getPropertyListData(segments: string[]): Promise<PageData> {
    const filters = this.parseFiltersFromSegments(segments);
    const { properties, total } = await this.getSearchResults(filters);
    
    const title = this.generateListingTitle(filters);
    const description = this.generateListingDescription(filters, total);
    
    return {
      type: 'property-list',
      listings: properties,
      total,
      filters,
      meta: { title, description },
      
      // 🎯 CONTENIDO ADICIONAL para páginas completas
      videos: this.getRelatedVideos(filters),
      articles: this.getRelatedArticles(filters),
      testimonials: this.getRelatedTestimonials(filters),
      advisors: this.getAreaAdvisors(filters),
      thematicLists: this.getThematicLists(filters)
    };
  }

  private static async getArticleData(segments: string[]): Promise<PageData> {
    const articleSlug = segments[segments.length - 1];
    const article = mockDatabase.getArticleBySlug(articleSlug);
    
    if (!article) {
      return this.get404Data();
    }
    
    return {
      type: 'article',
      article,
      meta: {
        title: article.title,
        description: article.excerpt || article.title
      }
    };
  }

  private static async getAdvisorData(segments: string[]): Promise<PageData> {
    const advisorSlug = segments[1];
    const advisor = mockDatabase.getAdvisorBySlug(advisorSlug);
    
    if (!advisor) {
      return this.get404Data();
    }
    
    return {
      type: 'advisor',
      advisor,
      meta: {
        title: `${advisor.name} - Asesor Inmobiliario`,
        description: advisor.bio || `Conoce a ${advisor.name}, asesor especializado en ${advisor.specialties.join(', ')}`
      }
    };
  }

  private static get404Data(): PageData {
    return {
      type: '404',
      meta: {
        title: 'Página no encontrada',
        description: 'La página que buscas no existe o ha sido movida.'
      }
    };
  }

  // ===============================
  // 🔍 SISTEMA DE FILTROS
  // ===============================

  private static parseFiltersFromSegments(segments: string[]): any {
    const filters: any = {
      accion: segments[0] || 'comprar',
      tipo: '',
      ubicacion: '',
      sector: '',
      precioMin: '',
      precioMax: '',
      moneda: 'USD',
      habitaciones: '',
      banos: '',
      parqueos: '',
      caracteristicas: []
    };

    // Mapeos para detectar tipos conocidos
    const tiposConocidos = ['apartamento', 'villa', 'casa', 'penthouse', 'terreno'];
    const ubicacionesConocidas = ['distrito-nacional', 'santiago', 'punta-cana', 'la-romana'];
    
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      
      // Tipo de propiedad
      if (tiposConocidos.includes(segment) && !filters.tipo) {
        filters.tipo = segment;
      }
      // Ubicación
      else if (ubicacionesConocidas.includes(segment) && !filters.ubicacion) {
        filters.ubicacion = segment;
      }
      // Precio: precio-desde-200000-500000-usd
      else if (segment.startsWith('precio-desde-')) {
        const priceMatch = segment.match(/precio-desde-(\d+)(?:-(\d+))?-(usd|dop)/i);
        if (priceMatch) {
          filters.precioMin = priceMatch[1];
          filters.precioMax = priceMatch[2] || '';
          filters.moneda = priceMatch[3].toUpperCase();
        }
      }
      // Habitaciones
      else if (segment.endsWith('-habitaciones')) {
        filters.habitaciones = segment.replace('-habitaciones', '');
      }
      // Baños
      else if (segment.endsWith('-banos')) {
        filters.banos = segment.replace('-banos', '');
      }
      // Características
      else if (['amueblado', 'piscina', 'vista-al-mar', 'terraza'].includes(segment)) {
        filters.caracteristicas.push(segment);
      }
    }

    return filters;
  }

  private static filterProperties(properties: Property[], filters: any): Property[] {
    return properties.filter(property => {
      // Filtro por acción (comprar/alquilar)
      if (filters.accion === 'alquilar' && !property.titulo.toLowerCase().includes('alquiler')) {
        return false;
      }
      
      // Filtro por tipo
      if (filters.tipo) {
        const tipoNormalizado = filters.tipo.toLowerCase();
        const propertyTipo = property.tipo?.toLowerCase() || '';
        if (!propertyTipo.includes(tipoNormalizado)) {
          return false;
        }
      }
      
      // Filtro por ubicación
      if (filters.ubicacion) {
        const ubicacionNormalizada = filters.ubicacion.replace('-', ' ').toLowerCase();
        const propertySector = property.sector?.toLowerCase() || '';
        if (!propertySector.includes(ubicacionNormalizada) && 
            !propertySector.includes(ubicacionNormalizada.replace(' ', ''))) {
          return false;
        }
      }
      
      // Filtro por precio
      if (filters.precioMin || filters.precioMax) {
        const precio = this.extractPriceNumber(property.precio);
        const min = filters.precioMin ? parseInt(filters.precioMin) : 0;
        const max = filters.precioMax ? parseInt(filters.precioMax) : Infinity;
        
        // Conversión de moneda aproximada
        const rate = filters.moneda === 'DOP' ? 50 : 1;
        const adjustedMin = min * rate;
        const adjustedMax = max * rate;
        
        if (precio < adjustedMin || precio > adjustedMax) {
          return false;
        }
      }
      
      // Filtro por habitaciones
      if (filters.habitaciones) {
        const requiredRooms = parseInt(filters.habitaciones);
        if (property.habitaciones < requiredRooms) {
          return false;
        }
      }
      
      // Filtro por baños
      if (filters.banos) {
        const requiredBaths = parseInt(filters.banos);
        if (property.banos < requiredBaths) {
          return false;
        }
      }
      
      return true;
    });
  }

  private static extractPriceNumber(priceStr: string): number {
    return parseFloat(priceStr.replace(/[^\d]/g, '')) || 0;
  }

  // ===============================
  // 🎨 GENERADORES DE CONTENIDO
  // ===============================

  private static generateListingTitle(filters: any): string {
    let title = filters.accion === 'comprar' ? 'Propiedades en venta' : 'Propiedades en alquiler';
    
    if (filters.tipo) {
      const tipoLabel = filters.tipo.charAt(0).toUpperCase() + filters.tipo.slice(1) + 's';
      title = `${tipoLabel} ${filters.accion === 'comprar' ? 'en venta' : 'en alquiler'}`;
    }
    
    if (filters.ubicacion) {
      const ubicacionLabel = filters.ubicacion.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
      title += ` en ${ubicacionLabel}`;
    }
    
    return title;
  }

  private static generateListingDescription(filters: any, total: number): string {
    const action = filters.accion === 'comprar' ? 'comprar' : 'alquilar';
    const tipo = filters.tipo || 'propiedades';
    const ubicacion = filters.ubicacion ? ` en ${filters.ubicacion.replace('-', ' ')}` : '';
    
    return `Encuentra ${tipo} para ${action}${ubicacion}. ${total} opciones disponibles con los mejores precios del mercado.`;
  }

  private static getRelatedVideos(filters: any): Video[] {
    // Retornar videos relacionados basados en filtros
    return mockDatabase.getVideosByCategory(filters.tipo || 'general').slice(0, 3);
  }

  private static getRelatedArticles(filters: any): Article[] {
    // Retornar artículos relacionados
    return mockDatabase.getArticlesByCategory(filters.ubicacion || 'general').slice(0, 3);
  }

  private static getRelatedTestimonials(filters: any): Testimonial[] {
    // Retornar testimonios relacionados
    return mockDatabase.getTestimonialsByCategory('compradores').slice(0, 3);
  }

  private static getAreaAdvisors(filters: any): Advisor[] {
    // Retornar asesores de la zona
    return mockDatabase.getAdvisorsByArea(filters.ubicacion || 'general').slice(0, 2);
  }

  private static getThematicLists(filters: any): any[] {
    // Retornar listas temáticas
    return [
      {
        id: '1',
        title: 'Propiedades con Mayor ROI 2024',
        subtitle: 'Las mejores oportunidades de inversión',
        propertyCount: 25,
        averagePrice: '$350,000'
      }
    ];
  }
}

// ===============================
// 🚀 FUNCIONES DE CONVENIENCIA
// ===============================

/**
 * Función de conveniencia para [...slug].astro
 */
export async function getPageDataFromSegments(segments: string[]): Promise<PageData> {
  return MockProvider.getFullPageData(segments);
}

/**
 * Función de conveniencia para fetch parcial
 */
export async function getSearchResultsFromFilters(filters: any, options?: any) {
  return MockProvider.getSearchResults(filters, options);
}