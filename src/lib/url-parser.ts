// src/lib/url-parser.ts

export interface ParsedURL {
  type: 'property-list' | 'property-detail' | 'article' | 'advisor' | '404';
  action?: 'comprar' | 'alquilar';
  propertyType?: string;
  location?: {
    province?: string;
    city?: string;
    sector?: string;
  };
  propertySlug?: string;
  filters?: {
    bedrooms?: number;
    bathrooms?: number;
    priceMin?: number;
    priceMax?: number;
    parkingSpaces?: number;
    amenities?: string[];
    features?: string[];
  };
  meta?: {
    title: string;
    description: string;
    canonical?: string;
  };
}

// Mapeo de tipos de propiedad válidos
const PROPERTY_TYPES = [
  'villa', 'apartamento', 'casa', 'penthouse', 
  'terreno', 'local-comercial', 'oficina'
];

// Provincias y sus ciudades/sectores
const LOCATIONS = {
  'distrito-nacional': {
    name: 'Distrito Nacional',
    sectors: ['piantini', 'naco', 'evaristo-morales', 'bella-vista', 'gazcue']
  },
  'la-altagracia': {
    name: 'La Altagracia',
    cities: {
      'punta-cana': ['bavaro', 'cortecito', 'cap-cana', 'uvero-alto'],
      'higüey': ['centro', 'la-otra-banda']
    }
  },
  'santiago': {
    name: 'Santiago',
    sectors: ['centro', 'jardines-metropolitanos', 'cerros-de-gurabo']
  },
  'puerto-plata': {
    name: 'Puerto Plata',
    cities: {
      'cabarete': ['centro', 'encuentro'],
      'sosua': ['centro', 'el-batey']
    }
  }
};

export function parseURL(segments: string[]): ParsedURL {
  if (segments.length === 0) {
    return { type: '404' };
  }

  const [first, ...rest] = segments;

  // Rutas principales
  switch (first) {
    case 'comprar':
    case 'alquilar':
      return parsePropertyURL(first as 'comprar' | 'alquilar', rest);
    
    case 'articulos':
      return parseArticleURL(rest);
    
    case 'asesores':
      return parseAdvisorURL(rest);
    
    default:
      return { type: '404' };
  }
}

function parsePropertyURL(action: 'comprar' | 'alquilar', segments: string[]): ParsedURL {
  if (segments.length === 0) {
    // /comprar o /alquilar - mostrar todos
    return {
      type: 'property-list',
      action,
      meta: {
        title: `Propiedades en ${action === 'comprar' ? 'venta' : 'alquiler'} en República Dominicana`,
        description: `Encuentra las mejores propiedades para ${action} en todo el país`
      }
    };
  }

  let propertyType: string | undefined;
  let location: ParsedURL['location'] = {};
  let propertySlug: string | undefined;
  let filters: ParsedURL['filters'] = {};
  let currentIndex = 0;

  // 1. Verificar si es un tipo de propiedad
  if (PROPERTY_TYPES.includes(segments[currentIndex])) {
    propertyType = segments[currentIndex];
    currentIndex++;
  }

  // 2. Parsear ubicación (puede ser provincia, ciudad o sector)
  if (currentIndex < segments.length) {
    const locationSegment = segments[currentIndex];
    
    // Verificar si es una provincia
    if (LOCATIONS[locationSegment]) {
      location.province = locationSegment;
      currentIndex++;
      
      // Verificar si hay ciudad/sector
      if (currentIndex < segments.length) {
        const nextSegment = segments[currentIndex];
        const locationData = LOCATIONS[locationSegment];
        
        // Verificar si es una ciudad con sectores
        if ('cities' in locationData && locationData.cities[nextSegment]) {
          location.city = nextSegment;
          currentIndex++;
          
          // Verificar sector
          if (currentIndex < segments.length && 
              locationData.cities[nextSegment].includes(segments[currentIndex])) {
            location.sector = segments[currentIndex];
            currentIndex++;
          }
        }
        // O si es un sector directo
        else if ('sectors' in locationData && locationData.sectors.includes(nextSegment)) {
          location.sector = nextSegment;
          currentIndex++;
        }
      }
    }
    // Si no es provincia, podría ser una ciudad popular directa
    else if (['punta-cana', 'bavaro', 'santiago', 'santo-domingo'].includes(locationSegment)) {
      location.city = locationSegment;
      currentIndex++;
    }
  }

  // 3. El resto puede ser el slug de la propiedad o filtros
  if (currentIndex < segments.length) {
    const remaining = segments.slice(currentIndex);
    
    // Si el último segmento parece un slug de propiedad (contiene guiones y termina con habitaciones)
    const lastSegment = remaining[remaining.length - 1];
    if (lastSegment.match(/^[\w-]+-\d+h$/)) {
      propertySlug = lastSegment;
      // Los segmentos anteriores son filtros
      filters = parseFilters(remaining.slice(0, -1));
    } else {
      // Todos son filtros
      filters = parseFilters(remaining);
    }
  }

  // Determinar el tipo de página
  if (propertySlug) {
    return {
      type: 'property-detail',
      action,
      propertyType,
      location,
      propertySlug,
      meta: generateMeta({ action, propertyType, location, propertySlug })
    };
  } else {
    return {
      type: 'property-list',
      action,
      propertyType,
      location,
      filters,
      meta: generateMeta({ action, propertyType, location, filters })
    };
  }
}

function parseFilters(segments: string[]): ParsedURL['filters'] {
  const filters: ParsedURL['filters'] = {};
  const amenities: string[] = [];
  const features: string[] = [];

  segments.forEach(segment => {
    // Habitaciones: 3-habitaciones
    if (segment.match(/^\d+-habitacion(es)?$/)) {
      filters.bedrooms = parseInt(segment);
    }
    // Baños: 2-banos
    else if (segment.match(/^\d+-bano?s?$/)) {
      filters.bathrooms = parseInt(segment);
    }
    // Parqueos: 2-parqueos
    else if (segment.match(/^\d+-parqueo?s?$/)) {
      filters.parkingSpaces = parseInt(segment);
    }
    // Precio: precio-200000-500000 o precio-desde-200000 o precio-hasta-500000
    else if (segment.startsWith('precio-')) {
      const priceMatch = segment.match(/precio-(\d+)-(\d+)/);
      if (priceMatch) {
        filters.priceMin = parseInt(priceMatch[1]);
        filters.priceMax = parseInt(priceMatch[2]);
      } else if (segment.match(/precio-desde-(\d+)/)) {
        filters.priceMin = parseInt(segment.match(/precio-desde-(\d+)/)[1]);
      } else if (segment.match(/precio-hasta-(\d+)/)) {
        filters.priceMax = parseInt(segment.match(/precio-hasta-(\d+)/)[1]);
      }
    }
    // Amenidades: con-piscina, con-gym
    else if (segment.startsWith('con-')) {
      amenities.push(segment.replace('con-', '').replace(/-/g, ' '));
    }
    // Características especiales
    else if (['amueblado', 'sin-amueblar', 'nueva-construccion', 'vista-al-mar'].includes(segment)) {
      features.push(segment.replace(/-/g, ' '));
    }
  });

  if (amenities.length > 0) filters.amenities = amenities;
  if (features.length > 0) filters.features = features;

  return filters;
}

function parseArticleURL(segments: string[]): ParsedURL {
  if (segments.length === 0) {
    return {
      type: 'property-list', // Lista de artículos
      meta: {
        title: 'Blog Inmobiliario - Consejos y Noticias',
        description: 'Lee los últimos artículos sobre el mercado inmobiliario en República Dominicana'
      }
    };
  }

  // articulos/categoria/slug o articulos/slug
  return {
    type: 'article',
    meta: {
      title: 'Artículo del Blog',
      description: 'Artículo sobre bienes raíces'
    }
  };
}

function parseAdvisorURL(segments: string[]): ParsedURL {
  if (segments.length === 0) {
    return {
      type: 'property-list', // Lista de asesores
      meta: {
        title: 'Nuestros Asesores Inmobiliarios',
        description: 'Conoce a nuestro equipo de expertos en bienes raíces'
      }
    };
  }

  return {
    type: 'advisor',
    meta: {
      title: 'Perfil del Asesor',
      description: 'Asesor inmobiliario experto'
    }
  };
}

function generateMeta(params: any): ParsedURL['meta'] {
  let title = '';
  let description = '';

  // Generar título dinámico basado en los parámetros
  if (params.propertySlug) {
    // Para detalle de propiedad
    title = 'Propiedad en ' + (params.location?.city || params.location?.province || 'República Dominicana');
  } else {
    // Para listados
    const action = params.action === 'comprar' ? 'Venta' : 'Alquiler';
    const type = params.propertyType ? 
      params.propertyType.charAt(0).toUpperCase() + params.propertyType.slice(1) + 's' : 
      'Propiedades';
    
    title = `${type} en ${action}`;
    
    if (params.location?.sector) {
      title += ` en ${params.location.sector.replace(/-/g, ' ')}`;
    } else if (params.location?.city) {
      title += ` en ${params.location.city.replace(/-/g, ' ')}`;
    } else if (params.location?.province) {
      const provinceName = LOCATIONS[params.location.province]?.name || params.location.province;
      title += ` en ${provinceName}`;
    }

    // Agregar filtros al título
    if (params.filters?.bedrooms) {
      title += ` - ${params.filters.bedrooms} Habitaciones`;
    }
    if (params.filters?.priceMin || params.filters?.priceMax) {
      if (params.filters.priceMin && params.filters.priceMax) {
        title += ` - $${params.filters.priceMin.toLocaleString()} a $${params.filters.priceMax.toLocaleString()}`;
      } else if (params.filters.priceMin) {
        title += ` - Desde $${params.filters.priceMin.toLocaleString()}`;
      } else if (params.filters.priceMax) {
        title += ` - Hasta $${params.filters.priceMax.toLocaleString()}`;
      }
    }

    description = `Encuentra ${type.toLowerCase()} para ${params.action} en ${
      params.location?.sector || params.location?.city || params.location?.province || 'República Dominicana'
    }. Las mejores opciones del mercado inmobiliario.`;
  }

  return { title, description };
}