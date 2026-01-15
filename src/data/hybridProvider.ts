// src/data/hybridProvider.ts - VERSIÓN MEJORADA SOLO CON ASESOR Y PROPIEDADES DEL ASESOR
// =====================================================
// PROVIDER BASADO EN EL QUE FUNCIONABA + MEJORAS DE ASESOR + COORDENADAS DE EDGE FUNCTION
// Actualizado para usar la nueva API de Neon en Vercel
// =====================================================

// Nueva API de Neon (reemplaza Supabase)
const API_URL = 'https://clic-api-neon.vercel.app';
// Mantener referencia a Supabase para funciones que aún lo necesiten (storage, etc)
const SUPABASE_URL = 'https://pacewqgypevfgjmdsorz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2V3cWd5cGV2ZmdqbWRzb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NjU4OTksImV4cCI6MjA2NDI0MTg5OX0.Qlg-UVy-sikr76GxYmTcfCz1EnAqPHxvFeLrdqnjuWs';

// Cache para evitar llamadas repetidas
const apiCache = new Map();
const CACHE_TTL = 30000; // 30 segundos

// =====================================================
// VALIDACIÓN DE SEGMENTOS (MANTENER ORIGINAL)
// =====================================================

function isValidPropertySegments(segments: string[]): boolean {
  if (!segments || segments.length === 0) return false;
  
  // Filtrar segmentos que NO son válidos para propiedades
  const invalidSegments = [
    'images', 'img', 'assets', 'static', 'public', 'favicon.ico',
    'css', 'js', 'fonts', '_astro', 'api', 'admin', 'robots.txt',
    'sitemap.xml', 'manifest.json', 'sw.js', '.well-known'
  ];
  
  // Extensiones de archivo que NO son válidas
  const fileExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
    '.css', '.js', '.json', '.xml', '.txt', '.pdf', '.zip',
    '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3'
  ];
  
  // Verificar si algún segmento es inválido
  for (const segment of segments) {
    const segmentLower = segment.toLowerCase();
    
    // Verificar segmentos inválidos
    if (invalidSegments.includes(segmentLower)) {
      console.log('❌ Segmento inválido detectado:', segment);
      return false;
    }
    
    // Verificar extensiones de archivo
    if (fileExtensions.some(ext => segmentLower.endsWith(ext))) {
      console.log('❌ Extensión de archivo detectada:', segment);
      return false;
    }
    
    // Verificar segmentos muy cortos o sospechosos
    if (segment.length < 2 && segments.length === 1) {
      console.log('❌ Segmento demasiado corto:', segment);
      return false;
    }
  }
  
  return true;
}

// =====================================================
// INTERFACES (MANTENER ORIGINALES + AGREGAR ASESOR)
// =====================================================

interface PropertyData {
  id: string | number;
  name?: string;
  title?: string;
  description?: string;
  price?: string;
  slug_url?: string;
  main_image_url?: string;
  gallery_images_url?: string;
  bedrooms?: number;
  bathrooms?: number;
  built_area?: number;
  parking_spots?: number;
  code?: string;
  property_status?: string;
  is_project?: boolean;
  sectors?: { name?: string; coordinates?: string | null }; // ✅ AGREGAR COORDENADAS POSTGIS
  cities?: { 
    name?: string; 
    coordinates?: string | null; // ✅ AGREGAR COORDENADAS POSTGIS
    provinces?: { 
      name?: string; 
      coordinates?: string | null // ✅ AGREGAR COORDENADAS POSTGIS
    } 
  };
  property_categories?: { name?: string };
  pricing_unified?: any;
  images_unified?: any[];
  property_images?: any[];
  project_detail_id?: string;
  agent_id?: string;
  property_amenities?: any[];
  location?: any; // ✅ AGREGAR TIPO PARA UBICACIÓN
}

interface Breadcrumb {
  name: string;
  slug?: string;
  url: string;
  category?: string;
  is_active?: boolean;
  position?: number;
  tag_id?: string;
  description?: string;
  icon?: string;
  current?: boolean;
  is_current_page?: boolean;
}

interface SimilarProperty {
  id: string | number;
  title: string;
  price: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  image: string;
  location: string;
  type?: string;
  url: string;
  is_project?: boolean;
  parking_spots?: number;
  coordinates?: { lat: number; lng: number } | null; // ✅ AGREGAR COORDENADAS
}

interface APIResponse {
  type: 'single-property' | 'single-property-project' | 'property-list' | 'error';
  available?: boolean;
  property?: PropertyData;
  location?: any; // ✅ AGREGAR DATOS DE UBICACIÓN
  searchResults?: {
    properties: PropertyData[];
    tags: any[];
    pagination: any;
  };
  projectDetails?: any;
  agent?: any;
  referralAgent?: any;
  // ✨ NUEVOS CAMPOS PARA PROPIEDADES DEL ASESOR
  agentProperties?: any[];
  agentPropertiesInfo?: any;
  relatedContent?: {
    articles: any[];
    videos: any[];
    testimonials: any[];
    faqs: any[];
    seo_content?: any[];
    content_source?: string;
    hierarchy_info?: {
      specific_count: number;
      tag_related_count: number;
      default_count: number;
    };
  };
  breadcrumbs?: Breadcrumb[];
  similarProperties?: SimilarProperty[];
  similarPropertiesDebug?: {
    total_found: number;
    tags_used: number;
    search_method: string;
  };
  seo?: any;
  meta?: {
    contentHierarchy?: any;
    contentSource?: string;
    tagRelatedContentUsed?: boolean;
    [key: string]: any;
  };
}

// =====================================================
// ✅ NUEVAS FUNCIONES: PROCESAMIENTO DE COORDENADAS (CORREGIDAS)
// =====================================================

// ✅ FUNCIÓN CORREGIDA: PARSEAR COORDENADAS POSTGIS CON MEJOR LOGGING
function parsePostGISCoordinates(postgisString: string): { lat: number; lng: number } | null {
  console.log('🔄 Parseando coordenadas PostGIS:', postgisString);
  
  if (!postgisString || typeof postgisString !== 'string') {
    console.log('⚠️ String PostGIS inválido:', postgisString);
    return null;
  }
  
  // Formato PostGIS: "(-70.4167,19.0333)" -> lng, lat
  const match = postgisString.match(/\(([-\d.]+),([-\d.]+)\)/);
  
  if (!match) {
    console.log('⚠️ No se pudo parsear formato PostGIS:', postgisString);
    return null;
  }
  
  const lng = parseFloat(match[1]);
  const lat = parseFloat(match[2]);
  
  if (isNaN(lng) || isNaN(lat)) {
    console.log('⚠️ Coordenadas PostGIS no son números válidos:', { lng, lat });
    return null;
  }
  
  const result = { lat, lng };
  console.log('✅ ¡COORDENADAS POSTGIS PARSEADAS CORRECTAMENTE!:', {
    original: postgisString,
    parsed: result,
    format: 'PostGIS -> {lat, lng}',
    lng: lng,
    lat: lat
  });
  
  return result;
}

// ✅ FUNCIÓN MEJORADA: EXTRAER COORDENADAS CON SOPORTE POSTGIS Y MEJOR LOGGING
function extractCoordinatesWithPostGIS(property: PropertyData): { lat: number; lng: number } | null {
  console.log('📍 === EXTRAYENDO COORDENADAS CON SOPORTE POSTGIS (MEJORADO) ===');
  console.log('🏠 Property data completo:', {
    id: property?.id,
    sectors: property?.sectors,
    cities: property?.cities,
    hasLocation: !!property?.location,
    // ✅ LOGGING ESPECÍFICO DE COORDENADAS
    cityCoordinates: property?.cities?.coordinates,
    sectorCoordinates: property?.sectors?.coordinates,
    provinceCoordinates: property?.cities?.provinces?.coordinates
  });
  
  // 1. INTENTAR COORDENADAS DE LOCATION (si existen)
  if (property?.location?.coordinates) {
    console.log('🎯 Intentando coordenadas de property.location:', property.location.coordinates);
    
    if (typeof property.location.coordinates === 'string') {
      const parsed = parsePostGISCoordinates(property.location.coordinates);
      if (parsed) {
        console.log('✅ Coordenadas de location parseadas exitosamente:', parsed);
        return parsed;
      }
    } else if (property.location.coordinates.lat && property.location.coordinates.lng) {
      console.log('✅ Coordenadas de location ya en formato objeto');
      return property.location.coordinates;
    }
  }
  
  // 2. ✅ INTENTAR COORDENADAS DE CIUDAD (CASO MÁS COMÚN)
  if (property?.cities?.coordinates) {
    console.log('🎯 Intentando coordenadas de ciudad:', property.cities.coordinates);
    console.log('🎯 Tipo de coordenadas de ciudad:', typeof property.cities.coordinates);
    const parsed = parsePostGISCoordinates(property.cities.coordinates);
    if (parsed) {
      console.log('✅ ¡COORDENADAS DE CIUDAD PARSEADAS EXITOSAMENTE!:', parsed);
      return parsed;
    } else {
      console.log('❌ Falló el parsing de coordenadas de ciudad');
    }
  } else {
    console.log('⚠️ No hay property.cities.coordinates');
  }
  
  // 3. INTENTAR COORDENADAS DE SECTOR
  if (property?.sectors?.coordinates) {
    console.log('🎯 Intentando coordenadas de sector:', property.sectors.coordinates);
    const parsed = parsePostGISCoordinates(property.sectors.coordinates);
    if (parsed) {
      console.log('✅ Coordenadas de sector parseadas exitosamente:', parsed);
      return parsed;
    }
  } else {
    console.log('⚠️ No hay property.sectors.coordinates');
  }
  
  // 4. INTENTAR COORDENADAS DE PROVINCIA
  if (property?.cities?.provinces?.coordinates) {
    console.log('🎯 Intentando coordenadas de provincia:', property.cities.provinces.coordinates);
    const parsed = parsePostGISCoordinates(property.cities.provinces.coordinates);
    if (parsed) {
      console.log('✅ Coordenadas de provincia parseadas exitosamente:', parsed);
      return parsed;
    }
  } else {
    console.log('⚠️ No hay property.cities.provinces.coordinates');
  }
  
  console.log('⚠️ No se encontraron coordenadas válidas en ningún nivel');
  return null;
}

// ✅ FUNCIÓN CORREGIDA: PROCESAR UBICACIÓN CON FALLBACK A PROPERTY
function processLocationFromAPI(apiLocation: any, propertyData?: PropertyData) {
  console.log('📍 === PROCESANDO UBICACIÓN DE LA API (CORREGIDO) ===');
  console.log('🗺️ API Location recibido:', apiLocation);
  console.log('🗺️ Property data recibido:', !!propertyData);
  console.log('🗺️ Property data preview:', propertyData ? {
    id: propertyData.id,
    cityCoordinates: propertyData.cities?.coordinates,
    sectorCoordinates: propertyData.sectors?.coordinates
  } : 'NO PROPERTY DATA');

  let finalCoordinates = null;

  // 1. INTENTAR COORDENADAS DIRECTAS DE LA API
  if (apiLocation?.coordinates) {
    console.log('🎯 Intentando coordenadas directas de API:', apiLocation.coordinates);
    
    if (typeof apiLocation.coordinates === 'string') {
      console.log('🎯 Coordenadas son string, parseando PostGIS...');
      finalCoordinates = parsePostGISCoordinates(apiLocation.coordinates);
    } else if (apiLocation.coordinates.lat && apiLocation.coordinates.lng) {
      console.log('🎯 Coordenadas ya son objeto válido');
      finalCoordinates = apiLocation.coordinates;
    }
  }

  // 2. SI NO HAY COORDENADAS DIRECTAS, BUSCAR EN PROPERTY DE APILOCATION
  if (!finalCoordinates && apiLocation?.property) {
    console.log('🔄 Buscando coordenadas en apiLocation.property...');
    finalCoordinates = extractCoordinatesWithPostGIS(apiLocation.property);
  }

  // 3. ✅ NUEVO: SI AÚN NO HAY COORDENADAS, USAR PROPERTYDATA DIRECTAMENTE
  if (!finalCoordinates && propertyData) {
    console.log('🔄 ¡BUSCANDO COORDENADAS EN PROPERTYDATA DIRECTAMENTE!...');
    console.log('🔍 PropertyData cities.coordinates:', propertyData.cities?.coordinates);
    finalCoordinates = extractCoordinatesWithPostGIS(propertyData);
    console.log('🎯 Resultado de extractCoordinatesWithPostGIS:', finalCoordinates);
  }

  // 4. SIN FALLBACK HARDCODEADO - SOLO NULL
  if (!finalCoordinates) {
    console.log('⚠️ No se encontraron coordenadas reales');
    return {
      coordinates: null,
      hasExactCoordinates: false,
      showExactLocation: false,
      coordinatesSource: 'none',
      address: apiLocation?.address || '',
      sector: apiLocation?.sector || propertyData?.sectors?.name || null,
      city: apiLocation?.city || propertyData?.cities?.name || null,
      province: apiLocation?.province || propertyData?.cities?.provinces?.name || null,
      mapConfig: {
        zoom: 6,
        showMarker: false,
        showAreaCircle: false,
        circleRadius: 0
      },
      debug: {
        processingSource: 'no_coordinates_found',
        postgisParsingUsed: false,
        coordinatesFoundIn: 'none',
        hadPropertyData: !!propertyData,
        hadApiLocation: !!apiLocation
      }
    };
  }

  // ✅ SOLO SI HAY COORDENADAS REALES
  const processedLocation = {
    coordinates: finalCoordinates,
    hasExactCoordinates: true, // Si hay coords, son reales
    showExactLocation: apiLocation?.showExactLocation || propertyData?.show_exact_location || false,
    coordinatesSource: 'parsed_postgis',
    
    address: apiLocation?.address || '',
    sector: apiLocation?.sector || propertyData?.sectors?.name || null,
    city: apiLocation?.city || propertyData?.cities?.name || null,
    province: apiLocation?.province || propertyData?.cities?.provinces?.name || null,
    
    mapConfig: {
      zoom: 14, // ZOOM NORMAL PARA COORDENADAS REALES
      showMarker: true, // MOSTRAR PIN CON COORDENADAS REALES
      showAreaCircle: true,
      circleRadius: 750
    },
    
    debug: {
      processingSource: 'processLocationFromAPI_with_fallback',
      hasExactButHidden: false,
      fallbackReason: null,
      rawFromAPI: !!apiLocation,
      postgisParsingUsed: true,
      coordinatesFoundIn: finalCoordinates ? 
        (apiLocation?.coordinates ? 'api_direct' : 
         apiLocation?.property ? 'api_property' : 
         'direct_property') : 'none',
      hadPropertyData: !!propertyData,
      hadApiLocation: !!apiLocation
    }
  };

  console.log('✅ ¡UBICACIÓN PROCESADA CON COORDENADAS REALES!:', {
    hasCoordinates: !!processedLocation.coordinates,
    coordinates: processedLocation.coordinates,
    source: processedLocation.coordinatesSource,
    showExact: processedLocation.showExactLocation,
    zoom: processedLocation.mapConfig.zoom,
    showMarker: processedLocation.mapConfig.showMarker,
    address: processedLocation.address,
    coordinatesFoundIn: processedLocation.debug.coordinatesFoundIn
  });

  return processedLocation;
}

// ✅ FUNCIÓN SIN HARDCODING: SOLO COORDENADAS REALES
function getDefaultCoordinates() {
  console.log('🔄 No hay coordenadas válidas disponibles');
  return null; // ← SIN COORDENADAS HARDCODEADAS
}

// ✅ FUNCIÓN SIN HARDCODING: SOLO COORDENADAS REALES
function extractCoordinates(property: PropertyData) {
  console.log('⚠️ Usando función legacy extractCoordinates - solo coordenadas reales');
  
  // Solo intentar con PostGIS - SIN MAPA HARDCODEADO
  const postgisCoords = extractCoordinatesWithPostGIS(property);
  if (postgisCoords) {
    console.log('✅ Coordenadas encontradas via PostGIS');
    return postgisCoords;
  }
  
  console.log('⚠️ No hay coordenadas reales disponibles');
  return null; // ← SIN FALLBACK HARDCODEADO
}

// =====================================================
// ✨ NUEVA FUNCIÓN: PROCESAR PROPIEDADES DEL ASESOR
// =====================================================

function processAgentProperties(apiAgentProperties: any[] | undefined): any[] {
  console.log('👤 === PROCESANDO PROPIEDADES DEL ASESOR EN PROVIDER ===');
  console.log('📊 API agent properties recibidas:', apiAgentProperties?.length || 0);

  if (!apiAgentProperties || apiAgentProperties.length === 0) {
    console.log('⚠️ No hay propiedades del asesor de la API');
    return [];
  }

  const processedAgentProperties = apiAgentProperties.map((property, index) => ({
    id: property.id,
    slug: property.url || `/propiedad/${property.id}`,
    titulo: formatTitle(property.title || 'Propiedad sin nombre'),
    precio: property.price || 'Precio a consultar',
    imagen: property.image || '/images/placeholder-property.jpg',
    imagenes: [property.image || '/images/placeholder-property.jpg'],
    sector: sanitizeText(property.location || ''),
    habitaciones: property.bedrooms || 0,
    banos: property.bathrooms || 0,
    metros: property.area || 0,
    tipo: sanitizeText(property.type || 'Apartamento'),
    url: property.url || `/propiedad/${property.id}`,
    code: `AG-${property.id}`,
    isFormattedByProvider: true,
    is_project: property.is_project || false,
    parking_spots: property.parking_spots || 0,
    agent_property_rank: index + 1,
    is_agent_property: true,
    source: 'agent_properties',
    // ✅ AGREGAR COORDENADAS SI ESTÁN DISPONIBLES
    coordinates: property.location?.coordinates || null,
    hasCoordinates: !!(property.location?.coordinates)
  }));

  console.log('✅ Propiedades del asesor procesadas:', processedAgentProperties.length);
  return processedAgentProperties;
}

function generateAgentPropertiesInfo(apiAgentPropertiesInfo: any, agentProperties: any[]): any {
  return {
    total_found: agentProperties.length,
    agent_id: apiAgentPropertiesInfo?.agent_id || null,
    excluded_property: apiAgentPropertiesInfo?.excluded_property || null,
    has_agent_properties: agentProperties.length > 0,
    purpose: apiAgentPropertiesInfo?.purpose || 'agent_showcase',
    display_limit: Math.min(agentProperties.length, 6),
    provider_processed: true
  };
}

// =====================================================
// ✨ FUNCIÓN MEJORADA: FORMATEAR ASESOR
// =====================================================

function formatAgent(agentData: any) {
  console.log('👤 Formateando datos del asesor:', {
    hasAgent: !!agentData,
    agentName: agentData?.name,
    hasLanguages: !!agentData?.languages,
    languagesType: typeof agentData?.languages,
    languagesValue: agentData?.languages
  });

  if (!agentData) {
    return {
      name: 'CLIC Inmobiliaria',
      phone: '+1-829-555-0100',
      email: 'info@clicinmobiliaria.com',
      position: 'Equipo Comercial',
      whatsapp: 'https://wa.me/18295550100',
      image: '/images/default-agent.jpg',
      rating: 4.9,
      code: 'CLIC001',
      profile_photo_url: '/images/default-agent.jpg',
      years_experience: 5,
      specialty_description: 'Asesor inmobiliario especializado en propiedades residenciales',
      languages: ['Español'],
      biography: 'Asesor inmobiliario con experiencia en el mercado dominicano',
      social: {
        facebook: null,
        instagram: null,
        twitter: null,
        linkedin: null,
        youtube: null
      }
    };
  }
  
  // ✨ PROCESAR IDIOMAS COMO JSON ARRAY
  let processedLanguages = ['Español']; // Default
  
  if (agentData.languages) {
    try {
      if (typeof agentData.languages === 'string') {
        // Si es un string, intentar parsearlo como JSON
        if (agentData.languages.startsWith('[') && agentData.languages.endsWith(']')) {
          processedLanguages = JSON.parse(agentData.languages);
        } else {
          // Si es un string simple, dividir por comas
          processedLanguages = agentData.languages.split(',').map((lang: string) => lang.trim());
        }
      } else if (Array.isArray(agentData.languages)) {
        // Si ya es un array, usarlo directamente
        processedLanguages = agentData.languages;
      }
    } catch (error) {
      console.warn('Error procesando idiomas del asesor:', error);
      processedLanguages = ['Español'];
    }
  }

  console.log('✅ Idiomas procesados:', processedLanguages);
  
  return {
    // Información básica
    name: sanitizeText(agentData.name || 'CLIC Inmobiliaria'),
    phone: agentData.phone || '+1-829-555-0100',
    email: agentData.email || 'info@clicinmobiliaria.com',
    position: sanitizeText(agentData.position || 'Asesor Inmobiliario'),
    whatsapp: formatWhatsApp(agentData.phone),
    
    // Imágenes y visuales
    image: agentData.profile_photo_url || agentData.image || '/images/default-agent.jpg',
    profile_photo_url: agentData.profile_photo_url || '/images/default-agent.jpg',
    
    // Información profesional
    rating: agentData.rating || 4.9,
    code: agentData.external_id || agentData.code || 'AGENT001',
    years_experience: agentData.years_experience || 0,
    specialty_description: sanitizeText(agentData.specialty_description || ''),
    
    // ✨ IDIOMAS PROCESADOS COMO ARRAY
    languages: processedLanguages,
    
    // Descripción y biografía
    biography: cleanDescription(agentData.biography || ''),
    
    // Información adicional
    slug: agentData.slug,
    
    // ✨ REDES SOCIALES COMPLETAS
    social: {
      facebook: agentData.social?.facebook || null,
      instagram: agentData.social?.instagram || null,
      twitter: agentData.social?.twitter || null,
      linkedin: agentData.social?.linkedin || null,
      youtube: agentData.social?.youtube || null
    },
    
    // ✨ CAMPOS ADMINISTRATIVOS ADICIONALES
    active: agentData.active,
    show_on_website: agentData.show_on_website,
    team_id: agentData.team_id,
    user_type: agentData.user_type,
    agent_type: agentData.agent_type || 'agent'
  };
}

// =====================================================
// FUNCIÓN PRINCIPAL DE API (MANTENER ORIGINAL)
// =====================================================

async function callUnifiedAPI(segments: string[], searchParams?: URLSearchParams): Promise<APIResponse> {
  if (!isValidPropertySegments(segments)) {
    console.log('❌ Segmentos inválidos, abortando llamada API:', segments);
    throw new Error('Invalid segments for property search');
  }
  
  console.log('🔄 Calling Unified Edge Function with segments:', segments);
  
  const cacheKey = `${segments.join('/')}${searchParams ? '?' + searchParams.toString() : ''}`;
  
  const cached = apiCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('📦 Returning cached result for:', cacheKey);
    return cached.data;
  }
  
  try {
    const cleanedSegments = cleanUrlSegments(segments);
    console.log('Cleaned segments:', cleanedSegments);
    
    if (!isValidPropertySegments(cleanedSegments)) {
      console.log('❌ Segmentos inválidos después de limpieza:', cleanedSegments);
      throw new Error('Invalid cleaned segments');
    }
    
    const apiPath = cleanedSegments.length > 0 ? `/${cleanedSegments.join('/')}` : '/';
    // Usar la nueva API de Neon en lugar de Supabase
    let apiUrl = `${API_URL}${apiPath}`;
    
    const params = new URLSearchParams();
    if (searchParams) {
      if (searchParams.get('ref')) params.set('ref', searchParams.get('ref')!);
      if (searchParams.get('page')) params.set('page', searchParams.get('page')!);
      if (searchParams.get('limit')) params.set('limit', searchParams.get('limit')!);
    }
    
    if (params.toString()) {
      apiUrl += `?${params.toString()}`;
    }
    
    console.log('Final API URL:', apiUrl);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    // La nueva API de Neon no requiere autenticación
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`API Error: ${response.status} ${response.statusText}`);
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('API Response type:', data.type);
    
    // ✅ LOGGING MEJORADO PARA UBICACIÓN Y COORDENADAS
    console.log('📊 API Response features:', {
      hasBreadcrumbs: !!data.breadcrumbs,
      breadcrumbsCount: data.breadcrumbs?.length || 0,
      hasSimilarProperties: !!data.similarProperties,
      similarPropertiesCount: data.similarProperties?.length || 0,
      // ✨ LOGS DE UBICACIÓN Y COORDENADAS
      hasLocation: !!data.location,
      hasCoordinates: !!(data.location?.coordinates),
      coordinatesSource: data.location?.coordinatesSource,
      showExactLocation: data.location?.showExactLocation,
      hasExactCoordinates: data.location?.hasExactCoordinates,
      mapZoom: data.location?.mapConfig?.zoom,
      // ✨ LOGS EXISTENTES
      hasAgent: !!(data.agent || data.referralAgent),
      agentName: data.agent?.name || data.referralAgent?.name,
      hasAgentProperties: !!data.agentProperties,
      agentPropertiesCount: data.agentProperties?.length || 0,
      hasAgentPropertiesInfo: !!data.agentPropertiesInfo,
      agentLanguages: data.agent?.languages || data.referralAgent?.languages,
      hasContentHierarchy: !!data.relatedContent?.hierarchy_info,
      contentSource: data.relatedContent?.content_source,
      hasSeoContent: !!(data.relatedContent?.seo_content?.length),
      seoContentCount: data.relatedContent?.seo_content?.length || 0,
      hasTagRelatedContent: !!data.meta?.tagRelatedContentUsed
    });
    
    apiCache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    if (apiCache.size > 50) {
      const keys = Array.from(apiCache.keys()).slice(0, 25);
      keys.forEach(key => apiCache.delete(key));
    }
    
    return data;
    
  } catch (error) {
    console.error('Error calling edge function:', error);
    
    if (error.message.includes('Invalid')) {
      throw error;
    }
    
    throw new Error(`API call failed: ${error.message}`);
  }
}

// =====================================================
// SINGLE PROPERTY HANDLER (MANTENER ORIGINAL + AGREGAR ASESOR)
// =====================================================

async function getSingleProperty(segments: string[], searchParams?: URLSearchParams) {
  try {
    if (!isValidPropertySegments(segments)) {
      console.log('❌ getSingleProperty: Segmentos inválidos:', segments);
      return null;
    }
    
    const apiData = await callUnifiedAPI(segments, searchParams);
    
    if (apiData.type === 'single-property' || apiData.type === 'single-property-project') {
      const formattedData = formatSinglePropertyResponse(apiData);
      
      console.log('✅ Single property formateada exitosamente con asesor mejorado');
      return formattedData;
    }
    
    if (!apiData.available && apiData.property) {
      return {
        type: 'property-sold',
        message: 'Esta propiedad ya no está disponible',
        property: apiData.property,
        alternatives: []
      };
    }
    
    return null;
    
  } catch (error) {
    console.error('Error getting single property:', error);
    
    if (error.message.includes('Invalid')) {
      return null;
    }
    
    return null;
  }
}

// =====================================================
// PROPERTY LIST HANDLER (MANTENER ORIGINAL)
// =====================================================

async function getPropertyList(segments: string[], searchParams?: URLSearchParams) {
  try {
    if (!isValidPropertySegments(segments)) {
      console.log('❌ getPropertyList: Segmentos inválidos:', segments);
      return getEmptyListResponse();
    }
    
    const apiData = await callUnifiedAPI(segments, searchParams);
    
    if (apiData.type === 'property-list') {
      const formattedData = formatPropertyListResponse(apiData);
      
      console.log('✅ Property list formateada exitosamente');
      return formattedData;
    }
    
    return getEmptyListResponse();
    
  } catch (error) {
    console.error('Error getting property list:', error);
    return getEmptyListResponse();
  }
}

// =====================================================
// FORMATTERS MEJORADOS (CON ASESOR Y PROPIEDADES DEL ASESOR)
// =====================================================

function formatSinglePropertyResponse(apiData: APIResponse) {
  const property = apiData.property!;
  const pricing = property.pricing_unified || {};
  const images = property.images_unified || [];
  const isProject = apiData.type === 'single-property-project';
  
  // 🔍 LOGGING TEMPORAL PARA DEBUG
  console.log('🚨 === DEBUG COORDENADAS EN formatSinglePropertyResponse ===');
  console.log('📊 apiData.location:', apiData.location);
  console.log('📊 property.cities:', property.cities);
  console.log('📊 property.cities.coordinates:', property.cities?.coordinates);
  console.log('📊 property.sectors:', property.sectors);
  console.log('📊 extractCoordinatesWithPostGIS result:', extractCoordinatesWithPostGIS(property));
  
  // Probar directamente el parsing
  if (property.cities?.coordinates) {
    console.log('🧪 Test parsePostGISCoordinates:', parsePostGISCoordinates(property.cities.coordinates));
  }
  
  const locationResult = processLocationFromAPI(apiData.location, property);
  console.log('🎯 processLocationFromAPI result:', locationResult);
  console.log('🚨 === FIN DEBUG ===');
  
  const basicInfo = {
    id: property.id,
    title: formatTitle(property.name || property.title || 'Propiedad sin nombre'),
    subtitle: generateSubtitle(property),
    description: cleanDescription(property.description || ''),
    reference: property.code || `REF-${property.id}`,
    location: formatLocation(property),
    sector: sanitizeText(property.sectors?.name || ''),
    city: sanitizeText(property.cities?.name || ''),
    province: sanitizeText(property.cities?.provinces?.name || ''),
    bedrooms: property.bedrooms || 0,
    bathrooms: property.bathrooms || 0,
    built_area: property.built_area || 0,
    parking_spots: property.parking_spots || 0,
    price: pricing.display_price?.formatted || 'Precio a consultar',
    reservation: 'US$1,000',
    property_status: property.property_status,
    is_project: property.is_project || false,
    category: sanitizeText(property.property_categories?.name || 'Apartamento'),
    slug_url: property.slug_url
  };

  const similarProperties = processSimilarProperties(apiData.similarProperties);
  const similarPropertiesInfo = generateSimilarPropertiesInfo(
    apiData.similarPropertiesDebug, 
    similarProperties
  );

  const agentProperties = processAgentProperties(apiData.agentProperties);
  const agentPropertiesInfo = generateAgentPropertiesInfo(
    apiData.agentPropertiesInfo, 
    agentProperties
  );

  // ✅ PROCESAR CONTENIDO PARA MOSTRAR
  const processedFaqs = processFAQsForDisplay(apiData.relatedContent, basicInfo, isProject);
  
  // 🔍 VERIFICACIÓN TEMPORAL: Buscar videos en AMBAS fuentes
  console.log('🔍 === VERIFICACIÓN DE FUENTES DE VIDEOS ===');
  console.log('📊 apiData.relatedContent?.videos:', apiData.relatedContent?.videos?.length || 0);
  console.log('📊 apiData.content?.videos:', apiData.content?.videos?.length || 0);
  console.log('📊 relatedContent existe:', !!apiData.relatedContent);
  console.log('📊 content existe:', !!apiData.content);
  
  // ✅ USAR LA FUENTE QUE TENGA VIDEOS
  let videoSource = null;
  if (apiData.relatedContent?.videos?.length > 0) {
    videoSource = apiData.relatedContent;
    console.log('✅ Usando relatedContent como fuente (tiene videos)');
  } else if (apiData.content?.videos?.length > 0) {
    videoSource = apiData.content;
    console.log('✅ Usando content como fuente (tiene videos)');
  } else {
    console.log('⚠️ No se encontraron videos en ninguna fuente');
  }
  
  const processedVideos = processVideosForDisplay(videoSource, basicInfo);

  return {
    type: 'property',
    isProject,
    available: apiData.available !== false,
    property: basicInfo,
    images: formatImagesArray(images),
    mainImage: getMainImage(images),
    pricing: {
      main: pricing.display_price,
      sale: pricing.sale,
      rental: pricing.rental,
      temp_rental: pricing.temp_rental,
      furnished_rental: pricing.furnished_rental,
      operation_type: pricing.operation_type || 'sale'
    },
    // ✨ ASESOR MEJORADO
    agent: formatAgent(apiData.agent || apiData.referralAgent),
    project: isProject && apiData.projectDetails ? formatProjectDetails(apiData.projectDetails) : null,
    hasProject: isProject && !!apiData.projectDetails,
    location: {
      // ✅ CORREGIDO: Pasar tanto apiData.location como property
      ...locationResult,
      googlePlaces: extractGooglePlacesData(apiData.seo)
    },
    amenities: formatAmenities(property.property_amenities || []),
    
    // ✅ MANTENER CONTENIDO ORIGINAL PARA BACKWARD COMPATIBILITY
    content: {
      articles: apiData.relatedContent?.articles || [],
      videos: apiData.relatedContent?.videos || [],
      testimonials: apiData.relatedContent?.testimonials || [],
      faqs: apiData.relatedContent?.faqs || [],
      seo_content: apiData.relatedContent?.seo_content || [],
      hasSpecificContent: apiData.relatedContent?.content_source?.includes('specific'),
      hasTagRelatedContent: apiData.relatedContent?.content_source?.includes('tag_related'),
      contentHierarchy: apiData.relatedContent?.hierarchy_info || {
        specific_count: 0,
        tag_related_count: 0,
        default_count: 0
      },
      contentSource: apiData.relatedContent?.content_source || 'general_only'
    },
    
    // ✅ NUEVA SECCIÓN: CONTENIDO LISTO PARA MOSTRAR
    displayContent: {
      faqs: processedFaqs,
      videos: processedVideos,
      articles: {
        all: apiData.relatedContent?.articles || [],
        specific: apiData.relatedContent?.articles?.filter(a => a.content_priority === 'specific') || [],
        tagRelated: apiData.relatedContent?.articles?.filter(a => a.content_priority === 'tag_related') || [],
        default: apiData.relatedContent?.articles?.filter(a => a.content_priority === 'default') || [],
        hasSpecific: apiData.relatedContent?.articles?.some(a => a.content_priority === 'specific') || false
      },
      testimonials: {
        all: apiData.relatedContent?.testimonials || [],
        specific: apiData.relatedContent?.testimonials?.filter(t => t.content_priority === 'specific') || [],
        tagRelated: apiData.relatedContent?.testimonials?.filter(t => t.content_priority === 'tag_related') || [],
        hasSpecific: apiData.relatedContent?.testimonials?.some(t => t.content_priority === 'specific') || false
      }
    },

    similarProperties: similarProperties,
    similarPropertiesInfo: similarPropertiesInfo,
    hasSimilarProperties: similarProperties.length > 0,
    // ✨ NUEVA SECCIÓN: PROPIEDADES DEL ASESOR
    agentProperties: agentProperties,
    agentPropertiesInfo: agentPropertiesInfo,
    hasAgentProperties: agentProperties.length > 0,
    seo: {
      title: sanitizeText(apiData.seo?.title || property.name || ''),
      description: cleanDescription(apiData.seo?.description || property.description?.substring(0, 160) || ''),
      keywords: apiData.seo?.keywords || [],
      og: apiData.seo?.og || {},
      structuredData: apiData.seo?.structured_data || {},
      h1: sanitizeText(apiData.seo?.h1 || property.name || '')
    },
    breadcrumbs: processBreadcrumbs(apiData.breadcrumbs, property, 'property'),
    meta: {
      timestamp: new Date().toISOString(),
      hasProject: isProject && !!apiData.projectDetails,
      hasAgent: !!(apiData.agent || apiData.referralAgent),
      imagesCount: images.length,
      hasBreadcrumbs: !!(apiData.breadcrumbs?.length),
      breadcrumbsSource: apiData.breadcrumbs?.length ? 'api' : 'fallback',
      hasSimilarProperties: similarProperties.length > 0,
      similarPropertiesCount: similarProperties.length,
      hasAgentProperties: agentProperties.length > 0,
      agentPropertiesCount: agentProperties.length,
      // ✅ METADATOS DE UBICACIÓN SIN HARDCODING
      hasLocationData: !!(apiData.location || property),
      locationSource: locationResult?.coordinatesSource || 'property_postgis',
      coordinatesFromAPI: !!(apiData.location?.coordinates),
      showExactLocation: locationResult?.showExactLocation || false,
      hasExactCoordinates: locationResult?.hasExactCoordinates || !!(extractCoordinatesWithPostGIS(property)),
      mapConfigFromAPI: !!(apiData.location?.mapConfig),
      postgisParsingUsed: !!(property.cities?.coordinates || property.sectors?.coordinates),
      hasRealCoordinates: !!(locationResult?.coordinates), // ← NUEVO: indica si hay coordenadas reales
      
      // ✅ METADATOS DEL CONTENIDO PROCESADO
      hasDisplayContent: true,
      displayContentProcessed: true,
      faqsProcessed: processedFaqs.totalCount,
      videosProcessed: processedVideos.totalCount,
      hasSpecificContent: processedFaqs.hasSpecificFaqs || processedVideos.hasSpecificVideos,
      
      hasContentHierarchy: !!(apiData.relatedContent?.hierarchy_info),
      contentHierarchyInfo: apiData.relatedContent?.hierarchy_info || null,
      tagRelatedContentUsed: apiData.meta?.tagRelatedContentUsed || false,
      seoContentCount: apiData.relatedContent?.seo_content?.length || 0,
      debug: apiData.meta || {}
    }
  };
}

// =====================================================
// MANTENER TODAS LAS FUNCIONES UTILITY ORIGINALES
// =====================================================

function processBreadcrumbs(apiBreadcrumbs: Breadcrumb[] | undefined, property: PropertyData | null, type: 'property' | 'list', tags?: any[]): Breadcrumb[] {
  console.log('🍞 === PROCESANDO BREADCRUMBS EN PROVIDER ===');
  console.log('📊 API breadcrumbs recibidos:', apiBreadcrumbs?.length || 0);
  console.log('📊 Context:', type);

  if (apiBreadcrumbs && apiBreadcrumbs.length > 0) {
    console.log('✅ Usando breadcrumbs de la API como base');
    
    const processedBreadcrumbs = apiBreadcrumbs.map((breadcrumb, index) => ({
      name: sanitizeText(breadcrumb.name || ''),
      url: breadcrumb.url || '/',
      current: breadcrumb.is_active || breadcrumb.is_current_page || false,
      slug: breadcrumb.slug,
      category: breadcrumb.category,
      position: breadcrumb.position || index,
      tag_id: breadcrumb.tag_id,
      description: breadcrumb.description,
      icon: breadcrumb.icon
    }));

    console.log('✅ Breadcrumbs de API procesados:', processedBreadcrumbs.length);
    return processedBreadcrumbs;
  }

  console.log('⚠️ No hay breadcrumbs de la API, usando fallback');
  return generateFallbackBreadcrumbs(property, type, tags);
}

function generateFallbackBreadcrumbs(property: PropertyData | null, type: 'property' | 'list', tags?: any[]): Breadcrumb[] {
  console.log('🔄 Generando breadcrumbs de fallback');
  
  const breadcrumbs: Breadcrumb[] = [
    { name: 'Inicio', url: '/', current: false, position: 0 },
    { name: 'Propiedades', url: '/propiedades', current: false, position: 1 }
  ];
  
  if (type === 'property' && property) {
    breadcrumbs.push({ 
      name: 'Comprar', 
      url: '/comprar', 
      current: false, 
      position: 2,
      category: 'operacion'
    });
    
    if (property.property_categories?.name) {
      const categorySlug = createSlug(property.property_categories.name);
      breadcrumbs.push({ 
        name: sanitizeText(property.property_categories.name), 
        url: `/comprar/${categorySlug}`, 
        current: false,
        position: 3,
        category: 'categoria'
      });
    }
    
    if (property.cities?.name) {
      const citySlug = createSlug(property.cities.name);
      const categorySlug = createSlug(property.property_categories?.name || 'apartamento');
      breadcrumbs.push({ 
        name: sanitizeText(property.cities.name), 
        url: `/comprar/${categorySlug}/${citySlug}`, 
        current: false,
        position: 4,
        category: 'ciudad'
      });
    }
    
    if (property.sectors?.name) {
      const sectorSlug = createSlug(property.sectors.name);
      const citySlug = createSlug(property.cities?.name || 'distrito-nacional');
      const categorySlug = createSlug(property.property_categories?.name || 'apartamento');
      breadcrumbs.push({ 
        name: sanitizeText(property.sectors.name), 
        url: `/comprar/${categorySlug}/${citySlug}/${sectorSlug}`, 
        current: false,
        position: 5,
        category: 'sector'
      });
    }
    
    breadcrumbs.push({ 
      name: sanitizeText(property.name || 'Propiedad'), 
      url: property.slug_url || '#', 
      current: true,
      position: breadcrumbs.length,
      category: 'property'
    });
  } else if (type === 'list' && tags && tags.length > 0) {
    let currentPath = '';
    let position = 2;

    const hierarchyOrder = ['operacion', 'categoria', 'ciudad', 'sector'];
    
    for (const categoryKey of hierarchyOrder) {
      const categoryTags = tags.filter((t: any) => t.category === categoryKey);
      
      if (categoryTags.length > 0) {
        const tag = categoryTags[0];
        currentPath = currentPath ? `${currentPath}/${tag.slug}` : tag.slug;
        
        breadcrumbs.push({
          name: tag.display_name || tag.name,
          url: `/${currentPath}`,
          current: false,
          position: position,
          category: tag.category,
          tag_id: tag.id,
          slug: tag.slug
        });
        
        position++;
      }
    }

    if (breadcrumbs.length > 2) {
      breadcrumbs[breadcrumbs.length - 1].current = true;
    } else {
      breadcrumbs[breadcrumbs.length - 1].current = true;
    }
  }
  
  console.log('✅ Breadcrumbs de fallback generados:', breadcrumbs.length);
  return breadcrumbs;
}

function processSimilarProperties(apiSimilarProperties: SimilarProperty[] | undefined): SimilarProperty[] {
  console.log('🏠 === PROCESANDO PROPIEDADES SIMILARES EN PROVIDER ===');
  console.log('📊 API similar properties recibidas:', apiSimilarProperties?.length || 0);

  if (!apiSimilarProperties || apiSimilarProperties.length === 0) {
    console.log('⚠️ No hay propiedades similares de la API');
    return [];
  }

  const processedSimilarProperties = apiSimilarProperties.map((property, index) => ({
    id: property.id,
    slug: property.url || `/propiedad/${property.id}`,
    titulo: formatTitle(property.title || 'Propiedad sin nombre'),
    precio: property.price || 'Precio a consultar',
    imagen: property.image || '/images/placeholder-property.jpg',
    imagenes: [property.image || '/images/placeholder-property.jpg'],
    sector: sanitizeText(property.location || ''),
    habitaciones: property.bedrooms || 0,
    banos: property.bathrooms || 0,
    metros: property.area || 0,
    tipo: sanitizeText(property.type || 'Apartamento'),
    url: property.url || `/propiedad/${property.id}`,
    code: `SIM-${property.id}`,
    isFormattedByProvider: true,
    is_project: property.is_project || false,
    parking_spots: property.parking_spots || 0,
    similarity_rank: index + 1,
    is_similar_property: true,
    // ✅ AGREGAR COORDENADAS SI ESTÁN DISPONIBLES
    coordinates: property.location?.coordinates || null,
    hasCoordinates: !!(property.location?.coordinates)
  }));

  console.log('✅ Propiedades similares procesadas:', processedSimilarProperties.length);
  return processedSimilarProperties;
}

function generateSimilarPropertiesInfo(apiSimilarPropertiesDebug: any, similarProperties: any[]): any {
  return {
    total_found: similarProperties.length,
    method: apiSimilarPropertiesDebug?.search_method || 'fallback',
    tags_used: apiSimilarPropertiesDebug?.tags_used || 0,
    has_similar_properties: similarProperties.length > 0,
    similarity_score: apiSimilarPropertiesDebug?.total_found || 0,
    purpose: apiSimilarPropertiesDebug?.purpose || 'alternatives',
    provider_processed: true
  };
}

// MANTENER TODAS LAS FUNCIONES UTILITY RESTANTES SIN CAMBIOS...
// (cleanUrlSegments, formatPropertyListResponse, formatImagesArray, etc.)

function cleanUrlSegments(segments: string[]): string[] {
  if (!segments || segments.length === 0) return [];
  
  let cleaned = segments
    .filter(segment => segment && segment.trim().length > 0)
    .map(segment => {
      const withoutId = segment.replace(/-\d+$/, '');
      return withoutId || segment;
    });

  const seen = new Set();
  const duplicateWords = ['comprar', 'venta', 'alquilar', 'apartamento', 'casa', 'proyecto'];
  
  cleaned = cleaned.filter(segment => {
    const segmentLower = segment.toLowerCase();
    
    if (duplicateWords.includes(segmentLower)) {
      if (seen.has(segmentLower)) {
        return false;
      }
      seen.add(segmentLower);
    }
    
    return true;
  });
  
  if (!isValidPropertySegments(cleaned)) {
    console.log('❌ Segmentos inválidos después de limpieza:', cleaned);
    return [];
  }
  
  return cleaned;
}

function createSlug(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace('apartamentos', 'apartamento')
    .replace('casas', 'casa')
    .replace('santo domingo este', 'santo-domingo-este')
    .replace('distrito nacional', 'distrito-nacional')
    .replace('ciudad juan bosch', 'ciudad-juan-bosch')
    .replace('autopista las americas', 'autopista-las-americas')
    .replace('punta cana', 'punta-cana')
    .replace('la altagracia', 'la-altagracia')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function cleanDescription(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[^\w\s\.,;:!?¿¡áéíóúüñÁÉÍÓÚÜÑ()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\.\s*([a-záéíóúüñ])/g, (match, letter) => '. ' + letter.toUpperCase())
    .trim();
}

function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[^\w\s\.,;:!?¿¡áéíóúüñÁÉÍÓÚÜÑ()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatTitle(title: string): string {
  if (!title) return 'Propiedad sin nombre';
  
  return sanitizeText(title)
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatWhatsApp(phone: string): string {
  if (!phone) return 'https://wa.me/18295550100';
  
  const cleaned = phone.replace(/\D/g, '');
  const number = cleaned.length === 10 ? '1' + cleaned : cleaned;
  return `https://wa.me/${number}`;
}

// MANTENER TODAS LAS DEMÁS FUNCIONES...
// (formatImagesArray, getMainImage, formatAmenities, generateSubtitle, etc.)

function formatImagesArray(images: any[]): string[] {
  if (!images || images.length === 0) {
    return ['/images/placeholder-property.jpg'];
  }
  
  const processedImages = [];
  
  for (const img of images) {
    if (!img || !img.url) continue;
    
    if (img.url.includes(',')) {
      const urls = img.url.split(',').filter(Boolean);
      urls.forEach(url => {
        if (url.trim()) {
          processedImages.push({
            ...img,
            url: url.trim(),
            optimized_url: url.trim()
          });
        }
      });
    } else {
      processedImages.push(img);
    }
  }
  
  const uniqueImages = processedImages.filter((img, index, self) => 
    index === self.findIndex(i => i.url === img.url)
  );
  
  return uniqueImages
    .sort((a, b) => {
      if (a.is_main && !b.is_main) return -1;
      if (!a.is_main && b.is_main) return 1;
      return (a.sort_order || a.position || 0) - (b.sort_order || b.position || 0);
    })
    .map(img => img.optimized_url || img.url)
    .filter(Boolean)
    .slice(0, 50);
}

function getMainImage(images: any[]): string {
  if (!images || images.length === 0) {
    return '/images/placeholder-property.jpg';
  }
  
  const processedImages = [];
  
  for (const img of images) {
    if (!img || !img.url) continue;
    
    if (img.url.includes(',')) {
      const urls = img.url.split(',').filter(Boolean);
      if (urls.length > 0) {
        processedImages.push({
          ...img,
          url: urls[0].trim(),
          optimized_url: urls[0].trim()
        });
      }
    } else {
      processedImages.push(img);
    }
  }
  
  const mainImg = processedImages.find(img => img.is_main);
  if (mainImg) {
    return mainImg.optimized_url || mainImg.url;
  }
  
  const firstImg = processedImages[0];
  if (firstImg) {
    return firstImg.optimized_url || firstImg.url;
  }
  
  return '/images/placeholder-property.jpg';
}

function formatAmenities(amenitiesData: any[]) {
  if (!amenitiesData || amenitiesData.length === 0) {
    return [];
  }
  
  const formatted = amenitiesData.map(amenity => ({
    name: sanitizeText(amenity.amenities?.name || amenity.name || ''),
    icon: amenity.amenities?.icon || amenity.icon || 'fas fa-check'
  })).filter(amenity => amenity.name);
  
  return formatted;
}

function generateSubtitle(property: PropertyData): string {
  const location = formatLocation(property);
  const type = sanitizeText(property.property_categories?.name || 'Propiedad');
  return `${type} en ${location}`;
}

function formatLocation(property: PropertyData): string {
  const parts = [
    sanitizeText(property.sectors?.name || ''),
    sanitizeText(property.cities?.name || '')
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : 'República Dominicana';
}

function extractGooglePlacesData(seoData: any) {
  const places = seoData?.places_enrichment;
  if (!places) return null;
  
  return {
    totalServices: places.total_services || 0,
    servicesScore: places.services_score || 0,
    avgRating: places.avg_rating,
    categories: places.top_categories || [],
    featuredServices: places.featured_services || [],
    hasData: true
  };
}

// AGREGAR LAS FUNCIONES FALTANTES...

function formatPropertyListResponse(apiData: APIResponse) {
  const searchResults = apiData.searchResults!;
  const properties = searchResults.properties || [];
  const pagination = searchResults.pagination || {};
  
  return {
    type: 'property-list',
    properties: properties.map(formatPropertyForList),
    pagination: {
      currentPage: pagination.currentPage || 1,
      totalCount: pagination.totalCount || 0,
      itemsPerPage: pagination.itemsPerPage || 30,
      totalPages: pagination.totalPages || 1,
      hasMore: pagination.hasMore || false,
      hasNextPage: pagination.hasMore || false,
      hasPreviousPage: (pagination.currentPage || 1) > 1
    },
    search: {
      tags: searchResults.tags || [],
      location: extractLocationFromTags(searchResults.tags),
      propertyType: extractPropertyTypeFromTags(searchResults.tags),
      operation: extractOperationFromTags(searchResults.tags)
    },
    locationData: extractGooglePlacesData(apiData.seo),
    seo: {
      title: sanitizeText(apiData.seo?.title || 'Propiedades - CLIC Inmobiliaria'),
      description: cleanDescription(apiData.seo?.description || ''),
      h1: sanitizeText(apiData.seo?.h1 || 'Propiedades Disponibles'),
      keywords: apiData.seo?.keywords || []
    },
    content: {
      intro: generateIntroText(searchResults.tags),
      benefits: generateBenefits(searchResults.tags),
      nearbyServices: extractNearbyServices(apiData.seo),
      faqs: generateFAQs(searchResults.tags),
      seoContent: apiData.relatedContent?.seo_content || [],
      hasTagRelatedContent: apiData.relatedContent?.content_source?.includes('tag_related') || false,
      contentHierarchy: apiData.relatedContent?.hierarchy_info || {
        specific_count: 0,
        tag_related_count: 0,
        default_count: 0
      }
    },
    breadcrumbs: processBreadcrumbs(apiData.breadcrumbs, null, 'list', searchResults.tags),
    relatedContent: {
      articles: apiData.relatedContent?.articles || [],
      videos: apiData.relatedContent?.videos || [],
      seo_content: apiData.relatedContent?.seo_content || [],
      contentSource: apiData.relatedContent?.content_source || 'general_only'
    },
    meta: {
      timestamp: new Date().toISOString(),
      searchTerms: searchResults.tags?.map(t => sanitizeText(t.name)) || [],
      totalResults: pagination.totalCount || 0,
      hasBreadcrumbs: !!(apiData.breadcrumbs?.length),
      breadcrumbsSource: apiData.breadcrumbs?.length ? 'api' : 'fallback',
      hasContentHierarchy: !!(apiData.relatedContent?.hierarchy_info),
      contentHierarchyInfo: apiData.relatedContent?.hierarchy_info || null,
      tagRelatedContentUsed: apiData.meta?.tagRelatedContentUsed || false,
      seoContentCount: apiData.relatedContent?.seo_content?.length || 0,
      // ✅ METADATOS DE UBICACIÓN EN LISTADOS
      propertiesWithCoordinates: properties.filter(p => p.locationData?.coordinates).length,
      totalProperties: properties.length,
      coordinatesSuccessRate: properties.length > 0 ? 
        (properties.filter(p => p.locationData?.coordinates).length / properties.length * 100).toFixed(1) + '%' : 
        '0%'
    }
  };
}

function formatPropertyForList(property: PropertyData) {
  const pricing = property.pricing_unified || {};
  const images = property.images_unified || [];
  
  return {
    id: property.id,
    slug: property.slug_url || `/propiedad/${property.id}`,
    titulo: formatTitle(property.name || 'Propiedad sin nombre'),
    precio: pricing.display_price?.formatted || 'Precio a consultar',
    imagen: getMainImage(images),
    imagenes: formatImagesArray(images),
    sector: formatLocation(property),
    habitaciones: property.bedrooms || 0,
    banos: property.bathrooms || 0,
    metros: property.built_area || 0,
    tipo: sanitizeText(property.property_categories?.name || 'Apartamento'),
    url: property.slug_url || `/propiedad/${property.id}`,
    code: property.code,
    isFormattedByProvider: true,
    is_project: property.is_project || false,
    project_badges: property.is_project ? ['PROYECTO', 'BONO VIVIENDA'] : undefined,
    habitaciones_rango: property.is_project ? `${property.bedrooms || 1}-3 hab` : undefined,
    banos_rango: property.is_project ? `${property.bathrooms || 1}-3 baños` : undefined,
    metros_rango: property.is_project ? `${property.built_area || 60}-90m²` : undefined,
    reserva_desde: property.is_project ? 'US$1,000' : undefined,
    // ✅ AGREGAR COORDENADAS SI ESTÁN DISPONIBLES
    coordinates: property.location?.coordinates || null,
    hasCoordinates: !!(property.location?.coordinates),
    locationData: property.location || null
  };
}

function extractLocationFromTags(tags: any[]): string | null {
  const locationTag = tags?.find(tag => 
    tag.category === 'ciudad' || tag.category === 'sector' || tag.category === 'provincia'
  );
  return locationTag?.name || null;
}

function extractPropertyTypeFromTags(tags: any[]): string | null {
  const typeTag = tags?.find(tag => tag.category === 'categoria');
  return typeTag?.name || null;
}

function extractOperationFromTags(tags: any[]): string | null {
  const operationTag = tags?.find(tag => tag.category === 'operacion');
  return operationTag?.name || null;
}

function extractNearbyServices(seoData: any): string[] {
  const places = seoData?.places_enrichment;
  if (!places || !places.featured_services) return [];
  
  return places.featured_services.slice(0, 8).map((service: any) => sanitizeText(service.place_name));
}

function generateIntroText(tags: any[]): string {
  const location = extractLocationFromTags(tags);
  const propertyType = extractPropertyTypeFromTags(tags);
  
  if (location && propertyType) {
    return cleanDescription(`Descubre las mejores opciones de ${propertyType.toLowerCase()} en ${location}. Propiedades cuidadosamente seleccionadas con excelente ubicación y servicios cercanos.`);
  }
  
  return 'Encuentra tu propiedad ideal con CLIC Inmobiliaria. Propiedades verificadas y servicios de calidad.';
}

function generateBenefits(tags: any[]): string[] {
  return [
    'Financiamiento hasta 80%',
    'Bono Primera Vivienda disponible',
    'Asesoría legal incluida',
    'Tours virtuales',
    'Proceso 100% transparente'
  ];
}

function generateFAQs(tags: any[]): Array<{question: string; answer: string}> {
  const location = extractLocationFromTags(tags);
  
  return [
    {
      question: '¿Cómo funciona el proceso de compra?',
      answer: cleanDescription('El proceso incluye: 1) Selección de propiedad, 2) Verificación legal, 3) Negociación, 4) Financiamiento, 5) Firma y entrega de llaves. Te acompañamos en cada paso.')
    },
    {
      question: '¿Qué incluye el Bono Primera Vivienda?',
      answer: cleanDescription('El Bono Primera Vivienda puede cubrir hasta RD$300,000 del valor de la propiedad. Incluye subsidio del gobierno y beneficios fiscales para compradores elegibles.')
    },
    {
      question: `¿Por qué invertir en ${location || 'esta zona'}?`,
      answer: cleanDescription(`${location || 'Esta zona'} ofrece excelente conectividad, servicios cercanos, crecimiento sostenido y potencial de valorización. Ideal para inversión o residencia.`)
    },
    {
      question: '¿Ofrecen financiamiento?',
      answer: cleanDescription('Trabajamos con los principales bancos del país para ofrecerte las mejores opciones de financiamiento. Hasta 80% del valor con tasas competitivas.')
    }
  ];
}

function getEmptyListResponse() {
  return {
    type: 'property-list' as const,
    properties: [],
    pagination: {
      currentPage: 1,
      totalCount: 0,
      itemsPerPage: 30,
      totalPages: 0,
      hasMore: false,
      hasNextPage: false,
      hasPreviousPage: false
    },
    search: {
      tags: [],
      location: null,
      propertyType: null,
      operation: null
    },
    seo: {
      title: 'Propiedades no encontradas - CLIC Inmobiliaria',
      description: 'No se encontraron propiedades que coincidan con tu búsqueda',
      h1: 'Sin resultados'
    },
    breadcrumbs: [
      { name: 'Inicio', url: '/', current: false },
      { name: 'Propiedades', url: '/propiedades', current: true }
    ],
    content: {
      intro: 'No se encontraron propiedades para los criterios especificados.',
      benefits: [],
      nearbyServices: [],
      faqs: [],
      seoContent: [],
      hasTagRelatedContent: false,
      contentHierarchy: {
        specific_count: 0,
        tag_related_count: 0,
        default_count: 0
      }
    },
    relatedContent: {
      articles: [],
      videos: [],
      seo_content: [],
      contentSource: 'empty'
    },
    meta: {
      timestamp: new Date().toISOString(),
      searchTerms: [],
      totalResults: 0,
      hasBreadcrumbs: true,
      breadcrumbsSource: 'fallback',
      hasContentHierarchy: false,
      contentHierarchyInfo: null,
      tagRelatedContentUsed: false,
      seoContentCount: 0
    }
  };
}

function formatProjectDetails(projectData: any) {
  if (!projectData) return null;
  
  return {
    id: projectData.id,
    name: formatTitle(projectData.name || ''),
    description: cleanDescription(projectData.description || ''),
    developer: projectData.developers ? {
      name: formatTitle(projectData.developers.name || ''),
      description: cleanDescription(projectData.developers.description || ''),
      logo_url: projectData.developers.logo_url,
      website: projectData.developers.website,
      years_experience: projectData.developers.years_experience,
      total_projects: projectData.developers.total_projects
    } : null,
    status: {
      construction: sanitizeText(projectData.construction_status || 'En construcción'),
      sales: sanitizeText(projectData.sales_status || 'En venta'),
      completion: projectData.estimated_completion_date,
      delivery_date: projectData.delivery_date
    },
    typologies: projectData.project_typologies?.map((typ: any) => ({
      id: typ.id,
      name: sanitizeText(typ.name || `${typ.bedrooms} habitaciones`),
      bedrooms: typ.bedrooms,
      bathrooms: typ.bathrooms,
      area: typ.built_area,
      priceFrom: typ.sale_price_from,
      priceTo: typ.sale_price_to,
      currency: typ.sale_currency || 'USD',
      available: !typ.is_sold_out,
      totalUnits: typ.total_units,
      availableUnits: typ.available_units
    })) || [],
    amenities: projectData.project_amenities?.map((amenity: any) => ({
      name: sanitizeText(amenity.amenities?.name || amenity.name || ''),
      icon: amenity.amenities?.icon || 'fas fa-check',
      category: sanitizeText(amenity.amenities?.category || ''),
      included: amenity.included !== false
    })) || [],
    paymentPlans: projectData.project_payment_plans?.map((plan: any) => ({
      id: plan.id,
      name: sanitizeText(plan.plan_name || 'Plan de Pago'),
      description: cleanDescription(plan.description || ''),
      reservation: plan.reservation_amount || 1000,
      reservationCurrency: plan.reservation_currency || 'USD',
      separationPercentage: plan.separation_percentage || 10,
      constructionPercentage: plan.construction_percentage || 20,
      deliveryPercentage: plan.delivery_percentage || 70,
      benefits: cleanDescription(plan.benefits || ''),
      isDefault: plan.is_default || false
    })) || [],
    phases: projectData.project_phases?.map((phase: any) => ({
      id: phase.id,
      name: sanitizeText(phase.phase_name || ''),
      description: cleanDescription(phase.description || ''),
      constructionStart: phase.construction_start,
      estimatedDelivery: phase.estimated_delivery,
      actualDelivery: phase.actual_delivery,
      totalUnits: phase.total_units,
      availableUnits: phase.available_units,
      status: sanitizeText(phase.status || ''),
      completionPercentage: phase.completion_percentage
    })) || []
  };
}

// =====================================================
// ✨ NUEVAS FUNCIONES PARA CONTENIDO MEJORADO
// =====================================================

// ✅ NUEVA FUNCIÓN: PROCESAR FAQs COMPLETAMENTE
function processFAQsForDisplay(relatedContent: any, property: any, isProject: boolean) {
  console.log('❓ === PROCESANDO FAQs PARA MOSTRAR ===');
  
  function cleanFAQText(text: string): string {
    if (!text) return '';
    
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/<b>(.*?)<\/b>/gi, '$1')
      .replace(/<strong>(.*?)<\/strong>/gi, '$1')
      .replace(/<i>(.*?)<\/i>/gi, '$1')
      .replace(/<em>(.*?)<\/em>/gi, '$1')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<p>(.*?)<\/p>/gi, '$1 ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  const allFaqs = [];
  
  // ✅ PROCESAR FAQs DE LA API CON PRIORIDADES
  if (relatedContent?.faqs) {
    relatedContent.faqs.forEach((faq: any) => {
      allFaqs.push({
        question: cleanFAQText(faq.question),
        answer: cleanFAQText(faq.answer),
        source: faq.content_priority || 'api',
        priority: faq.content_priority === 'specific' ? 1 : 
                 faq.content_priority === 'tag_related' ? 2 : 3,
        isSpecific: faq.content_priority === 'specific' || faq.is_property_specific,
        isTagRelated: faq.content_priority === 'tag_related' || faq.is_tag_related
      });
    });
  }

  // ✅ PROCESAR SEO CONTENT TIPO FAQ
  if (relatedContent?.seo_content) {
    relatedContent.seo_content
      .filter((item: any) => item.content_type === 'faq')
      .forEach((seoItem: any) => {
        allFaqs.push({
          question: cleanFAQText(seoItem.title),
          answer: cleanFAQText(seoItem.description || seoItem.content),
          source: 'seo_content',
          priority: 4,
          isSpecific: false,
          isTagRelated: true
        });
      });
  }

  // ✅ FAQs DE FALLBACK CONTEXTUALIZADOS
  const fallbackFaqs = [
    {
      question: "¿Cómo funciona el proceso de compra?",
      answer: "El proceso incluye: 1) Selección de propiedad, 2) Verificación legal, 3) Negociación, 4) Financiamiento, 5) Firma y entrega de llaves. Te acompañamos en cada paso para garantizar una transacción segura y transparente.",
      source: 'fallback',
      priority: 5,
      isSpecific: false,
      isTagRelated: false
    },
    {
      question: isProject ? "¿Cuándo es la entrega del proyecto?" : "¿La propiedad está lista para habitar?",
      answer: isProject 
        ? "La entrega está programada según el cronograma del desarrollador. El proyecto cuenta con garantías de construcción y seguimiento durante toda la edificación."
        : "Esta propiedad está lista para mudarse inmediatamente. Cuenta con todos los servicios básicos conectados y documentación legal al día.",
      source: 'fallback',
      priority: 5,
      isSpecific: false,
      isTagRelated: false
    },
    {
      question: "¿Qué incluye el Bono Primera Vivienda?",
      answer: "El Bono Primera Vivienda puede cubrir hasta RD$300,000 del valor de la propiedad. Incluye subsidio del gobierno y beneficios fiscales para compradores elegibles.",
      source: 'fallback',
      priority: 5,
      isSpecific: false,
      isTagRelated: false
    },
    {
      question: "¿Ofrecen opciones de financiamiento?",
      answer: "Trabajamos con los principales bancos del país para ofrecerte las mejores opciones de financiamiento. Disponible hasta 80% del valor con tasas preferenciales.",
      source: 'fallback',
      priority: 5,
      isSpecific: false,
      isTagRelated: false
    },
    {
      question: `¿Por qué invertir en ${property?.sector || property?.location || 'esta zona'}?`,
      answer: `${property?.sector || property?.location || 'Esta zona'} es una zona de alta valorización con excelente conectividad, servicios cercanos y crecimiento sostenido. Ideal para inversión y residencia.`,
      source: 'fallback',
      priority: 5,
      isSpecific: false,
      isTagRelated: false
    }
  ];

  // Si no hay FAQs de la API, usar fallback
  if (allFaqs.length === 0) {
    allFaqs.push(...fallbackFaqs);
  }

  // ✅ ORDENAR POR PRIORIDAD Y RETORNAR MÁXIMO 6
  const sortedFaqs = allFaqs
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 6);

  console.log('✅ FAQs procesados:', {
    total: sortedFaqs.length,
    specific: sortedFaqs.filter(f => f.isSpecific).length,
    tagRelated: sortedFaqs.filter(f => f.isTagRelated).length,
    fallback: sortedFaqs.filter(f => f.source === 'fallback').length
  });

  return {
    faqs: sortedFaqs,
    hasSpecificFaqs: sortedFaqs.some(f => f.isSpecific),
    hasTagRelatedFaqs: sortedFaqs.some(f => f.isTagRelated),
    totalCount: sortedFaqs.length,
    sources: [...new Set(sortedFaqs.map(f => f.source))]
  };
}

// ✅ NUEVA FUNCIÓN: PROCESAR VIDEOS COMPLETAMENTE
function processVideosForDisplay(videoSource: any, property: any) {
  console.log('🎥 === PROCESANDO VIDEOS PARA MOSTRAR ===');
  console.log('📊 Fuente recibida:', {
    hasVideos: !!videoSource?.videos,
    videosCount: videoSource?.videos?.length || 0,
    hasSeoContent: !!videoSource?.seo_content,
    seoContentCount: videoSource?.seo_content?.length || 0,
    sourceType: videoSource === null ? 'null' : typeof videoSource
  });
  
  // ✅ SI NO HAY FUENTE VÁLIDA, USAR FALLBACK INMEDIATAMENTE
  if (!videoSource || (!videoSource.videos?.length && !videoSource.seo_content?.length)) {
    console.log('⚠️ No hay fuente válida de videos, usando fallback...');
    const fallbackVideo = {
      id: 'psoIb7wi5_4',
      title: `Recorrido Virtual - ${property?.title || 'Propiedad'}`,
      description: 'Descubre cada detalle de esta increíble propiedad en un recorrido virtual completo.',
      duration: '5:23',
      thumbnail: 'https://img.youtube.com/vi/psoIb7wi5_4/maxresdefault.jpg',
      url: 'https://www.youtube.com/watch?v=psoIb7wi5_4',
      embedUrl: 'https://www.youtube.com/embed/psoIb7wi5_4?rel=0&modestbranding=1&showinfo=0&color=white&iv_load_policy=3',
      source: 'fallback',
      priority: 10,
      isSpecific: false,
      isTagRelated: false,
      platform: 'youtube',
      isValid: true
    };
    
    return {
      mainVideo: fallbackVideo,
      additionalVideos: [],
      allVideos: [fallbackVideo],
      hasSpecificVideos: false,
      hasTagRelatedVideos: false,
      totalCount: 1,
      sources: ['fallback']
    };
  }
  
  function cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function extractYouTubeId(url: string): string {
    if (!url) return '';
    const regex = /^.*(?:(?:youtu\.be\/|v\/|vi\/|u\/\w\/|embed\/|shorts\/)|(?:(?:watch)?\?v(?:i)?=|\&v(?:i)?=))([^#\&\?]*).*/;
    const match = url.match(regex);
    return match && match[1] && match[1].length === 11 ? match[1] : '';
  }

  const videoMap = new Map();

  // 🔍 LOGGING DETALLADO: Videos de entrada
  console.log('📊 === VIDEOS DE ENTRADA ===');
  console.log('🎥 videoSource?.videos:', videoSource?.videos?.length || 0, videoSource?.videos);
  console.log('🎥 videoSource?.seo_content:', videoSource?.seo_content?.length || 0);
  const seoVideos = videoSource?.seo_content?.filter((item: any) => item.content_type === 'video') || [];
  console.log('🎥 seo_content videos filtrados:', seoVideos.length, seoVideos);

  // ✅ PROCESAR VIDEOS DE LA FUENTE CON PRIORIDADES
  if (videoSource?.videos) {
    console.log('🔄 Procesando videos de videoSource.videos...');
    videoSource.videos.forEach((video: any, index: number) => {
      console.log(`  📹 Video ${index}:`, {
        title: video.title,
        video_id: video.video_id,
        url: video.url || video.video_url,
        content_priority: video.content_priority
      });
      
      const videoId = video.video_id || extractYouTubeId(video.url || video.video_url);
      console.log(`    🔑 Procesando ID:`, {
        video_id_directo: video.video_id,
        url: video.url || video.video_url,
        extractedId: videoId,
        esValido: videoId && videoId.length === 11,
        longitud: videoId?.length
      });
      
      if (videoId && !videoMap.has(videoId)) {
        const processedVideo = {
          id: videoId,
          title: cleanText(video.title) || `Video - ${property?.title || 'Propiedad'}`,
          description: cleanText(video.description) || 'Video relacionado con esta propiedad',
          duration: video.duration,
          thumbnail: video.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&color=white&iv_load_policy=3`,
          source: video.content_priority || 'api',
          priority: video.content_priority === 'specific' ? 1 : 
                   video.content_priority === 'tag_related' ? 2 : 3,
          isSpecific: video.content_priority === 'specific' || video.is_property_specific,
          isTagRelated: video.content_priority === 'tag_related' || video.is_tag_related,
          platform: 'youtube',
          isValid: true
        };
        
        videoMap.set(videoId, processedVideo);
        console.log(`    ✅ Video agregado al map:`, {
          id: videoId,
          title: processedVideo.title,
          priority: processedVideo.priority,
          source: processedVideo.source
        });
      } else {
        console.log(`    ❌ Video rechazado:`, {
          reason: !videoId ? 'ID inválido' : 'Duplicado',
          videoId,
          alreadyExists: videoMap.has(videoId)
        });
      }
    });
  }

  // ✅ PROCESAR VIDEOS DE SEO CONTENT
  if (seoVideos.length > 0) {
    console.log('🔄 Procesando videos de seo_content...');
    seoVideos.forEach((seoItem: any, index: number) => {
      console.log(`  📹 SEO Video ${index}:`, {
        title: seoItem.title,
        video_id: seoItem.video_id,
        video_url: seoItem.video_url || seoItem.url
      });
      
      const videoId = seoItem.video_id || extractYouTubeId(seoItem.video_url || seoItem.url);
      console.log(`    🔑 Procesando SEO ID:`, {
        video_id_directo: seoItem.video_id,
        video_url: seoItem.video_url || seoItem.url,
        extractedId: videoId,
        esValido: videoId && videoId.length === 11,
        longitud: videoId?.length
      });
      
      if (videoId && !videoMap.has(videoId)) {
        const processedVideo = {
          id: videoId,
          title: cleanText(seoItem.title) || `Video SEO - ${property?.title || 'Propiedad'}`,
          description: cleanText(seoItem.description) || 'Video relacionado con esta zona',
          duration: seoItem.duration,
          thumbnail: seoItem.thumbnail || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&showinfo=0&color=white&iv_load_policy=3`,
          source: 'seo_content',
          priority: 4,
          isSpecific: false,
          isTagRelated: true,
          platform: 'youtube',
          isValid: true
        };
        
        videoMap.set(videoId, processedVideo);
        console.log(`    ✅ SEO Video agregado al map:`, {
          id: videoId,
          title: processedVideo.title,
          priority: processedVideo.priority
        });
      } else {
        console.log(`    ❌ SEO Video rechazado:`, {
          reason: !videoId ? 'ID inválido' : 'Duplicado',
          videoId,
          alreadyExists: videoMap.has(videoId)
        });
      }
    });
  }

  // ✅ CONVERTIR A ARRAY Y ORDENAR POR PRIORIDAD
  console.log('🔄 Convirtiendo videoMap a array...');
  console.log('📊 VideoMap tamaño:', videoMap.size);
  
  const allVideosBeforeFilter = Array.from(videoMap.values());
  console.log('📊 Videos antes del filtro:', allVideosBeforeFilter.length, allVideosBeforeFilter);
  
  const allVideos = allVideosBeforeFilter
    .filter((video: any) => {
      // ✅ LOGGING DETALLADO DE FILTRADO
      console.log(`🔍 Evaluando video para filtro:`, {
        title: video.title,
        id: video.id,
        idLength: video.id?.length,
        isValid: video.isValid,
        source: video.source,
        priority: video.priority
      });
      
      const isValid = video.isValid && video.id && video.id.length === 11;
      
      if (!isValid) {
        console.log(`❌ Video FILTRADO por:`, {
          title: video.title,
          id: video.id,
          reason: !video.isValid ? 'isValid=false' : 
                  !video.id ? 'ID vacío' : 
                  video.id.length !== 11 ? `ID longitud incorrecta (${video.id.length})` : 'Desconocido',
          isValid: video.isValid,
          idLength: video.id?.length
        });
      } else {
        console.log(`✅ Video APROBADO:`, {
          title: video.title,
          id: video.id,
          source: video.source
        });
      }
      
      return isValid;
    })
    .sort((a: any, b: any) => a.priority - b.priority);

  console.log('📊 Videos después del filtro y ordenamiento:', allVideos.length, allVideos);

  // ✅ FALLBACK: Si no hay videos, usar uno de demostración
  if (allVideos.length === 0) {
    console.log('⚠️ No hay videos válidos, usando fallback...');
    allVideos.push({
      id: 'psoIb7wi5_4',
      title: `Recorrido Virtual - ${property?.title || 'Propiedad'}`,
      description: 'Descubre cada detalle de esta increíble propiedad en un recorrido virtual completo.',
      duration: '5:23',
      thumbnail: 'https://img.youtube.com/vi/psoIb7wi5_4/maxresdefault.jpg',
      url: 'https://www.youtube.com/watch?v=psoIb7wi5_4',
      embedUrl: 'https://www.youtube.com/embed/psoIb7wi5_4?rel=0&modestbranding=1&showinfo=0&color=white&iv_load_policy=3',
      source: 'fallback',
      priority: 10,
      isSpecific: false,
      isTagRelated: false,
      platform: 'youtube',
      isValid: true
    });
  }

  const mainVideo = allVideos[0];
  const additionalVideos = allVideos.slice(1, 4); // Máximo 3 adicionales

  console.log('🎯 === RESULTADO FINAL ===');
  console.log('🎬 MainVideo:', mainVideo ? {
    title: mainVideo.title,
    id: mainVideo.id,
    source: mainVideo.source,
    priority: mainVideo.priority
  } : 'NINGUNO');
  
  console.log('🎬 AdditionalVideos:', additionalVideos.length);
  additionalVideos.forEach((video, index) => {
    console.log(`  [${index}] ${video.title}`, {
      id: video.id,
      source: video.source,
      priority: video.priority
    });
  });

  console.log('📊 Videos finales:', {
    total: allVideos.length,
    mainVideo: mainVideo?.title,
    additional: additionalVideos.length,
    specific: allVideos.filter(v => v.isSpecific).length,
    tagRelated: allVideos.filter(v => v.isTagRelated).length
  });

  return {
    mainVideo,
    additionalVideos,
    allVideos: allVideos.slice(0, 4), // Máximo 4 videos total
    hasSpecificVideos: allVideos.some(v => v.isSpecific),
    hasTagRelatedVideos: allVideos.some(v => v.isTagRelated),
    totalCount: allVideos.length,
    sources: [...new Set(allVideos.map(v => v.source))]
  };
}

// =====================================================
// EXPORTS
// =====================================================

export { getSingleProperty, getPropertyList };