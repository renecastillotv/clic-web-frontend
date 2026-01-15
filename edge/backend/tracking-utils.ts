// =====================================================
// 🆕 FUNCIONES DE TRACKING STRING
// =====================================================
/**
 * Extrae parámetros de tracking de una URL
 * @param {string} url - URL completa con parámetros
 * @returns {string} - String con parámetros de tracking en formato "?param=value&param2=value2" o ""
 */ function extractTrackingString(url) {
  const urlObj = new URL(url);
  const trackingParams = new URLSearchParams();
  // Extraer todos los parámetros de tracking
  for (const [key, value] of urlObj.searchParams.entries()){
    if (key.startsWith('utm_') || key === 'ref' || key.startsWith('fbclid') || key.startsWith('gclid') || key.startsWith('msclkid') || key.startsWith('ttclid')) {
      trackingParams.set(key, value);
    }
  }
  const trackingString = trackingParams.toString() ? `?${trackingParams.toString()}` : '';
  console.log('🔍 Tracking extraído:', {
    originalUrl: url,
    extractedParams: Object.fromEntries(trackingParams.entries()),
    trackingString: trackingString
  });
  return trackingString;
}
/**
 * Agrega parámetros de tracking a una URL base
 * @param {string} baseUrl - URL base
 * @param {string} trackingString - String de tracking (con ? al inicio)
 * @returns {string} - URL con parámetros de tracking agregados
 */ function addTrackingToUrl(baseUrl, trackingString) {
  if (!trackingString) return baseUrl;
  // Si la URL ya tiene parámetros, agregar con &
  if (baseUrl.includes('?')) {
    return baseUrl + '&' + trackingString.substring(1);
  }
  // Si no tiene parámetros, agregar con ?
  return baseUrl + trackingString;
}
/**
 * Genera URL con tracking preservando la estructura original
 * @param {string} baseUrl - URL base
 * @param {string} trackingString - String de tracking
 * @returns {string} - URL completa con tracking
 */ function generateUrlWithTracking(baseUrl, trackingString) {
  if (!trackingString) return baseUrl;
  return addTrackingToUrl(baseUrl, trackingString);
}
/**
 * Procesa múltiples URLs agregando tracking a todas
 * @param {Array|Object} urls - Array de URLs o objeto con URLs
 * @param {string} trackingString - String de tracking
 * @returns {Array|Object} - URLs procesadas con tracking
 */ function processUrlsWithTracking(urls, trackingString) {
  if (!urls || typeof urls !== 'object') return urls;
  if (Array.isArray(urls)) {
    return urls.map((url)=>generateUrlWithTracking(url, trackingString));
  }
  const processedUrls = {};
  for (const [key, value] of Object.entries(urls)){
    if (typeof value === 'string') {
      processedUrls[key] = generateUrlWithTracking(value, trackingString);
    } else {
      processedUrls[key] = value;
    }
  }
  return processedUrls;
}
// =====================================================
// EJEMPLO DE USO EN TU EDGE FUNCTION PRINCIPAL
// =====================================================
/*
// 1. Al inicio de tu edge function, extraer tracking:
const trackingString = extractTrackingString(req.url);

// 2. Agregar tracking a breadcrumbs:
breadcrumbs.push({
  name: 'Inicio',
  url: addTrackingToUrl('/', trackingString)
});

// 3. Agregar tracking a propiedades:
const enhancedProperties = properties.map(property => ({
  ...property,
  url_with_tracking: addTrackingToUrl(property.slug_url, trackingString)
}));

// 4. Agregar tracking a respuesta final:
const response = {
  // ... otras propiedades
  trackingString: trackingString,
  properties: enhancedProperties,
  breadcrumbs: breadcrumbsWithTracking
};
*/ // =====================================================
// EXPORT PARA USO MODULAR
// =====================================================
export { extractTrackingString, addTrackingToUrl, generateUrlWithTracking, processUrlsWithTracking };
