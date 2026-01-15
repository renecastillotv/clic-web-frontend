// src/data/providers/propertyProvider.ts
// =====================================================
// PROVIDER DE PROPIEDADES - SINGLE Y LIST
// =====================================================

import { callUnifiedAPI } from '../core/apiClient.js';
import { isValidPropertySegments } from '../core/validation.js';
import { formatSinglePropertyResponse } from '../formatters/propertyFormatter.js';
import { formatPropertyListResponse, getEmptyListResponse } from '../formatters/listFormatter.js';
import type { APIResponse } from '../types/interfaces.js';

// =====================================================
// PROVIDER CLASS
// =====================================================

export class PropertyProvider {
  
  // =====================================================
  // SINGLE PROPERTY
  // =====================================================
  
  async getSingleProperty(segments: string[], searchParams?: URLSearchParams) {
    try {
      if (!isValidPropertySegments(segments)) {
        console.log('❌ getSingleProperty: Segmentos inválidos:', segments);
        return null;
      }
      
      const apiData = await callUnifiedAPI(segments, searchParams, 'single-property');
      
      if (apiData.type === 'single-property' || apiData.type === 'single-property-project') {
        const formattedData = formatSinglePropertyResponse(apiData);
        
        console.log('✅ Single property formateada exitosamente');
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
  // PROPERTY LIST
  // =====================================================
  
  async getPropertyList(segments: string[], searchParams?: URLSearchParams) {
    try {
      if (!isValidPropertySegments(segments)) {
        console.log('❌ getPropertyList: Segmentos inválidos:', segments);
        return getEmptyListResponse();
      }
      
      const apiData = await callUnifiedAPI(segments, searchParams, 'property-list');
      
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
  // SEARCH PROPERTIES (FUTURO)
  // =====================================================
  
  async searchProperties(query: any, limit = 30) {
    try {
      const searchParams = new URLSearchParams();
      
      if (query.q) searchParams.set('q', query.q);
      if (query.type) searchParams.set('type', query.type);
      if (query.location) searchParams.set('location', query.location);
      if (query.min_price) searchParams.set('min_price', query.min_price.toString());
      if (query.max_price) searchParams.set('max_price', query.max_price.toString());
      if (query.bedrooms) searchParams.set('bedrooms', query.bedrooms.toString());
      if (query.bathrooms) searchParams.set('bathrooms', query.bathrooms.toString());
      searchParams.set('limit', limit.toString());
      
      const apiData = await callUnifiedAPI(['buscar'], searchParams, 'property-search');
      
      if (apiData.type === 'property-list') {
        return formatPropertyListResponse(apiData);
      }
      
      return getEmptyListResponse();
      
    } catch (error) {
      console.error('Error searching properties:', error);
      return getEmptyListResponse();
    }
  }
  
  // =====================================================
  // FEATURED PROPERTIES (FUTURO)
  // =====================================================
  
  async getFeaturedProperties(limit = 8) {
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('featured', 'true');
      searchParams.set('limit', limit.toString());
      
      const apiData = await callUnifiedAPI(['destacadas'], searchParams, 'featured-properties');
      
      if (apiData.type === 'property-list') {
        const formatted = formatPropertyListResponse(apiData);
        return {
          ...formatted,
          properties: formatted.properties.slice(0, limit)
        };
      }
      
      return {
        type: 'property-list',
        properties: [],
        pagination: {
          currentPage: 1,
          totalCount: 0,
          itemsPerPage: limit,
          totalPages: 0,
          hasMore: false,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
      
    } catch (error) {
      console.error('Error getting featured properties:', error);
      return {
        type: 'property-list',
        properties: [],
        pagination: {
          currentPage: 1,
          totalCount: 0,
          itemsPerPage: limit,
          totalPages: 0,
          hasMore: false,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
    }
  }
}

// =====================================================
// FUNCIONES EXPORTADAS PARA BACKWARD COMPATIBILITY
// =====================================================

const propertyProvider = new PropertyProvider();

export async function getSingleProperty(segments: string[], searchParams?: URLSearchParams) {
  return propertyProvider.getSingleProperty(segments, searchParams);
}

export async function getPropertyList(segments: string[], searchParams?: URLSearchParams) {
  return propertyProvider.getPropertyList(segments, searchParams);
}