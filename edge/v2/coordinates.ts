// 📁 supabase/functions/unified-property-search/coordinates.ts
import { STATIC_COORDINATES_MAP } from './config.ts';
import { formatLocationAddress } from './utils.ts';
export class CoordinatesService {
  parseCoordinates(coordinatesData) {
    if (!coordinatesData) return null;
    try {
      // Si es un string, intentar parsearlo
      if (typeof coordinatesData === 'string') {
        // ✅ NUEVO: Formato PostgreSQL/PostGIS: (lng,lat)
        if (coordinatesData.includes('(') && coordinatesData.includes(',') && coordinatesData.includes(')')) {
          const match = coordinatesData.match(/\(\s*([+-]?\d*\.?\d+)\s*,\s*([+-]?\d*\.?\d+)\s*\)/);
          if (match) {
            return {
              lng: parseFloat(match[1]),
              lat: parseFloat(match[2])
            };
          }
        }
        // Formato POINT(lng lat) de PostGIS
        if (coordinatesData.includes('POINT')) {
          const match = coordinatesData.match(/POINT\s*\(\s*([+-]?\d*\.?\d+)\s+([+-]?\d*\.?\d+)\s*\)/i);
          if (match) {
            return {
              lng: parseFloat(match[1]),
              lat: parseFloat(match[2])
            };
          }
        }
        // Intentar parsear como JSON solo si parece JSON válido
        if (coordinatesData.trim().startsWith('{') || coordinatesData.trim().startsWith('[')) {
          try {
            const parsed = JSON.parse(coordinatesData);
            return this.extractCoordinatesFromObject(parsed);
          } catch (jsonError) {
            console.warn('⚠️ Error parseando como JSON:', jsonError.message, coordinatesData);
          }
        }
      }
      // Si es un objeto
      if (typeof coordinatesData === 'object') {
        return this.extractCoordinatesFromObject(coordinatesData);
      }
      console.warn('⚠️ Formato de coordenadas no reconocido:', coordinatesData);
      return null;
    } catch (error) {
      console.error('❌ Error parseando coordenadas:', error, coordinatesData);
      return null;
    }
  }
  extractCoordinatesFromObject(obj) {
    if (obj.x !== undefined && obj.y !== undefined) {
      return {
        lng: obj.x,
        lat: obj.y
      };
    }
    if (obj.lng !== undefined && obj.lat !== undefined) {
      return {
        lng: obj.lng,
        lat: obj.lat
      };
    }
    if (obj.longitude !== undefined && obj.latitude !== undefined) {
      return {
        lng: obj.longitude,
        lat: obj.latitude
      };
    }
    return null;
  }
  processPropertyCoordinates(property) {
    console.log('📍 === PROCESANDO COORDENADAS DE PROPIEDAD ===');
    console.log('🏠 Property ID:', property.id);
    console.log('📍 exact_coordinates:', property.exact_coordinates);
    console.log('👁️ show_exact_location:', property.show_exact_location);
    console.log('🏙️ sectors.coordinates:', property.sectors?.coordinates);
    console.log('🌆 cities.coordinates:', property.cities?.coordinates);
    console.log('🗺️ provinces.coordinates:', property.cities?.provinces?.coordinates);
    const result = {
      hasExactCoordinates: false,
      showExactLocation: property.show_exact_location || false,
      exactCoordinates: null,
      fallbackCoordinates: null,
      source: 'none',
      processed: true,
      rawData: {
        exact_coordinates: property.exact_coordinates,
        show_exact_location: property.show_exact_location,
        sectors_coordinates: property.sectors?.coordinates,
        cities_coordinates: property.cities?.coordinates,
        provinces_coordinates: property.cities?.provinces?.coordinates
      }
    };
    // ✅ PRIORIDAD 1: COORDENADAS EXACTAS DE LA PROPIEDAD
    if (property.exact_coordinates) {
      console.log('🎯 Usando coordenadas exactas de la propiedad');
      result.hasExactCoordinates = true;
      result.exactCoordinates = this.parseCoordinates(property.exact_coordinates);
      result.source = 'property_exact';
      // Si no se debe mostrar ubicación exacta, usar coordenadas de zona como fallback
      if (!property.show_exact_location) {
        console.log('👁️ show_exact_location = false, buscando coordenadas de zona...');
        result.fallbackCoordinates = this.findFallbackCoordinates(property);
      }
    } else if (property.sectors?.coordinates) {
      console.log('🏘️ Usando coordenadas del sector');
      result.fallbackCoordinates = this.parseCoordinates(property.sectors.coordinates);
      result.source = 'sector';
    } else if (property.cities?.coordinates) {
      console.log('🏙️ Usando coordenadas de la ciudad');
      result.fallbackCoordinates = this.parseCoordinates(property.cities.coordinates);
      result.source = 'city';
    } else if (property.cities?.provinces?.coordinates) {
      console.log('🗺️ Usando coordenadas de la provincia');
      result.fallbackCoordinates = this.parseCoordinates(property.cities.provinces.coordinates);
      result.source = 'province';
    } else {
      console.log('📍 Usando coordenadas estáticas como fallback');
      result.fallbackCoordinates = this.getStaticCoordinates(property);
      result.source = 'static_fallback';
    }
    console.log('✅ Coordenadas procesadas exitosamente:', {
      hasExact: result.hasExactCoordinates,
      showExact: result.showExactLocation,
      source: result.source,
      exactCoords: result.exactCoordinates,
      fallbackCoords: result.fallbackCoordinates
    });
    return result;
  }
  generateLocationData(property, coordinatesInfo) {
    console.log('🗺️ === GENERANDO DATOS DE UBICACIÓN COMPLETOS ===');
    const displayCoordinates = coordinatesInfo.showExactLocation && coordinatesInfo.exactCoordinates ? coordinatesInfo.exactCoordinates : coordinatesInfo.fallbackCoordinates;
    const locationData = {
      // ✅ COORDENADAS PARA MOSTRAR (respetando show_exact_location)
      coordinates: displayCoordinates,
      // ✅ INFORMACIÓN DE CONFIGURACIÓN
      hasExactCoordinates: coordinatesInfo.hasExactCoordinates,
      showExactLocation: coordinatesInfo.showExactLocation,
      coordinatesSource: coordinatesInfo.source,
      // ✅ DATOS SEPARADOS PARA CASOS ESPECÍFICOS
      exactCoordinates: coordinatesInfo.exactCoordinates,
      fallbackCoordinates: coordinatesInfo.fallbackCoordinates,
      // ✅ INFORMACIÓN DE UBICACIÓN TEXTUAL
      address: formatLocationAddress(property),
      sector: property.sectors?.name || null,
      city: property.cities?.name || null,
      province: property.cities?.provinces?.name || null,
      // ✅ CONFIGURACIÓN PARA MAPAS
      mapConfig: {
        zoom: coordinatesInfo.showExactLocation && coordinatesInfo.hasExactCoordinates ? 17 : 14,
        showMarker: coordinatesInfo.showExactLocation && coordinatesInfo.hasExactCoordinates,
        showAreaCircle: !coordinatesInfo.showExactLocation,
        circleRadius: this.calculateCircleRadius(coordinatesInfo.source)
      },
      // ✅ METADATA PARA DEBUG
      debug: {
        rawCoordinatesData: coordinatesInfo.rawData,
        processingSource: coordinatesInfo.source,
        hasExactButHidden: coordinatesInfo.hasExactCoordinates && !coordinatesInfo.showExactLocation,
        fallbackReason: !coordinatesInfo.hasExactCoordinates ? 'no_exact_coordinates' : !coordinatesInfo.showExactLocation ? 'privacy_setting' : null
      }
    };
    console.log('✅ Datos de ubicación generados:', {
      hasCoordinates: !!locationData.coordinates,
      source: locationData.coordinatesSource,
      showExact: locationData.showExactLocation,
      zoom: locationData.mapConfig.zoom,
      showMarker: locationData.mapConfig.showMarker
    });
    return locationData;
  }
  findFallbackCoordinates(property) {
    // Buscar coordenadas de zona cuando no se debe mostrar ubicación exacta
    if (property.sectors?.coordinates) {
      return this.parseCoordinates(property.sectors.coordinates);
    }
    if (property.cities?.coordinates) {
      return this.parseCoordinates(property.cities.coordinates);
    }
    if (property.cities?.provinces?.coordinates) {
      return this.parseCoordinates(property.cities.provinces.coordinates);
    }
    return this.getStaticCoordinates(property);
  }
  getStaticCoordinates(property) {
    const searchTerms = [
      property.sectors?.name?.toLowerCase(),
      property.cities?.name?.toLowerCase()
    ].filter(Boolean);
    for (const term of searchTerms){
      for (const [location, coords] of Object.entries(STATIC_COORDINATES_MAP)){
        if (term.includes(location) || location.includes(term)) {
          return coords;
        }
      }
    }
    // Default: Distrito Nacional
    return {
      lat: 18.4682,
      lng: -69.9279
    };
  }
  calculateCircleRadius(source) {
    switch(source){
      case 'sector':
        return 500;
      case 'city':
        return 1000;
      case 'province':
        return 2000;
      default:
        return 750;
    }
  }
}
