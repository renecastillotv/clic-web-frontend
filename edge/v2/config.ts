// 📁 supabase/functions/unified-property-search/config.ts
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
export const SUPABASE_CONFIG = {
  url: 'https://pacewqgypevfgjmdsorz.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2V3cWd5cGV2ZmdqbWRzb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NjU4OTksImV4cCI6MjA2NDI0MTg5OX0.Qlg-UVy-sikr76GxYmTcfCz1EnAqPHxvFeLrdqnjuWs'
};
export const DEFAULT_PAGINATION = {
  page: 1,
  limit: 32
};
export const CACHE_DURATIONS = {
  PROPERTY: 3600,
  SEARCH_RESULTS: 1800,
  CONTENT: 1800,
  GOOGLE_PLACES: 30 * 60 * 1000 // 30 minutos en milliseconds
};
export const CATEGORY_WEIGHTS = {
  'pais': 10,
  'operacion': 5,
  'categoria': 4,
  'ciudad': 3,
  'sector': 3,
  'provincia': 2,
  'caracteristica': 1
};
export const SYSTEM_ROUTES = [
  '/property-search',
  '/api',
  '/functions',
  '/_app',
  '/admin'
];
export const SUPPORTED_LANGUAGES = [
  'en',
  'fr',
  'es'
];
export const STATIC_COORDINATES_MAP = {
  'punta cana': {
    lat: 18.5601,
    lng: -68.3725
  },
  'bavaro': {
    lat: 18.5467,
    lng: -68.4104
  },
  'naco': {
    lat: 18.4861,
    lng: -69.9312
  },
  'piantini': {
    lat: 18.4745,
    lng: -69.9254
  },
  'bella vista': {
    lat: 18.4696,
    lng: -69.9411
  },
  'manoguayabo': {
    lat: 18.4861,
    lng: -70.0037
  },
  'santiago': {
    lat: 19.4517,
    lng: -70.6970
  },
  'distrito nacional': {
    lat: 18.4682,
    lng: -69.9279
  }
};
export const DEFAULT_DOMINICAN_REPUBLIC = {
  id: null,
  name: 'República Dominicana',
  code: 'DO',
  currency: 'USD',
  country_flag: '🇩🇴',
  subdomain: null,
  custom_domains: []
};
export const HIERARCHY_ORDER = [
  'operacion',
  'categoria',
  'ciudad',
  'sector'
];
export const MAX_LIMITS = {
  articles: 12,
  videos: 10,
  testimonials: 8,
  faqs: 15,
  seo_content: 8
};
export const THEME_MAP = {
  'airbnb': 'investment',
  'perfectos-airbnb': 'investment',
  'familia': 'family',
  'perfectos-familia': 'family',
  'lujo': 'luxury',
  'todo-lujo': 'luxury',
  'entrega-2026': 'new',
  'en-construccion': 'new',
  'default': 'default'
};
export const CATEGORY_NAMES_ES = {
  'banks': 'bancos',
  'hospitals': 'centros médicos',
  'schools': 'colegios',
  'supermarkets': 'supermercados',
  'shopping_malls': 'centros comerciales',
  'restaurants': 'restaurantes'
};
