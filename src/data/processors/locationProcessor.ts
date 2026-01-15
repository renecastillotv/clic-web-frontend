// src/data/processors/locationProcessor.ts
// =====================================================
// PROCESAMIENTO DE UBICACIONES Y COORDENADAS
// =====================================================

import type { PropertyData, ProcessedLocation, Coordinates } from '../types/interfaces.js';

// =====================================================
// FUNCIONES DE PARSING DE COORDENADAS
// =====================================================

export function parsePostGISCoordinates(postgisString: string): Coordinates | null {
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

export function extractCoordinatesWithPostGIS(property: PropertyData): Coordinates | null {
  console.log('📍 === EXTRAYENDO COORDENADAS CON SOPORTE POSTGIS ===');
  console.log('🏠 Property data completo:', {
    id: property?.id,
    cityCoordinates: property?.cities?.coordinates,
    sectorCoordinates: property?.sectors?.coordinates,
    provinceCoordinates: property?.cities?.provinces?.coordinates
  });
  
  // 1. Intentar coordenadas de location
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
  
  // 2. Intentar coordenadas de ciudad (caso más común)
  if (property?.cities?.coordinates) {
    console.log('🎯 Intentando coordenadas de ciudad:', property.cities.coordinates);
    const parsed = parsePostGISCoordinates(property.cities.coordinates);
    if (parsed) {
      console.log('✅ ¡COORDENADAS DE CIUDAD PARSEADAS EXITOSAMENTE!:', parsed);
      return parsed;
    }
  }
  
  // 3. Intentar coordenadas de sector
  if (property?.sectors?.coordinates) {
    console.log('🎯 Intentando coordenadas de sector:', property.sectors.coordinates);
    const parsed = parsePostGISCoordinates(property.sectors.coordinates);
    if (parsed) {
      console.log('✅ Coordenadas de sector parseadas exitosamente:', parsed);
      return parsed;
    }
  }
  
  // 4. Intentar coordenadas de provincia
  if (property?.cities?.provinces?.coordinates) {
    console.log('🎯 Intentando coordenadas de provincia:', property.cities.provinces.coordinates);
    const parsed = parsePostGISCoordinates(property.cities.provinces.coordinates);
    if (parsed) {
      console.log('✅ Coordenadas de provincia parseadas exitosamente:', parsed);
      return parsed;
    }
  }
  
  console.log('⚠️ No se encontraron coordenadas válidas en ningún nivel');
  return null;
}

// =====================================================
// FUNCIÓN PRINCIPAL DE PROCESAMIENTO DE UBICACIÓN
// =====================================================

export function processLocationFromAPI(apiLocation: any, propertyData?: PropertyData): ProcessedLocation {
  console.log('📍 === PROCESANDO UBICACIÓN DE LA API ===');
  console.log('🗺️ API Location recibido:', apiLocation);
  console.log('🗺️ Property data recibido:', !!propertyData);

  let finalCoordinates = null;

  // 1. Intentar coordenadas directas de la API
  if (apiLocation?.coordinates) {
    console.log('🎯 Intentando coordenadas directas de API:', apiLocation.coordinates);
    
    if (typeof apiLocation.coordinates === 'string') {
      finalCoordinates = parsePostGISCoordinates(apiLocation.coordinates);
    } else if (apiLocation.coordinates.lat && apiLocation.coordinates.lng) {
      finalCoordinates = apiLocation.coordinates;
    }
  }

  // 2. Si no hay coordenadas directas, buscar en property de apiLocation
  if (!finalCoordinates && apiLocation?.property) {
    console.log('🔄 Buscando coordenadas en apiLocation.property...');
    finalCoordinates = extractCoordinatesWithPostGIS(apiLocation.property);
  }

  // 3. Si aún no hay coordenadas, usar propertyData directamente
  if (!finalCoordinates && propertyData) {
    console.log('🔄 ¡BUSCANDO COORDENADAS EN PROPERTYDATA DIRECTAMENTE!...');
    finalCoordinates = extractCoordinatesWithPostGIS(propertyData);
  }

  // 4. Sin fallback hardcodeado
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

  // Solo si hay coordenadas reales
  const processedLocation: ProcessedLocation = {
    coordinates: finalCoordinates,
    hasExactCoordinates: true,
    showExactLocation: apiLocation?.showExactLocation || propertyData?.show_exact_location || false,
    coordinatesSource: 'parsed_postgis',
    
    address: apiLocation?.address || '',
    sector: apiLocation?.sector || propertyData?.sectors?.name || null,
    city: apiLocation?.city || propertyData?.cities?.name || null,
    province: apiLocation?.province || propertyData?.cities?.provinces?.name || null,
    
    mapConfig: {
      zoom: 14,
      showMarker: true,
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
    coordinatesFoundIn: processedLocation.debug.coordinatesFoundIn
  });

  return processedLocation;
}

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

export function extractGooglePlacesData(seoData: any) {
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

export function formatLocation(property: PropertyData): string {
  const parts = [
    property.sectors?.name,
    property.cities?.name
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : 'República Dominicana';
}

// Función legacy para backward compatibility
export function extractCoordinates(property: PropertyData): Coordinates | null {
  console.log('⚠️ Usando función legacy extractCoordinates - solo coordenadas reales');
  
  const postgisCoords = extractCoordinatesWithPostGIS(property);
  if (postgisCoords) {
    console.log('✅ Coordenadas encontradas via PostGIS');
    return postgisCoords;
  }
  
  console.log('⚠️ No hay coordenadas reales disponibles');
  return null;
}