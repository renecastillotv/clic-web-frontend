// Language Selector Script - Handles multi-language switching
// CENTRALIZADO: Este script usa las URLs de hreflang generadas por el backend
document.addEventListener('DOMContentLoaded', function() {
  const languageSelector = document.getElementById('language-selector');
  const languageDropdown = document.getElementById('language-dropdown');
  const languageChevron = document.getElementById('language-chevron');
  const currentLanguageSpan = document.getElementById('current-language');

  if (!languageSelector || !languageDropdown || !languageChevron || !currentLanguageSpan) {
    console.error('Language selector elements not found');
    return;
  }

  console.log('🌍 Language selector initialized for:', window.currentLanguage);
  console.log('🌍 Available hreflang URLs:', window.hreflangData);

  // Update current language display
  const langMap = { 'es': 'ES', 'en': 'EN', 'fr': 'FR' };
  currentLanguageSpan.textContent = langMap[window.currentLanguage] || 'ES';

  /**
   * Valida que una URL no tenga prefijos de idioma duplicados
   * y sea relativa (sin dominio externo)
   */
  function validateAndCleanUrl(url, targetLang) {
    if (!url) return null;

    // Si la URL es absoluta con dominio diferente, rechazarla
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const urlObj = new URL(url);
        // Solo aceptar si es el mismo origen
        if (urlObj.origin !== window.location.origin) {
          console.warn('⚠️ Rechazando URL de dominio externo:', url);
          return null;
        }
        // Convertir a relativa
        url = urlObj.pathname + urlObj.search + urlObj.hash;
      } catch (e) {
        console.error('Error parsing URL:', e);
        return null;
      }
    }

    // Limpiar prefijos de idioma duplicados (ej: /en/fr/xxx -> /fr/xxx)
    const duplicatePrefixMatch = url.match(/^\/(en|fr)\/(en|fr)\//);
    if (duplicatePrefixMatch) {
      console.warn('⚠️ Corrigiendo prefijos duplicados en:', url);
      url = url.replace(/^\/(en|fr)\/(en|fr)\//, `/${targetLang}/`);
    }

    // Asegurar que empiece con /
    if (!url.startsWith('/')) {
      url = '/' + url;
    }

    return url;
  }

  /**
   * Preserva todos los query parameters de la URL actual
   * Incluye: ref, utm_*, fbclid, gclid, y cualquier otro parámetro
   */
  function preserveQueryParams(targetUrl) {
    const currentParams = new URLSearchParams(window.location.search);

    // Si no hay parámetros que preservar, retornar la URL original
    if (!currentParams.toString()) {
      return targetUrl;
    }

    try {
      const url = new URL(targetUrl, window.location.origin);

      // Agregar todos los parámetros actuales que no existan en la URL destino
      currentParams.forEach((value, key) => {
        // No sobrescribir parámetros que ya existan en la URL destino
        if (!url.searchParams.has(key)) {
          url.searchParams.set(key, value);
        }
      });

      console.log('🔗 Query params preserved:', currentParams.toString());
      return url.pathname + url.search + url.hash;
    } catch (e) {
      // Fallback: concatenación simple
      const separator = targetUrl.includes('?') ? '&' : '?';
      console.log('🔗 Query params preserved (fallback):', currentParams.toString());
      return `${targetUrl}${separator}${currentParams.toString()}`;
    }
  }

  /**
   * Función principal de cambio de idioma
   * Usa las URLs de hreflang proporcionadas por el backend
   */
  function changeLanguage(newLang) {
    console.log('🔄 Changing language from', window.currentLanguage, 'to', newLang);

    // Skip if already in the target language
    if (newLang === window.currentLanguage) {
      console.log('✅ Already in target language, skipping');
      closeDropdown();
      return;
    }

    // Obtener URL del hreflang data (generada por el backend centralizado)
    let targetUrl = window.hreflangData ? window.hreflangData[newLang] : null;

    // Validar y limpiar la URL
    targetUrl = validateAndCleanUrl(targetUrl, newLang);

    if (targetUrl) {
      // Preservar TODOS los query parameters de la URL actual
      targetUrl = preserveQueryParams(targetUrl);

      console.log('🚀 Redirecting to:', targetUrl);
      window.location.href = targetUrl;
    } else {
      console.error('❌ No valid hreflang URL found for language:', newLang);
      console.error('Available hreflang data:', window.hreflangData);

      // FALLBACK: Construir URL manualmente si no hay hreflang válido
      let fallbackUrl = buildFallbackUrl(newLang);
      if (fallbackUrl) {
        // También preservar query params en el fallback
        fallbackUrl = preserveQueryParams(fallbackUrl);
        console.log('🔄 Using fallback URL:', fallbackUrl);
        window.location.href = fallbackUrl;
      }
    }
  }

  /**
   * Construye una URL de fallback cuando no hay hreflang disponible
   */
  function buildFallbackUrl(targetLang) {
    const currentPath = window.location.pathname;

    // Remover prefijo de idioma actual si existe
    let cleanPath = currentPath
      .replace(/^\/(en|fr)\//, '/')
      .replace(/^\/(en|fr)$/, '/');

    // Si quedó vacío, es homepage
    if (cleanPath === '' || cleanPath === '/') {
      return targetLang === 'es' ? '/' : `/${targetLang}`;
    }

    // Agregar prefijo del nuevo idioma
    if (targetLang === 'es') {
      return cleanPath;
    }
    return `/${targetLang}${cleanPath}`;
  }

  function closeDropdown() {
    languageDropdown.classList.add('hidden');
    languageChevron.style.transform = 'rotate(0deg)';
  }

  function openDropdown() {
    languageDropdown.classList.remove('hidden');
    languageChevron.style.transform = 'rotate(180deg)';
  }

  // Toggle dropdown
  languageSelector.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    const isOpen = !languageDropdown.classList.contains('hidden');
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  // Handle language selection
  const languageOptions = document.querySelectorAll('.language-option');
  languageOptions.forEach(option => {
    option.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();

      const selectedLang = this.getAttribute('data-lang');
      changeLanguage(selectedLang);
    });
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', function(e) {
    if (!languageSelector.contains(e.target) && !languageDropdown.contains(e.target)) {
      closeDropdown();
    }
  });
});
