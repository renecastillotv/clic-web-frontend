/**
 * Service Worker para CLIC Inmobiliaria
 * Cache-first strategy para assets estáticos
 * Network-first para páginas dinámicas
 */

const CACHE_VERSION = 'clic-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;

// Assets críticos para cachear en install
const STATIC_ASSETS = [
  '/',
  '/favicon.svg',
  '/logo.png',
  '/manifest.json'
];

// Límites de cache
const MAX_DYNAMIC_ITEMS = 50;
const MAX_IMAGE_ITEMS = 100;

/**
 * Install Event - Cachear assets críticos
 */
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting(); // Activar inmediatamente
      })
      .catch((error) => {
        console.error('❌ Service Worker: Installation failed', error);
      })
  );
});

/**
 * Activate Event - Limpiar caches antiguos
 */
self.addEventListener('activate', (event) => {
  console.log('🔄 Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Eliminar caches que no sean de la versión actual
              return cacheName.startsWith('clic-') && !cacheName.startsWith(CACHE_VERSION);
            })
            .map((cacheName) => {
              console.log('🗑️ Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Activation complete');
        return self.clients.claim(); // Controlar páginas inmediatamente
      })
  );
});

/**
 * Fetch Event - Estrategias de cache
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo cachear GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Ignorar requests de analytics y external APIs
  if (
    url.hostname.includes('google-analytics') ||
    url.hostname.includes('googletagmanager') ||
    url.hostname.includes('analytics') ||
    url.hostname.includes('hotjar') ||
    url.pathname.includes('/api/') ||
    url.pathname.includes('/functions/')
  ) {
    return;
  }

  // Estrategia según tipo de recurso
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE, MAX_IMAGE_ITEMS));
  } else if (isStaticAsset(request)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else {
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE, MAX_DYNAMIC_ITEMS));
  }
});

/**
 * Cache-First Strategy
 * Para assets estáticos e imágenes
 */
async function cacheFirstStrategy(request, cacheName, maxItems = Infinity) {
  try {
    // 1. Buscar en cache
    const cachedResponse = await caches.open(cacheName).then((cache) => cache.match(request));

    if (cachedResponse) {
      console.log('✅ Cache hit:', request.url);
      return cachedResponse;
    }

    // 2. No está en cache, fetch de red
    console.log('🌐 Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);

    // 3. Cachear si la respuesta es válida
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);

      // Limitar tamaño del cache
      await limitCacheSize(cacheName, maxItems);

      // Clonar porque la respuesta solo se puede usar una vez
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('❌ Cache-first strategy failed:', error);

    // Fallback: intentar servir desde cualquier cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Último recurso: offline page
    return new Response('Offline - No hay conexión a internet', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

/**
 * Network-First Strategy
 * Para páginas HTML dinámicas
 */
async function networkFirstStrategy(request, cacheName, maxItems = Infinity) {
  try {
    // 1. Intentar fetch de red primero
    const networkResponse = await fetch(request);

    // 2. Cachear respuesta válida
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);

      await limitCacheSize(cacheName, maxItems);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.warn('🌐 Network failed, trying cache:', request.url);

    // 3. Si falla red, intentar cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log('✅ Serving from cache (network failed):', request.url);
      return cachedResponse;
    }

    // 4. No hay cache ni red
    return new Response('Offline - Página no disponible sin conexión', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

/**
 * Limitar tamaño del cache eliminando items antiguos
 */
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    const itemsToDelete = keys.length - maxItems;
    console.log(`🗑️ Deleting ${itemsToDelete} old cache items from ${cacheName}`);

    // Eliminar los primeros N items (más antiguos)
    for (let i = 0; i < itemsToDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}

/**
 * Verificar si es request de imagen
 */
function isImageRequest(request) {
  const url = new URL(request.url);
  return (
    request.destination === 'image' ||
    /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname)
  );
}

/**
 * Verificar si es asset estático
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    /\.(css|js|woff|woff2|ttf|eot)$/i.test(url.pathname)
  );
}

/**
 * Message Event - Comandos desde el cliente
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

console.log('🚀 Service Worker script loaded');
