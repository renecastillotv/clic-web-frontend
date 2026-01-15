import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { detectCountryAndDomain } from './country-detector.ts';
// Importar todos los handlers modulares
import { handleArticles } from './articles-handler.ts';
import { handleVideos } from './videos-handler.ts';
import { handleTestimonials } from './testimonials-handler.ts';
import { handleAdvisors } from './advisors-handler.ts';
import { handleContact } from './contact-handler.ts';
import { handleSell } from './sell-handler.ts';
import { handleVacationRentals } from './vacation-rentals-handler.ts';
import { handleCuratedListings } from './curated-listings-handler.ts';
import { handleFavorites } from './favorites-handler.ts';
import { handleHomepage } from './homepage-handler.ts';
import { getSearchTagsHandler } from './search-tags-handler.ts';
import { handleLocations } from './locations-handler.ts';
import { handlePropertyTypes } from './property-types-handler.ts';
import { handleLegal } from './legal-handler.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// ============================================================================
// CONFIGURACIÓN DE RUTAS Y TIPOS DE CONTENIDO
// ============================================================================
const CONTENT_ROUTES = {
  // ESPAÑOL
  'articulos': {
    type: 'articles',
    handler: handleArticles
  },
  'videos': {
    type: 'videos',
    handler: handleVideos
  },
  'testimonios': {
    type: 'testimonials',
    handler: handleTestimonials
  },
  'asesores': {
    type: 'advisors',
    handler: handleAdvisors
  },
  'contacto': {
    type: 'contact',
    handler: handleContact
  },
  'vender': {
    type: 'sell',
    handler: handleSell
  },
  'rentas-vacacionales': {
    type: 'vacation-rentals',
    handler: handleVacationRentals
  },
  'planes-rentas-vacacionales': {
    type: 'vacation-rentals-plans',
    handler: handleVacationRentals
  },
  'listados-de': {
    type: 'curated-listings',
    handler: handleCuratedListings
  },
  'favoritos': {
    type: 'favorites',
    handler: handleFavorites
  },
  'ubicaciones': {
    type: 'locations',
    handler: handleLocations
  },
  'propiedades': {
    type: 'property-types',
    handler: handlePropertyTypes
  },
  'terminos-y-condiciones': {
    type: 'legal-terms',
    handler: (params: any) => handleLegal({ ...params, legalType: 'terms' })
  },
  'politicas-de-privacidad': {
    type: 'legal-privacy',
    handler: (params: any) => handleLegal({ ...params, legalType: 'privacy' })
  },
  // INGLÉS
  'articles': {
    type: 'articles',
    handler: handleArticles
  },
  'testimonials': {
    type: 'testimonials',
    handler: handleTestimonials
  },
  'advisors': {
    type: 'advisors',
    handler: handleAdvisors
  },
  'contact': {
    type: 'contact',
    handler: handleContact
  },
  'sell': {
    type: 'sell',
    handler: handleSell
  },
  'vacation-rentals': {
    type: 'vacation-rentals',
    handler: handleVacationRentals
  },
  'vacation-rental-plans': {
    type: 'vacation-rentals-plans',
    handler: handleVacationRentals
  },
  'listings-of': {
    type: 'curated-listings',
    handler: handleCuratedListings
  },
  'favorites': {
    type: 'favorites',
    handler: handleFavorites
  },
  'locations': {
    type: 'locations',
    handler: handleLocations
  },
  'property-types': {
    type: 'property-types',
    handler: handlePropertyTypes
  },
  'terms-and-conditions': {
    type: 'legal-terms',
    handler: (params: any) => handleLegal({ ...params, legalType: 'terms' })
  },
  'privacy-policy': {
    type: 'legal-privacy',
    handler: (params: any) => handleLegal({ ...params, legalType: 'privacy' })
  },
  // FRANCÉS
  'temoignages': {
    type: 'testimonials',
    handler: handleTestimonials
  },
  'conseillers': {
    type: 'advisors',
    handler: handleAdvisors
  },
  'vendre': {
    type: 'sell',
    handler: handleSell
  },
  'locations-vacances': {
    type: 'vacation-rentals',
    handler: handleVacationRentals
  },
  'plans-locations-vacances': {
    type: 'vacation-rentals-plans',
    handler: handleVacationRentals
  },
  'listes-de': {
    type: 'curated-listings',
    handler: handleCuratedListings
  },
  'favoris': {
    type: 'favorites',
    handler: handleFavorites
  },
  'emplacements': {
    type: 'locations',
    handler: handleLocations
  },
  'types-de-proprietes': {
    type: 'property-types',
    handler: handlePropertyTypes
  },
  'termes-et-conditions': {
    type: 'legal-terms',
    handler: (params: any) => handleLegal({ ...params, legalType: 'terms' })
  },
  'politique-de-confidentialite': {
    type: 'legal-privacy',
    handler: (params: any) => handleLegal({ ...params, legalType: 'privacy' })
  }
};
// ============================================================================
// FUNCIONES SEO AVANZADAS
// ============================================================================
function getCountryDomainMap() {
  return {
    'DOM': 'https://clicinmobiliaria.com',
    'PAN': 'https://pa.clicinmobiliaria.com',
    'MEX': 'https://mx.clicinmobiliaria.com'
  };
}
function getCountryData(countryCode) {
  const countries = {
    'DOM': {
      name: 'República Dominicana',
      code: 'DO',
      currency: 'DOP',
      cities: [
        'Santo Domingo',
        'Punta Cana',
        'Santiago'
      ],
      keywords: [
        'República Dominicana',
        'bienes raíces RD',
        'propiedades Santo Domingo',
        'inversión Punta Cana'
      ]
    },
    'PAN': {
      name: 'Panamá',
      code: 'PA',
      currency: 'USD',
      cities: [
        'Ciudad de Panamá',
        'Coronado',
        'Bocas del Toro'
      ],
      keywords: [
        'Panamá',
        'bienes raíces Panamá',
        'propiedades Ciudad de Panamá',
        'inversión Canal Panamá'
      ]
    },
    'MEX': {
      name: 'México',
      code: 'MX',
      currency: 'MXN',
      cities: [
        'Ciudad de México',
        'Playa del Carmen',
        'Puerto Vallarta'
      ],
      keywords: [
        'México',
        'bienes raíces México',
        'propiedades CDMX',
        'inversión Riviera Maya'
      ]
    }
  };
  return countries[countryCode] || countries['DOM'];
}
function getRouteTranslations() {
  return {
    // Español -> otros idiomas
    'articulos': {
      en: 'articles',
      fr: 'articles'
    },
    'videos': {
      en: 'videos',
      fr: 'videos'
    },
    'testimonios': {
      en: 'testimonials',
      fr: 'temoignages'
    },
    'asesores': {
      en: 'advisors',
      fr: 'conseillers'
    },
    'contacto': {
      en: 'contact',
      fr: 'contact'
    },
    'vender': {
      en: 'sell',
      fr: 'vendre'
    },
    'rentas-vacacionales': {
      en: 'vacation-rentals',
      fr: 'locations-vacances'
    },
    'planes-rentas-vacacionales': {
      en: 'vacation-rental-plans',
      fr: 'plans-locations-vacances'
    },
    'listados-de': {
      en: 'listings-of',
      fr: 'listes-de'
    },
    'favoritos': {
      en: 'favorites',
      fr: 'favoris'
    }
  };
}
function buildHreflangUrls(contentSegments, language, trackingString, globalConfig, domainInfo) {
  const languages = [
    'es',
    'en',
    'fr'
  ];
  const routeTranslations = getRouteTranslations();
  // Detectar si estamos en desarrollo local
  const isLocalhost = domainInfo?.realHost?.includes('localhost') || domainInfo?.realHost?.includes('127.0.0.1');
  // Usar domainInfo.realDomain en vez de getCountryDomainMap()
  let baseDomain = '';
  if (!isLocalhost) {
    baseDomain = domainInfo?.realDomain || 'https://clicinmobiliaria.com';
    if (baseDomain.endsWith('/')) {
      baseDomain = baseDomain.slice(0, -1);
    }
  }
  const hreflangObject = {};
  // IMPORTANTE: Crear mapa inverso de traducciones
  const reverseTranslations = {};
  Object.entries(routeTranslations).forEach(([esRoute, translations])=>{
    // Mapear inglés -> español
    if (translations.en) {
      reverseTranslations[translations.en] = esRoute;
    }
    // Mapear francés -> español
    if (translations.fr) {
      reverseTranslations[translations.fr] = esRoute;
    }
  });
  languages.forEach((targetLang)=>{
    let translatedSegments = [];
    if (contentSegments.length > 0) {
      contentSegments.forEach((segment)=>{
        if (targetLang === 'es') {
          // Para español, necesitamos traducir de vuelta si estamos en EN o FR
          if (language === 'en' || language === 'fr') {
            // Buscar traducción inversa
            const originalSpanishRoute = reverseTranslations[segment];
            translatedSegments.push(originalSpanishRoute || segment);
          } else {
            // Ya estamos en español, mantener original
            translatedSegments.push(segment);
          }
        } else {
          // Para otros idiomas, traducir desde español
          let segmentToTranslate = segment;
          // Si el idioma actual no es español, primero obtener la versión en español
          if (language !== 'es') {
            segmentToTranslate = reverseTranslations[segment] || segment;
          }
          // Ahora traducir al idioma target
          const translation = routeTranslations[segmentToTranslate];
          if (translation && translation[targetLang]) {
            translatedSegments.push(translation[targetLang]);
          } else {
            // Si no hay traducción, usar el segmento en español
            translatedSegments.push(segmentToTranslate);
          }
        }
      });
    }
    let path = translatedSegments.join('/');
    // Agregar prefijo de idioma si no es español
    if (targetLang !== 'es' && path) {
      path = targetLang + '/' + path;
    } else if (targetLang !== 'es' && !path) {
      // Para homepage en otros idiomas
      path = targetLang;
    }
    const finalPath = path ? '/' + path : '/';
    // Si es localhost, usar URL relativa; si no, usar absoluta con dominio correcto
    const finalUrl = baseDomain + finalPath + trackingString;
    hreflangObject[targetLang] = finalUrl;
  });
  return hreflangObject;
}
function buildOrganizationSchema(globalConfig) {
  const countryCode = globalConfig?.country || 'DOM';
  const countryData = getCountryData(countryCode);
  const domainMap = getCountryDomainMap();
  return {
    '@type': 'Organization',
    'name': globalConfig?.legal?.company_name || 'CLIC Inmobiliaria',
    'legalName': globalConfig?.legal?.company_full_name || 'CLIC DOM SRL',
    'url': domainMap[countryCode],
    'logo': {
      '@type': 'ImageObject',
      'url': globalConfig?.legal?.logo_url
    },
    'contactPoint': {
      '@type': 'ContactPoint',
      'telephone': globalConfig?.contact?.phone,
      'contactType': 'customer service',
      'email': globalConfig?.contact?.email
    },
    'address': {
      '@type': 'PostalAddress',
      'streetAddress': globalConfig?.contact?.address,
      'addressLocality': countryData.cities[0],
      'addressCountry': countryData.code
    },
    'sameAs': [
      globalConfig?.social?.company?.youtube,
      globalConfig?.social?.company?.facebook,
      globalConfig?.social?.company?.instagram_url,
      globalConfig?.social?.company?.linkedin,
      globalConfig?.social?.company?.tiktok_url
    ].filter(Boolean),
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': globalConfig?.seo?.company_rating?.replace('/5', '') || '4.9',
      'reviewCount': '500+'
    },
    'areaServed': {
      '@type': 'Country',
      'name': countryData.name
    }
  };
}
function generateArticlesSchema(contentResult, globalConfig) {
  if (contentResult.pageType === 'articles-single') {
    const article = contentResult.article;
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      'headline': article.title,
      'description': article.excerpt,
      'image': article.featuredImage,
      'datePublished': article.publishedAt,
      'author': {
        '@type': 'Person',
        'name': article.author.name
      },
      'publisher': buildOrganizationSchema(globalConfig)
    };
  } else {
    return {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'name': contentResult.seo.title,
      'description': contentResult.seo.description,
      'numberOfItems': (contentResult.featuredArticles?.length || 0) + (contentResult.recentArticles?.length || 0),
      'publisher': buildOrganizationSchema(globalConfig)
    };
  }
}
function generateVideosSchema(contentResult, globalConfig) {
  if (contentResult.pageType === 'videos-single') {
    const video = contentResult.video;
    return {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      'name': video.title,
      'description': video.description,
      'thumbnailUrl': video.thumbnail,
      'uploadDate': video.publishedAt,
      'publisher': buildOrganizationSchema(globalConfig)
    };
  } else {
    return {
      '@context': 'https://schema.org',
      '@type': 'VideoSeries',
      'name': contentResult.seo.title,
      'description': contentResult.seo.description,
      'publisher': buildOrganizationSchema(globalConfig)
    };
  }
}
function generateTestimonialsSchema(contentResult, globalConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    ...buildOrganizationSchema(globalConfig),
    'review': (contentResult.testimonials || []).slice(0, 5).map((testimonial)=>({
        '@type': 'Review',
        'reviewBody': testimonial.excerpt,
        'reviewRating': {
          '@type': 'Rating',
          'ratingValue': testimonial.rating || 5,
          'bestRating': 5
        },
        'author': {
          '@type': 'Person',
          'name': testimonial.client_name
        }
      }))
  };
}
function generateAdvisorsSchema(contentResult, globalConfig) {
  if (contentResult.pageType === 'advisors-single') {
    const advisor = contentResult.advisor;
    return {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgent',
      'name': advisor.name,
      'description': advisor.bio,
      'image': advisor.avatar,
      'worksFor': buildOrganizationSchema(globalConfig)
    };
  } else {
    return {
      '@context': 'https://schema.org',
      '@type': 'RealEstateAgency',
      'name': globalConfig?.legal?.company_name,
      'description': contentResult.seo.description,
      'employee': (contentResult.advisors || []).slice(0, 10).map((advisor)=>({
          '@type': 'RealEstateAgent',
          'name': advisor.name,
          'image': advisor.avatar
        }))
    };
  }
}
function generateContactSchema(contentResult, globalConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    'mainEntity': buildOrganizationSchema(globalConfig)
  };
}
function generateSellSchema(contentResult, globalConfig) {
  const countryData = getCountryData(globalConfig?.country || 'DOM');
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    'name': 'Servicio de Venta de Propiedades',
    'description': contentResult.seo.description,
    'provider': buildOrganizationSchema(globalConfig),
    'areaServed': {
      '@type': 'Country',
      'name': countryData.name
    }
  };
}
function generateHomepageSchema(contentResult, globalConfig) {
  const countryCode = globalConfig?.country || 'DOM';
  const domainMap = getCountryDomainMap();
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': globalConfig?.legal?.company_name,
    'description': contentResult.seo.description,
    'url': domainMap[countryCode],
    'publisher': buildOrganizationSchema(globalConfig),
    'potentialAction': {
      '@type': 'SearchAction',
      'target': domainMap[countryCode] + '/buscar?q={search_term_string}',
      'query-input': 'required name=search_term_string'
    }
  };
}
function generateCuratedListingsSchema(contentResult, globalConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SearchResultsPage',
    'name': contentResult.seo.title,
    'description': contentResult.seo.description,
    'provider': buildOrganizationSchema(globalConfig)
  };
}
function generateVacationRentalsSchema(contentResult, globalConfig) {
  const countryData = getCountryData(globalConfig?.country || 'DOM');
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    'name': contentResult.seo.title,
    'description': contentResult.seo.description,
    'containedInPlace': {
      '@type': 'Country',
      'name': countryData.name
    }
  };
}
function generateOpenGraph(seo, globalConfig, domainInfo) {
  const countryCode = globalConfig?.country || 'DOM';
  const domainMap = getCountryDomainMap();
  return {
    title: seo.title,
    description: seo.description,
    url: domainMap[countryCode] + (seo.canonical_url || ''),
    type: 'website',
    site_name: 'CLIC Inmobiliaria',
    locale: seo.language === 'en' ? 'en_US' : seo.language === 'fr' ? 'fr_FR' : 'es_DO',
    image: globalConfig?.legal?.logo_url
  };
}
function generateTwitterCard(seo, globalConfig) {
  return {
    card: 'summary_large_image',
    site: '@clic.do',
    creator: '@renecastillotv',
    title: seo.title,
    description: seo.description,
    image: globalConfig?.legal?.logo_url
  };
}
function generateSEOKeywords(contentResult, language, globalConfig) {
  const countryData = getCountryData(globalConfig?.country || 'DOM');
  let specificKeywords = [];
  switch(contentResult.contentType){
    case 'articles':
      specificKeywords = language === 'en' ? [
        'real estate articles',
        'property insights'
      ] : language === 'fr' ? [
        'articles immobiliers',
        'conseils propriété'
      ] : [
        'artículos inmobiliarios',
        'consejos propiedades'
      ];
      break;
    case 'videos':
      specificKeywords = language === 'en' ? [
        'real estate videos',
        'property tours'
      ] : language === 'fr' ? [
        'vidéos immobilières',
        'visites propriétés'
      ] : [
        'videos inmobiliarios',
        'tours propiedades'
      ];
      break;
    case 'testimonials':
      specificKeywords = language === 'en' ? [
        'client testimonials',
        'success stories'
      ] : language === 'fr' ? [
        'témoignages clients',
        'histoires succès'
      ] : [
        'testimonios clientes',
        'historias éxito'
      ];
      break;
    default:
      specificKeywords = [
        'inmobiliaria',
        'propiedades',
        'bienes raíces'
      ];
  }
  return [
    ...countryData.keywords,
    ...specificKeywords
  ].join(', ');
}
function generateAdditionalMetaTags(contentResult, globalConfig, language) {
  return {
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    author: 'René Castillo - CLIC Inmobiliaria',
    publisher: 'CLIC Inmobiliaria'
  };
}
function enrichSEO(contentResult, context) {
  const { globalConfig, language, contentSegments, trackingString, domainInfo } = context;
  if (!contentResult.seo) {
    return contentResult;
  }
  // Generar hreflang
  const hreflang = buildHreflangUrls(contentSegments, language, trackingString, globalConfig, domainInfo);
  // Generar structured data según el tipo de contenido
  let structured_data = null;
  try {
    switch(contentResult.contentType){
      case 'articles':
        structured_data = generateArticlesSchema(contentResult, globalConfig);
        break;
      case 'videos':
        structured_data = generateVideosSchema(contentResult, globalConfig);
        break;
      case 'testimonials':
        structured_data = generateTestimonialsSchema(contentResult, globalConfig);
        break;
      case 'advisors':
        structured_data = generateAdvisorsSchema(contentResult, globalConfig);
        break;
      case 'contact':
        structured_data = generateContactSchema(contentResult, globalConfig);
        break;
      case 'sell':
        structured_data = generateSellSchema(contentResult, globalConfig);
        break;
      case 'homepage':
        structured_data = generateHomepageSchema(contentResult, globalConfig);
        break;
      case 'curated-listings':
        structured_data = generateCuratedListingsSchema(contentResult, globalConfig);
        break;
      case 'vacation-rentals':
        structured_data = generateVacationRentalsSchema(contentResult, globalConfig);
        break;
      default:
        structured_data = {
          '@context': 'https://schema.org',
          '@type': 'WebPage',
          'name': contentResult.seo.title,
          'description': contentResult.seo.description
        };
    }
  } catch (error) {
    console.error('Error generating structured data:', error);
    structured_data = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'name': contentResult.seo.title,
      'description': contentResult.seo.description
    };
  }
  // Generar otros elementos SEO
  const open_graph = generateOpenGraph(contentResult.seo, globalConfig, domainInfo);
  const twitter_card = generateTwitterCard(contentResult.seo, globalConfig);
  const keywords = generateSEOKeywords(contentResult, language, globalConfig);
  const additional_meta_tags = generateAdditionalMetaTags(contentResult, globalConfig, language);
  // Enriquecer el SEO existente
  contentResult.seo = {
    ...contentResult.seo,
    hreflang: hreflang,
    structured_data: structured_data,
    open_graph: open_graph,
    twitter_card: twitter_card,
    keywords: keywords,
    additional_meta_tags: additional_meta_tags,
    meta_tags: {
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
      author: 'René Castillo - CLIC Inmobiliaria',
      publisher: 'CLIC Inmobiliaria'
    }
  };
  return contentResult;
}
// ============================================================================
// FUNCIONES AUXILIARES - MANTENIDAS IGUALES
// ============================================================================
function parseContentPath(pathAfterContentBackend) {
  try {
    console.log('parseContentPath input:', pathAfterContentBackend);
    if (!pathAfterContentBackend || typeof pathAfterContentBackend !== 'string') {
      return {
        language: 'es',
        contentSegments: [],
        fullPath: ''
      };
    }
    const cleanPath = pathAfterContentBackend.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
    const segments = cleanPath ? cleanPath.split('/').filter((segment)=>segment && segment.trim() !== '') : [];
    console.log('Path segments:', segments);
    let language = 'es';
    let contentSegments = [
      ...segments
    ];
    if (segments.length > 0) {
      const firstSegment = segments[0];
      if (firstSegment === 'en' || firstSegment === 'fr') {
        language = firstSegment;
        contentSegments = segments.slice(1);
      }
    }
    const result = {
      language,
      contentSegments,
      fullPath: pathAfterContentBackend
    };
    console.log('parseContentPath result:', result);
    return result;
  } catch (error) {
    console.error('Error in parseContentPath:', error);
    return {
      language: 'es',
      contentSegments: [],
      fullPath: pathAfterContentBackend || ''
    };
  }
}
function getContentRouteInfo(contentSegments, language) {
  try {
    if (!Array.isArray(contentSegments) || contentSegments.length === 0) {
      return null;
    }
    const firstSegment = contentSegments[0];
    if (!firstSegment || typeof firstSegment !== 'string') {
      return null;
    }
    const routeInfo = CONTENT_ROUTES[firstSegment];
    if (!routeInfo) {
      return null;
    }
    return {
      ...routeInfo,
      contentType: routeInfo.type,
      remainingSegments: contentSegments.slice(1),
      primarySegment: firstSegment
    };
  } catch (error) {
    console.error('Error in getContentRouteInfo:', error);
    return null;
  }
}
function processCountryConfig(config, language, trackingString) {
  if (!config) return null;
  try {
    const processedConfig = JSON.parse(JSON.stringify(config));
    if (processedConfig.features?.header?.sections) {
      Object.keys(processedConfig.features.header.sections).forEach((sectionKey)=>{
        const section = processedConfig.features.header.sections[sectionKey];
        if (section.urls && section.urls[language]) {
          section.currentUrl = section.urls[language] + trackingString;
        }
      });
    }
    if (processedConfig.footer_links) {
      if (processedConfig.footer_links.properties_by_zone) {
        processedConfig.footer_links.properties_by_zone = processedConfig.footer_links.properties_by_zone.map((item)=>({
            ...item,
            label: item.label?.[language] || item.label?.es || item.label,
            url: (item.urls?.[language] || item.urls?.es || '/') + trackingString
          }));
      }
      if (processedConfig.footer_links.services) {
        processedConfig.footer_links.services = processedConfig.footer_links.services.map((item)=>({
            ...item,
            label: item.label?.[language] || item.label?.es || item.label,
            url: (item.urls?.[language] || item.urls?.es || '/') + trackingString
          }));
      }
      if (processedConfig.footer_links.resources) {
        processedConfig.footer_links.resources = processedConfig.footer_links.resources.map((item)=>({
            ...item,
            label: item.label?.[language] || item.label?.es || item.label,
            url: (item.urls?.[language] || item.urls?.es || '/') + trackingString
          }));
      }
    }
    const translations = processedConfig.translations?.[language] || processedConfig.translations?.es || {};
    return {
      country: processedConfig.country || 'DO',
      language: language,
      contact: processedConfig.contact || {},
      social: processedConfig.social || {},
      legal: processedConfig.legal || {},
      team: processedConfig.team || {},
      features: processedConfig.features || {},
      hero: processedConfig.hero || {},
      footer_links: processedConfig.footer_links || {},
      office: processedConfig.office || {},
      seo: processedConfig.seo || {},
      translations: translations,
      certifications: processedConfig.certifications || []
    };
  } catch (error) {
    console.error('Error processing country config:', error);
    return null;
  }
}
async function getBaseContentData(supabase, domainInfo, language, trackingString) {
  try {
    const country = domainInfo?.country || {};
    const countryTag = country?.tags;
    let globalConfig = null;
    if (country && country.code) {
      console.log('Fetching country config for:', country.code);
      const { data: countryConfigData, error: configError } = await supabase.from('countries').select('config').eq('code', country.code).single();
      if (!configError && countryConfigData?.config) {
        console.log('Country config found, processing...');
        globalConfig = processCountryConfig(countryConfigData.config, language, trackingString);
        if (globalConfig) {
          globalConfig.country = country.code;
          globalConfig.language = language;
        }
        console.log('Country config processed successfully');
      } else {
        console.error('Error fetching country config:', configError);
        globalConfig = {
          country: country.code,
          language: language,
          contact: {},
          social: {},
          legal: {},
          team: {},
          features: {},
          footer_links: {},
          office: {},
          seo: {},
          translations: {}
        };
      }
    }
    let hotItems = {
      properties: [],
      cities: [],
      sectors: [],
      agents: [],
      projects: [],
      custom: []
    };
    if (countryTag?.id) {
      try {
        const { data: hotItemsResult } = await supabase.from('popular_items').select('*').eq('country_tag_id', countryTag.id).eq('active', true).order('priority');
        if (hotItemsResult && hotItemsResult.length > 0) {
          const processHotItemContent = (item)=>{
            let translatedContent = {
              title: item.title,
              subtitle: item.subtitle,
              url: item.url
            };
            if (language !== 'es') {
              const contentField = language === 'en' ? item.content_en : item.content_fr;
              if (contentField) {
                try {
                  const parsedContent = typeof contentField === 'string' ? JSON.parse(contentField) : contentField;
                  translatedContent = {
                    title: parsedContent.title || item.title,
                    subtitle: parsedContent.subtitle || item.subtitle,
                    url: parsedContent.url || item.url
                  };
                } catch (e) {
                  console.warn('Error parsing translated content:', e);
                }
              }
            }
            let processedUrl = translatedContent.url;
            if (processedUrl) {
              if (language === 'en') processedUrl = 'en/' + processedUrl;
              if (language === 'fr') processedUrl = 'fr/' + processedUrl;
              processedUrl = '/' + processedUrl + trackingString;
            }
            return {
              ...item,
              title: translatedContent.title,
              subtitle: translatedContent.subtitle,
              url: processedUrl,
              id: item.id || 'hot-' + item.category + '-' + Math.random()
            };
          };
          const processedHotItems = hotItemsResult.map(processHotItemContent);
          hotItems = {
            properties: processedHotItems.filter((item)=>item.category === 'categoria').slice(0, 6),
            cities: processedHotItems.filter((item)=>item.category === 'ciudad').slice(0, 10),
            sectors: processedHotItems.filter((item)=>item.category === 'sector').slice(0, 8),
            agents: processedHotItems.filter((item)=>item.category === 'asesor').slice(0, 5),
            projects: processedHotItems.filter((item)=>item.category === 'proyecto').slice(0, 4),
            custom: processedHotItems.filter((item)=>item.category === 'custom').slice(0, 3)
          };
        }
      } catch (error) {
        console.error('Error fetching hot items:', error);
      }
    }
    return {
      country,
      countryTag,
      globalConfig,
      hotItems,
      language,
      trackingString,
      domainInfo
    };
  } catch (error) {
    console.error('Error in getBaseContentData:', error);
    return {
      country: {},
      countryTag: null,
      globalConfig: null,
      hotItems: {
        properties: [],
        cities: [],
        sectors: [],
        agents: [],
        projects: [],
        custom: []
      },
      language,
      trackingString,
      domainInfo
    };
  }
}
// ============================================================================
// FUNCIÓN PRINCIPAL DE LA EDGE FUNCTION
// ============================================================================
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    console.log('🚀 Edge Function Called:', {
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestUrl = new URL(req.url);
    const queryParams = requestUrl.searchParams;
    console.log('📍 Request URL Analysis:', {
      pathname: requestUrl.pathname,
      hostname: requestUrl.hostname,
      search: requestUrl.search
    });
    const domainInfo = await detectCountryAndDomain(req, supabase);
    const trackingParams = new URLSearchParams();
    for (const [key, value] of queryParams.entries()){
      if (key.startsWith('utm_') || key === 'ref' || key.startsWith('fbclid') || key.startsWith('gclid')) {
        trackingParams.set(key, value);
      }
    }
    const trackingString = trackingParams.toString() ? '?' + trackingParams.toString() : '';
    const fullPath = requestUrl.pathname;
    let pathAfterContentBackend = '';
    console.log('Analyzing full path:', fullPath);
    if (fullPath === '/content-backend' || fullPath === '/content-backend/') {
      pathAfterContentBackend = '';
    } else if (fullPath.startsWith('/content-backend/')) {
      pathAfterContentBackend = fullPath.substring(17);
    } else {
      pathAfterContentBackend = fullPath.startsWith('/') ? fullPath.substring(1) : fullPath;
    }
    console.log('Path extraction result:', {
      fullPath,
      pathAfterContentBackend
    });
    const { language, contentSegments, fullPath: parsedPath } = parseContentPath(pathAfterContentBackend);
    console.log('🎯 Content Handler - Request details:', {
      originalUrl: req.url,
      fullPath: fullPath,
      pathAfterContentBackend: pathAfterContentBackend,
      language: language,
      contentSegments: contentSegments,
      parsedPath: parsedPath,
      method: req.method,
      hostname: requestUrl.hostname
    });
    const baseData = await getBaseContentData(supabase, domainInfo, language, trackingString);
    // ============================================================================
    // CASO ESPECIAL: HOMEPAGE CON SEARCH TAGS
    // ============================================================================
    if (!contentSegments || contentSegments.length === 0) {
      console.log('Processing homepage with content-backend structure');
      const handlerParams = {
        supabase,
        language,
        contentSegments: [],
        primarySegment: null,
        queryParams,
        trackingString,
        baseData,
        requestUrl,
        contentType: 'homepage',
        domainInfo  // Agregar domainInfo también para homepage
      };
      try {
        // Obtener contenido de homepage
        const contentResult = await handleHomepage(handlerParams);
        // ✅ OBTENER TAGS DE BÚSQUEDA PARA HOMEPAGE
        let searchTagsData = null;
        const countryTagForSearch = baseData.country?.tags || baseData.countryTag;
        if (countryTagForSearch && countryTagForSearch.id) {
          console.log('🔍 Fetching search tags for homepage...');
          try {
            const searchTagsResult = await getSearchTagsHandler({
              supabase,
              countryTag: countryTagForSearch,
              validatedTags: [],
              language,
              pathToAnalyze: '',
              trackingString
            });
            if (searchTagsResult.success) {
              searchTagsData = searchTagsResult.data;
              console.log('✅ Search tags loaded successfully for homepage:', {
                hasLocationTags: searchTagsData?.tags?.provincia?.length > 0,
                hasPriceRanges: Object.keys(searchTagsData?.tags?.precio?.sale || {}).length > 0,
                currencies: searchTagsData?.currencies
              });
            } else {
              console.warn('⚠️ Search tags handler returned unsuccessful:', searchTagsResult.error);
            }
          } catch (error) {
            console.error('❌ Error loading search tags for homepage:', error);
          // Continue sin tags - el frontend puede manejar null
          }
        } else {
          console.warn('⚠️ No valid countryTag for search-tags-handler');
        }
        // Enriquecer SEO
        const enrichedResult = enrichSEO(contentResult, {
          globalConfig: baseData.globalConfig,
          language,
          contentSegments: [],
          trackingString,
          domainInfo
        });
        // ✅ AGREGAR searchTags A LA RESPUESTA
        const response = {
          ...baseData,
          ...enrichedResult,
          contentType: 'homepage',
          language,
          searchTags: searchTagsData,
          requestInfo: {
            originalPath: fullPath,
            parsedSegments: contentSegments,
            handlerUsed: 'homepage',
            modularHandler: true,
            seoEnhanced: true,
            hasSearchTags: searchTagsData !== null // ← Info adicional
          }
        };
        console.log('Homepage response prepared with enhanced SEO and search tags:', {
          sectionsCount: enrichedResult.sections?.length || 0,
          hasGlobalConfig: !!baseData.globalConfig,
          hasHotItems: Object.keys(baseData.hotItems).some((key)=>baseData.hotItems[key].length > 0),
          hasStructuredData: !!enrichedResult.seo?.structured_data,
          hasHreflang: !!enrichedResult.seo?.hreflang,
          hasSearchTags: searchTagsData !== null,
          searchTagsSummary: searchTagsData ? {
            provincias: searchTagsData.tags?.provincia?.length || 0,
            ciudades: searchTagsData.tags?.ciudad?.length || 0,
            sectores: searchTagsData.tags?.sector?.length || 0,
            currencies: searchTagsData.currencies?.available || []
          } : 'none'
        });
        return new Response(JSON.stringify(response), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });
      } catch (error) {
        console.error('Error in homepage handler:', error);
        const fallbackResponse = {
          ...baseData,
          pageType: 'homepage',
          type: 'homepage',
          contentType: 'homepage',
          language,
          sections: [],
          searchFilters: {},
          quickStats: {},
          searchTags: null,
          seo: {
            title: 'CLIC Inmobiliaria - La Inmobiliaria del Contenido',
            description: 'René Castillo y CLIC Inmobiliaria, líderes en bienes raíces en República Dominicana',
            canonical_url: language === 'es' ? '/' : '/' + language + '/'
          },
          requestInfo: {
            originalPath: fullPath,
            parsedSegments: contentSegments,
            handlerUsed: 'homepage-fallback',
            error: error.message
          }
        };
        return new Response(JSON.stringify(fallbackResponse), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
          status: 200
        });
      }
    }
    // ============================================================================
    // RESTO DE RUTAS (sin cambios)
    // ============================================================================
    const routeInfo = getContentRouteInfo(contentSegments, language);
    if (!routeInfo) {
      console.log('No route handler found for segments:', contentSegments);
      return new Response(JSON.stringify({
        error: 'Content type not found',
        requestedPath: parsedPath,
        availableRoutes: Object.keys(CONTENT_ROUTES),
        language,
        contentSegments
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 404
      });
    }
    console.log('Using modular handler:', routeInfo.contentType);
    const handlerParams = {
      supabase,
      language,
      contentSegments: routeInfo.remainingSegments,
      primarySegment: routeInfo.primarySegment,
      queryParams,
      trackingString,
      baseData,
      requestUrl,
      contentType: routeInfo.contentType,
      domainInfo  // Agregar domainInfo para que handlers puedan construir hreflang
    };
    const contentResult = await routeInfo.handler(handlerParams);
    const enrichedContentResult = enrichSEO(contentResult, {
      globalConfig: baseData.globalConfig,
      language,
      contentSegments,
      trackingString,
      domainInfo
    });
    const response = {
      ...baseData,
      ...enrichedContentResult,
      contentType: routeInfo.contentType,
      language,
      trackingString,  // Agregar trackingString para que layouts puedan usarlo
      requestInfo: {
        originalPath: fullPath,
        parsedSegments: contentSegments,
        handlerUsed: routeInfo.contentType,
        modularHandler: true,
        seoEnhanced: true
      }
    };
    console.log('Content response prepared with enhanced SEO:', {
      contentType: routeInfo.contentType,
      pageType: enrichedContentResult.pageType,
      language,
      hasGlobalConfig: !!baseData.globalConfig,
      hasHotItems: Object.keys(baseData.hotItems).some((key)=>baseData.hotItems[key].length > 0),
      hasStructuredData: !!enrichedContentResult.seo?.structured_data,
      hasHreflang: !!enrichedContentResult.seo?.hreflang,
      hasOpenGraph: !!enrichedContentResult.seo?.open_graph,
      hasTwitterCard: !!enrichedContentResult.seo?.twitter_card,
      handlerModule: routeInfo.contentType + '-handler.ts'
    });
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error in enhanced modular content handler:', error);
    return new Response(JSON.stringify({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      system: 'enhanced-modular-content-backend'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
