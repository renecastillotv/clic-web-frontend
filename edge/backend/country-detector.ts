// country-detector.ts
// CONFIGURACIÓN PARA TESTING - Cambiar aquí para probar diferentes países
const TESTING_CONFIG = {
  enabled: false,
  forceCountryCode: 'DOM'
};
/**
 * Extrae el host real del request considerando proxies y CDNs
 */ export function getRealHost(req) {
  // Priorizar headers custom que enviamos desde Astro
  const originalHost = req.headers.get('x-original-host');
  const forwardedHost = req.headers.get('x-forwarded-host');
  const realHost = req.headers.get('x-real-host');
  const userAgent = req.headers.get('user-agent');
  const host = req.headers.get('host');
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  console.log('Headers debug:', {
    originalHost,
    forwardedHost,
    realHost,
    userAgent,
    host,
    origin,
    referer
  });
  // Usar el host original que enviamos desde Astro
  if (originalHost && !originalHost.includes('supabase.co')) {
    console.log('Using original host from Astro:', originalHost);
    return originalHost;
  }
  // Si hay forwarded host, usarlo
  if (forwardedHost && !forwardedHost.includes('supabase.co')) {
    console.log('Using forwarded host:', forwardedHost);
    return forwardedHost;
  }
  // Usar real host header
  if (realHost && !realHost.includes('supabase.co')) {
    console.log('Using real host:', realHost);
    return realHost;
  }
  // NUEVO: Extraer dominio del User-Agent
  if (userAgent) {
    const match = userAgent.match(/CLIC-[^\/]+\/(.+)$/);
    if (match && match[1] && !match[1].includes('supabase.co')) {
      console.log('Using domain from User-Agent:', match[1]);
      return match[1];
    }
  }
  // Si hay origin, extraer el host
  if (origin) {
    try {
      const url = new URL(origin);
      if (!url.host.includes('supabase.co')) {
        console.log('Using origin host:', url.host);
        return url.host;
      }
    } catch (e) {
      console.log('Failed to parse origin, continuing...');
    }
  }
  // Extraer de referer si existe
  if (referer) {
    try {
      const url = new URL(referer);
      if (!url.host.includes('supabase.co')) {
        console.log('Using referer host:', url.host);
        return url.host;
      }
    } catch (e) {
      console.log('Failed to parse referer, continuing...');
    }
  }
  // Usar host header como fallback
  if (host && !host.includes('supabase.co')) {
    console.log('Using host header:', host);
    return host;
  }
  // Fallback por defecto
  console.log('Using default fallback host');
  return 'clicinmobiliaria.com';
}
/**
 * Construye el dominio completo con protocolo
 */ export function getRealDomain(req) {
  const host = getRealHost(req);
  // Para desarrollo, usar http en localhost
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return `http://${host}`;
  }
  const protocol = req.headers.get('x-forwarded-proto') || 'https';
  return `${protocol}://${host}`;
}
/**
 * Determina el país basado en el dominio del request
 */ export async function getCountryByDomain(supabase, host) {
  console.log('🌍 === COUNTRY DETECTION START ===');
  console.log('🔍 Detecting country for host:', host);
  // MODO TESTING - Forzar país específico para pruebas
  if (TESTING_CONFIG.enabled) {
    console.log('🧪 TESTING MODE ENABLED - Forcing country:', TESTING_CONFIG.forceCountryCode);
    try {
      const { data: forcedCountry } = await supabase.from('countries').select(`
          id, name, code, country_tag_id, subdomain, custom_domain, currency, timezone,
          tags!countries_country_tag_id_fkey(
            id, slug, slug_en, slug_fr, category, display_name, display_name_en, display_name_fr
          )
        `).eq('code', TESTING_CONFIG.forceCountryCode).eq('active', true).single();
      if (forcedCountry) {
        console.log('✅ TESTING: Using forced country:', forcedCountry.name);
        console.log('📋 TESTING: Country data:', JSON.stringify({
          id: forcedCountry.id,
          name: forcedCountry.name,
          code: forcedCountry.code,
          subdomain: forcedCountry.subdomain,
          custom_domain: forcedCountry.custom_domain,
          tag_id: forcedCountry.country_tag_id
        }, null, 2));
        return forcedCountry;
      } else {
        console.log('❌ TESTING: Forced country not found, falling back to normal detection');
      }
    } catch (error) {
      console.log('❌ TESTING: Error getting forced country, falling back to normal detection:', error);
    }
  }
  try {
    console.log('🔍 === PRODUCTION MODE: Searching by host ===');
    // PASO 1: Buscar por custom_domain exacto
    console.log('🎯 Step 1: Searching for custom_domain match:', host);
    const { data: customDomainCountry, error: customError } = await supabase.from('countries').select(`
        id, name, code, country_tag_id, subdomain, custom_domain, currency, timezone,
        tags!countries_country_tag_id_fkey(
          id, slug, slug_en, slug_fr, category, display_name, display_name_en, display_name_fr
        )
      `).eq('custom_domain', host).eq('active', true).maybeSingle();
    if (customError) {
      console.log('❌ Custom domain query error:', customError);
    } else if (customDomainCountry) {
      console.log('✅ Found country by custom domain:', customDomainCountry.name);
      console.log('📋 Custom domain match data:', JSON.stringify({
        id: customDomainCountry.id,
        name: customDomainCountry.name,
        code: customDomainCountry.code,
        custom_domain: customDomainCountry.custom_domain,
        tag_id: customDomainCountry.country_tag_id
      }, null, 2));
      return customDomainCountry;
    }
    // PASO 2: Buscar por subdomain
    if (host.includes('.')) {
      const subdomain = host.split('.')[0];
      console.log('🎯 Step 2: Searching for subdomain match:', subdomain);
      const { data: subdomainCountry, error: subdomainError } = await supabase.from('countries').select(`
          id, name, code, country_tag_id, subdomain, custom_domain, currency, timezone,
          tags!countries_country_tag_id_fkey(
            id, slug, slug_en, slug_fr, category, display_name, display_name_en, display_name_fr
          )
        `).eq('subdomain', subdomain).eq('active', true).maybeSingle();
      if (subdomainCountry) {
        console.log('✅ Found country by subdomain:', subdomainCountry.name);
        console.log('📋 Subdomain match data:', JSON.stringify({
          id: subdomainCountry.id,
          name: subdomainCountry.name,
          code: subdomainCountry.code,
          subdomain: subdomainCountry.subdomain,
          tag_id: subdomainCountry.country_tag_id
        }, null, 2));
        return subdomainCountry;
      }
      if (subdomainError) {
        console.log('⚠️ Subdomain query error:', subdomainError);
      }
    }
    // PASO 3: Buscar en custom_domains como array (para dominios múltiples)
    console.log('🎯 Step 3: Searching in custom_domains arrays...');
    const { data: allCountries } = await supabase.from('countries').select(`
        id, name, code, country_tag_id, subdomain, custom_domain, currency, timezone,
        tags!countries_country_tag_id_fkey(
          id, slug, slug_en, slug_fr, category, display_name, display_name_en, display_name_fr
        )
      `).eq('active', true).not('custom_domain', 'is', null);
    console.log('📊 Found', allCountries?.length || 0, 'active countries with custom domains');
    if (allCountries && allCountries.length > 0) {
      for (const country of allCountries){
        console.log('🔍 Checking country:', country.name, 'with custom_domain:', country.custom_domain);
        // Si custom_domain es un string, comparar directamente
        if (typeof country.custom_domain === 'string') {
          if (country.custom_domain === host) {
            console.log('✅ Found exact string match:', country.name);
            console.log('📋 String match data:', JSON.stringify({
              id: country.id,
              name: country.name,
              code: country.code,
              custom_domain: country.custom_domain,
              tag_id: country.country_tag_id
            }, null, 2));
            return country;
          }
        } else if (Array.isArray(country.custom_domain)) {
          const matchesDomain = country.custom_domain.some((domain)=>{
            // Comparación exacta
            if (domain === host) return true;
            // Comparación con wildcard para subdominios
            if (domain.startsWith('*.')) {
              const baseDomain = domain.substring(2);
              return host.endsWith(baseDomain);
            }
            // Comparación sin www
            if (domain.startsWith('www.') && host === domain.substring(4)) return true;
            if (host.startsWith('www.') && domain === host.substring(4)) return true;
            return false;
          });
          if (matchesDomain) {
            console.log('✅ Found array match:', country.name, 'for domain:', host);
            console.log('📋 Array match data:', JSON.stringify({
              id: country.id,
              name: country.name,
              code: country.code,
              custom_domain: country.custom_domain,
              tag_id: country.country_tag_id
            }, null, 2));
            return country;
          }
        }
      }
    }
    // PASO 4: Fallback a República Dominicana por defecto
    console.log('⚠️ No match found, using default country (DOM)');
    const { data: defaultCountry } = await supabase.from('countries').select(`
        id, name, code, country_tag_id, subdomain, custom_domain, currency, timezone,
        tags!countries_country_tag_id_fkey(
          id, slug, slug_en, slug_fr, category, display_name, display_name_en, display_name_fr
        )
      `).eq('code', 'DOM').eq('active', true).single();
    if (!defaultCountry) {
      throw new Error('Default country (DOM) not found in database');
    }
    console.log('✅ Using default country:', defaultCountry.name);
    console.log('📋 Default country data:', JSON.stringify({
      id: defaultCountry.id,
      name: defaultCountry.name,
      code: defaultCountry.code,
      subdomain: defaultCountry.subdomain,
      custom_domain: defaultCountry.custom_domain,
      tag_id: defaultCountry.country_tag_id
    }, null, 2));
    return defaultCountry;
  } catch (error) {
    console.error('❌ Error detecting country:', error);
    // En caso de error crítico, crear objeto mínimo para DOM
    const fallbackCountry = {
      id: '0bd97f6d-5eda-4990-90e7-270148613a25',
      name: 'República Dominicana',
      code: 'DOM',
      country_tag_id: 'e21da0f2-6f5a-4ae0-ac65-d98d00d770fd',
      currency: 'DOP',
      timezone: 'America/Santo_Domingo',
      tags: {
        id: 'e21da0f2-6f5a-4ae0-ac65-d98d00d770fd',
        slug: 'republica-dominicana',
        slug_en: 'dominican-republic',
        slug_fr: 'republique-dominicaine',
        category: 'pais',
        display_name: 'República Dominicana',
        display_name_en: 'Dominican Republic',
        display_name_fr: 'République Dominicaine'
      }
    };
    console.log('🛡️ Using hardcoded fallback for DOM');
    console.log('📋 Fallback data:', JSON.stringify({
      id: fallbackCountry.id,
      name: fallbackCountry.name,
      code: fallbackCountry.code,
      tag_id: fallbackCountry.country_tag_id
    }, null, 2));
    return fallbackCountry;
  }
}
/**
 * Función principal que detecta país y construye información de dominio
 */ export async function detectCountryAndDomain(req, supabase) {
  console.log('🚀 === DOMAIN DETECTION START ===');
  console.log('DEBUG TESTING_CONFIG:', TESTING_CONFIG);
  let realHost, realDomain;
  let detectionSource = 'unknown';
  // Extraer domainParam una sola vez al inicio
  const url = new URL(req.url);
  let domainParam = url.searchParams.get('domain');

  // FIX: Manejar puerto en localhost que puede venir truncado o en la URL completa
  console.log('🔍 Raw domainParam from query:', domainParam);
  console.log('🔍 Full request URL:', req.url);

  // Si domainParam es "localhost" sin puerto, intentar extraer el puerto de la URL completa
  if (domainParam === 'localhost' && req.url.includes('localhost')) {
    // Buscar puerto en la URL completa después de localhost
    const portMatch = req.url.match(/localhost[:%](\d+)/);
    if (portMatch && portMatch[1]) {
      domainParam = `localhost:${portMatch[1]}`;
      console.log('✅ Puerto recuperado de URL completa:', domainParam);
    }
  }

  // PRIORIDAD 1: TESTING MODE - Máxima prioridad para desarrollo
  if (TESTING_CONFIG.enabled) {
    realHost = TESTING_CONFIG.developmentHost || 'localhost:4321';
    realDomain = `http://${realHost}`;
    detectionSource = 'testing';
    console.log('🧪 TESTING MODE - Using localhost (highest priority):', {
      realHost,
      realDomain
    });
  } else if (domainParam && !domainParam.includes('supabase.co')) {
    console.log('🎯 Using domain from query parameter:', domainParam);
    realHost = domainParam;
    realDomain = domainParam.includes('localhost') ? `http://${domainParam}` : `https://${domainParam}`;
    detectionSource = 'query-param';
    console.log('🏠 Constructed realDomain:', realDomain);
  } else if (req.headers.get('x-original-domain')) {
    const headerDomain = req.headers.get('x-original-domain');
    console.log('📡 Using domain from X-Original-Domain header:', headerDomain);
    realHost = headerDomain;
    realDomain = headerDomain.includes('localhost') ? `http://${headerDomain}` : `https://${headerDomain}`;
    detectionSource = 'header';
  } else {
    console.log('🔍 Using automatic host detection');
    realHost = getRealHost(req);
    realDomain = getRealDomain(req);
    detectionSource = 'auto-detection';
  }
  console.log('🏠 Final host determined:', {
    realHost,
    realDomain,
    source: detectionSource
  });
  const country = await getCountryByDomain(supabase, realHost);
  console.log('🎉 === FINAL DOMAIN INFO ===');
  console.log('Domain Info:', {
    realHost,
    realDomain,
    countryName: country.name,
    countryCode: country.code,
    countryTagId: country.country_tag_id,
    hasTagData: !!country.tags
  });
  return {
    realHost,
    realDomain,
    country
  };
}
