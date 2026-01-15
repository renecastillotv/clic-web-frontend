// src/data/core/apiClient.ts
// =====================================================
// CLIENTE API CENTRALIZADO CON CACHE
// =====================================================

import { API_CONFIG, SUPABASE_CONFIG, CACHE_CONFIG, API_TIMEOUTS } from './constants.js';
import { cleanUrlSegments, validateSearchParams } from './validation.js';
import type { APIResponse } from '../types/interfaces.js';

// =====================================================
// CACHE MANAGER
// =====================================================

class CacheManager {
  private cache = new Map<string, { data: any; timestamp: number }>();
  
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_CONFIG.TTL) {
      console.log('📦 Cache hit for:', key);
      return cached.data;
    }
    
    if (cached) {
      console.log('⏰ Cache expired for:', key);
      this.cache.delete(key);
    }
    
    return null;
  }
  
  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Cleanup if cache gets too large
    if (this.cache.size > CACHE_CONFIG.MAX_SIZE) {
      const keys = Array.from(this.cache.keys()).slice(0, CACHE_CONFIG.CLEANUP_THRESHOLD);
      keys.forEach(key => this.cache.delete(key));
      console.log('🧹 Cache cleanup: removed', keys.length, 'entries');
    }
  }
  
  clear(): void {
    this.cache.clear();
    console.log('🗑️ Cache cleared');
  }
  
  size(): number {
    return this.cache.size;
  }
}

// Instancia global del cache
const apiCache = new CacheManager();

// =====================================================
// CLIENTE API PRINCIPAL
// =====================================================

export async function callUnifiedAPI(
  segments: string[], 
  searchParams?: URLSearchParams,
  context?: string
): Promise<APIResponse> {
  console.log('🔄 Calling Unified Edge Function:', {
    segments,
    context,
    hasSearchParams: !!searchParams
  });
  
  // Generar cache key
  const cacheKey = generateCacheKey(segments, searchParams, context);
  
  // Verificar cache
  const cached = apiCache.get(cacheKey);
  if (cached) {
    console.log('✅ Returning cached result');
    return cached;
  }
  
  try {
    // Limpiar y validar segmentos
    const cleanedSegments = cleanUrlSegments(segments);
    console.log('🧹 Cleaned segments:', cleanedSegments);
    
    // Validar parámetros de búsqueda
    if (searchParams && !validateSearchParams(searchParams)) {
      throw new Error('Invalid search parameters');
    }
    
    // Construir URL de la API
    const apiUrl = buildApiUrl(cleanedSegments, searchParams);
    console.log('🌐 Final API URL:', apiUrl);
    
    // Realizar llamada HTTP
    const response = await makeHttpRequest(apiUrl, context);
    
    // Procesar respuesta
    const data = await processApiResponse(response);
    
    // Logging de características de la respuesta
    logResponseFeatures(data);
    
    // Guardar en cache
    apiCache.set(cacheKey, data);
    
    return data;
    
  } catch (error) {
    console.error('❌ Error calling edge function:', error);
    
    if (error.message.includes('Invalid')) {
      throw error;
    }
    
    throw new Error(`API call failed: ${error.message}`);
  }
}

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function generateCacheKey(segments: string[], searchParams?: URLSearchParams, context?: string): string {
  const segmentsKey = segments.join('/');
  const paramsKey = searchParams ? searchParams.toString() : '';
  const contextKey = context || '';
  
  return `${segmentsKey}${paramsKey ? '?' + paramsKey : ''}${contextKey ? '#' + contextKey : ''}`;
}

function buildApiUrl(segments: string[], searchParams?: URLSearchParams): string {
  const apiPath = segments.length > 0 ? `/${segments.join('/')}` : '/';
  // Usar la nueva API de Neon en lugar de Supabase
  let apiUrl = `${API_CONFIG.URL}${apiPath}`;

  // Agregar parámetros válidos
  const params = new URLSearchParams();
  if (searchParams) {
    if (searchParams.get('ref')) params.set('ref', searchParams.get('ref')!);
    if (searchParams.get('page')) params.set('page', searchParams.get('page')!);
    if (searchParams.get('limit')) params.set('limit', searchParams.get('limit')!);
    // Agregar otros parámetros válidos según necesidad
  }

  if (params.toString()) {
    apiUrl += `?${params.toString()}`;
  }

  return apiUrl;
}

async function makeHttpRequest(url: string, context?: string): Promise<Response> {
  const timeout = getTimeoutForContext(context);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('⏰ Request timeout for:', url);
    controller.abort();
  }, timeout);

  // Construir headers - solo agregar Authorization si la API lo requiere
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'CLIC-Inmobiliaria/1.0'
  };

  // La nueva API de Neon no requiere autenticación
  if (API_CONFIG.USE_AUTH) {
    headers['Authorization'] = `Bearer ${SUPABASE_CONFIG.ANON_KEY}`;
  }

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function processApiResponse(response: Response): Promise<APIResponse> {
  const contentType = response.headers.get('content-type');
  
  if (!contentType || !contentType.includes('application/json')) {
    throw new Error('Invalid response content type');
  }
  
  const data = await response.json();
  
  if (!data.type) {
    console.warn('⚠️ API response missing type field');
    data.type = 'error';
  }
  
  return data;
}

function getTimeoutForContext(context?: string): number {
  switch (context) {
    case 'property-search':
    case 'agent-search':
      return API_TIMEOUTS.SEARCH;
    case 'upload':
      return API_TIMEOUTS.UPLOAD;
    default:
      return API_TIMEOUTS.DEFAULT;
  }
}

function logResponseFeatures(data: APIResponse): void {
  console.log('📊 API Response features:', {
    type: data.type,
    hasBreadcrumbs: !!data.breadcrumbs?.length,
    breadcrumbsCount: data.breadcrumbs?.length || 0,
    hasSimilarProperties: !!data.similarProperties?.length,
    similarPropertiesCount: data.similarProperties?.length || 0,
    hasLocation: !!data.location,
    hasCoordinates: !!(data.location?.coordinates),
    coordinatesSource: data.location?.coordinatesSource,
    showExactLocation: data.location?.showExactLocation,
    hasExactCoordinates: data.location?.hasExactCoordinates,
    mapZoom: data.location?.mapConfig?.zoom,
    hasAgent: !!(data.agent || data.referralAgent),
    agentName: data.agent?.name || data.referralAgent?.name,
    hasAgentProperties: !!data.agentProperties?.length,
    agentPropertiesCount: data.agentProperties?.length || 0,
    hasAgentPropertiesInfo: !!data.agentPropertiesInfo,
    agentLanguages: data.agent?.languages || data.referralAgent?.languages,
    hasContentHierarchy: !!data.relatedContent?.hierarchy_info,
    contentSource: data.relatedContent?.content_source,
    hasSeoContent: !!(data.relatedContent?.seo_content?.length),
    seoContentCount: data.relatedContent?.seo_content?.length || 0,
    hasTagRelatedContent: !!data.meta?.tagRelatedContentUsed
  });
}

// =====================================================
// FUNCIONES DE CACHE PÚBLICAS
// =====================================================

export function clearCache(): void {
  apiCache.clear();
}

export function getCacheSize(): number {
  return apiCache.size();
}

export function getCacheStats(): { size: number; maxSize: number; ttl: number } {
  return {
    size: apiCache.size(),
    maxSize: CACHE_CONFIG.MAX_SIZE,
    ttl: CACHE_CONFIG.TTL
  };
}

// =====================================================
// TIPOS DE RESPUESTA ESPECÍFICOS
// =====================================================

export interface PropertyAPIResponse extends APIResponse {
  type: 'single-property' | 'single-property-project';
  property: NonNullable<APIResponse['property']>;
}

export interface PropertyListAPIResponse extends APIResponse {
  type: 'property-list';
  searchResults: NonNullable<APIResponse['searchResults']>;
}

export interface ErrorAPIResponse extends APIResponse {
  type: 'error';
  error: {
    code: string;
    message: string;
    details?: any;
  };
}