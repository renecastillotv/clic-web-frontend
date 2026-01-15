// src/config/api.ts
// Configuración de endpoints de API
// Permite cambiar fácilmente entre Supabase Edge Functions y Vercel Edge Functions

// ============================================================================
// CONFIGURACIÓN DE ENTORNO
// ============================================================================

// Determinar el entorno actual
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

// ============================================================================
// BACKENDS DISPONIBLES
// ============================================================================

export type BackendType = 'supabase' | 'vercel' | 'local';

interface BackendConfig {
  name: string;
  mainBackend: string;
  contentBackend?: string; // Solo para Supabase que tiene backends separados
  authToken?: string;
  timeout: number;
}

const BACKENDS: Record<BackendType, BackendConfig> = {
  // Backend legacy en Supabase (mantener como fallback)
  supabase: {
    name: 'Supabase Edge Functions (Legacy)',
    mainBackend: 'https://pacewqgypevfgjmdsorz.supabase.co/functions/v1/backend',
    contentBackend: 'https://pacewqgypevfgjmdsorz.supabase.co/functions/v1/content-backend',
    authToken: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2V3cWd5cGV2ZmdqbWRzb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NjU4OTksImV4cCI6MjA2NDI0MTg5OX0.Qlg-UVy-sikr76GxYmTcfCz1EnAqPHxvFeLrdqnjuWs',
    timeout: 5000,
  },

  // Backend activo en Vercel (con Neon) - USAR ESTE
  vercel: {
    name: 'Vercel Edge Functions (Neon)',
    mainBackend: 'https://clic-api-neon.vercel.app',
    timeout: 8000,
  },

  // Para desarrollo local
  local: {
    name: 'Local Development',
    mainBackend: 'http://localhost:3000/api',
    timeout: 10000,
  },
};

// ============================================================================
// CONFIGURACIÓN ACTIVA
// ============================================================================

// Seleccionar backend basado en variable de entorno o por defecto
const getActiveBackend = (): BackendType => {
  const envBackend = import.meta.env.PUBLIC_API_BACKEND as BackendType;

  if (envBackend && BACKENDS[envBackend]) {
    return envBackend;
  }

  // Por defecto usar Vercel con Neon (backend activo)
  return 'vercel';
};

export const ACTIVE_BACKEND = getActiveBackend();
export const API_CONFIG = BACKENDS[ACTIVE_BACKEND];

// ============================================================================
// RUTAS ESPECIALES (para determinar qué backend usar)
// ============================================================================

// En Supabase, las rutas de contenido van a content-backend
const CONTENT_ROUTES = [
  'asesores', 'advisors', 'conseillers',
  'favoritos', 'favorites', 'favoris',
  'testimonios', 'testimonials', 'temoignages',
  'videos',
  'articulos', 'articles',
  'contacto', 'contact',
  'vender', 'sell', 'vendre',
  'rentas-vacacionales', 'vacation-rentals', 'locations-vacances',
  'planes-rentas-vacacionales', 'vacation-rental-plans', 'plans-locations-vacances',
  'listados-de', 'listings-of', 'listes-de',
  'ubicaciones', 'locations', 'emplacements',
  'propiedades', 'property-types', 'types-de-proprietes',
  'terminos-y-condiciones', 'terms-and-conditions', 'termes-et-conditions',
  'politicas-de-privacidad', 'privacy-policy', 'politique-de-confidentialite',
];

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Determina si una ruta debe ir al backend de contenido (solo para Supabase)
 */
export function isContentRoute(path: string): boolean {
  const firstSegment = path.split('/').filter(Boolean)[0] || '';
  return CONTENT_ROUTES.includes(firstSegment) || path === '' || path === '/';
}

/**
 * Obtiene la URL completa del backend para una ruta específica
 */
export function getBackendUrl(path: string): string {
  if (ACTIVE_BACKEND === 'supabase') {
    // Supabase tiene backends separados
    const useContent = isContentRoute(path);
    const baseUrl = useContent
      ? API_CONFIG.contentBackend || API_CONFIG.mainBackend
      : API_CONFIG.mainBackend;
    return baseUrl;
  }

  // Vercel y local usan un solo endpoint
  return API_CONFIG.mainBackend;
}

/**
 * Construye los headers para las peticiones al backend
 */
export function getRequestHeaders(host?: string): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (ACTIVE_BACKEND === 'supabase' && API_CONFIG.authToken) {
    headers['Authorization'] = API_CONFIG.authToken;
  }

  if (host) {
    headers['X-Original-Host'] = host;
    headers['User-Agent'] = `CLIC-Router/${host}`;
  }

  return headers;
}

/**
 * Realiza una petición al backend con manejo de errores y timeout
 */
export async function fetchFromBackend<T = any>(
  path: string,
  options: {
    host?: string;
    params?: URLSearchParams | Record<string, string>;
    timeout?: number;
  } = {}
): Promise<T> {
  const { host, params, timeout = API_CONFIG.timeout } = options;

  // Construir URL
  const backendUrl = getBackendUrl(path);
  const searchParams = params instanceof URLSearchParams
    ? params
    : new URLSearchParams(params || {});

  // Agregar host si está disponible
  if (host) {
    searchParams.set('domain', host);
  }

  const url = `${backendUrl}${path}?${searchParams.toString()}`;

  console.log(`[API Config] Fetching: ${url}`);
  console.log(`[API Config] Backend: ${API_CONFIG.name}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: getRequestHeaders(host),
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with ${response.status}`);
    }

    return response.json();
  } catch (error: any) {
    console.error('[API Config] Fetch error:', error?.message || error);
    throw error;
  }
}

// ============================================================================
// INFORMACIÓN DE DEBUG
// ============================================================================

export function getApiDebugInfo() {
  return {
    activeBackend: ACTIVE_BACKEND,
    backendName: API_CONFIG.name,
    mainUrl: API_CONFIG.mainBackend,
    contentUrl: API_CONFIG.contentBackend,
    timeout: API_CONFIG.timeout,
    hasAuth: !!API_CONFIG.authToken,
    isDev,
    isProd,
  };
}

// Log de configuración en desarrollo
if (isDev) {
  console.log('[API Config] Active configuration:', getApiDebugInfo());
}

export default {
  ACTIVE_BACKEND,
  API_CONFIG,
  isContentRoute,
  getBackendUrl,
  getRequestHeaders,
  fetchFromBackend,
  getApiDebugInfo,
};
