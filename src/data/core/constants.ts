// src/data/core/constants.ts
// =====================================================
// CONFIGURACIÓN Y CONSTANTES CENTRALIZADAS
// =====================================================

// Configuración de API - Usar Neon Edge Functions en Vercel
export const API_CONFIG = {
  URL: 'https://clic-api-neon.vercel.app',
  // La API de Neon es pública, no necesita API key
  USE_AUTH: false
};

// Mantener Supabase config como fallback/referencia
export const SUPABASE_CONFIG = {
  URL: 'https://pacewqgypevfgjmdsorz.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhY2V3cWd5cGV2ZmdqbWRzb3J6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2NjU4OTksImV4cCI6MjA2NDI0MTg5OX0.Qlg-UVy-sikr76GxYmTcfCz1EnAqPHxvFeLrdqnjuWs'
};

export const CACHE_CONFIG = {
  TTL: 30000, // 30 segundos
  MAX_SIZE: 50,
  CLEANUP_THRESHOLD: 25
};

export const VALIDATION_CONFIG = {
  INVALID_SEGMENTS: [
    'images', 'img', 'assets', 'static', 'public', 'favicon.ico',
    'css', 'js', 'fonts', '_astro', 'api', 'admin', 'robots.txt',
    'sitemap.xml', 'manifest.json', 'sw.js', '.well-known'
  ],
  FILE_EXTENSIONS: [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico',
    '.css', '.js', '.json', '.xml', '.txt', '.pdf', '.zip',
    '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.mp3'
  ],
  MIN_SEGMENT_LENGTH: 2,
  MAX_SEGMENTS_LENGTH: 10
};

export const DEFAULT_LIMITS = {
  PROPERTIES_PER_PAGE: 30,
  SIMILAR_PROPERTIES: 6,
  AGENT_PROPERTIES: 6,
  FEATURED_PROPERTIES: 8,
  SEARCH_RESULTS: 30
};

export const API_TIMEOUTS = {
  DEFAULT: 10000, // 10 segundos
  SEARCH: 15000,  // 15 segundos para búsquedas
  UPLOAD: 30000   // 30 segundos para uploads
};

export const IMAGE_DEFAULTS = {
  PLACEHOLDER_PROPERTY: '/images/placeholder-property.jpg',
  PLACEHOLDER_AGENT: '/images/default-agent.jpg',
  MAX_IMAGES_PER_PROPERTY: 50
};

export const CONTACT_DEFAULTS = {
  COMPANY_NAME: 'CLIC Inmobiliaria',
  COMPANY_PHONE: '+1-829-555-0100',
  COMPANY_EMAIL: 'info@clicinmobiliaria.com',
  COMPANY_WHATSAPP: 'https://wa.me/18295550100'
};

export const SEO_DEFAULTS = {
  SITE_NAME: 'CLIC Inmobiliaria',
  DEFAULT_TITLE: 'Propiedades en República Dominicana | CLIC Inmobiliaria',
  DEFAULT_DESCRIPTION: 'Encuentra tu hogar ideal con CLIC Inmobiliaria. Las mejores propiedades en República Dominicana con financiamiento y asesoría especializada.',
  DEFAULT_KEYWORDS: ['inmobiliaria', 'propiedades', 'república dominicana', 'casas', 'apartamentos', 'venta', 'alquiler']
};