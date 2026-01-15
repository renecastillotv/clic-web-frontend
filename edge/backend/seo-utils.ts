// seo-utils.ts
// Funciones utilitarias para SEO y structured data
export function calculatePropertyAggregations(properties) {
  if (!properties || properties.length === 0) {
    return {
      totalProperties: 0,
      priceRange: {
        min: 0,
        max: 0
      },
      averagePrice: 0,
      bedroomRange: {
        min: 0,
        max: 0
      },
      primaryCurrency: 'USD',
      projectPercentage: 0,
      bedroomDistribution: {}
    };
  }
  const prices = properties.map((p)=>p.sale_price || p.rental_price).filter(Boolean).map(Number);
  const bedrooms = properties.map((p)=>p.bedrooms).filter(Boolean).map(Number);
  const currencies = properties.map((p)=>p.sale_currency || p.rental_currency).filter(Boolean);
  const projects = properties.filter((p)=>p.is_project);
  const bedroomDistribution = bedrooms.reduce((acc, bedroom)=>{
    acc[bedroom] = (acc[bedroom] || 0) + 1;
    return acc;
  }, {});
  return {
    totalProperties: properties.length,
    priceRange: {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0
    },
    averagePrice: prices.length > 0 ? Math.round(prices.reduce((a, b)=>a + b, 0) / prices.length) : 0,
    bedroomRange: {
      min: bedrooms.length > 0 ? Math.min(...bedrooms) : 0,
      max: bedrooms.length > 0 ? Math.max(...bedrooms) : 0
    },
    primaryCurrency: currencies.length > 0 ? currencies[0] : 'USD',
    projectPercentage: properties.length > 0 ? Math.round(projects.length / properties.length * 100) : 0,
    bedroomDistribution
  };
}
export function generateAdvancedStructuredData({ properties, breadcrumbs, relatedContent, pagination, propertyAggregations, tags, seoContent, language, canonicalUrl, hreflangUrls }) {
  const structuredDataArray = [];
  // 1. Organization Schema - CLIC Inmobiliaria con URLs correctas
  structuredDataArray.push({
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "name": "CLIC Inmobiliaria",
    "alternateName": "CLIC DOM SRL",
    "description": language === 'en' ? "Premier real estate agency in Dominican Republic specializing in luxury properties, investments, and rentals." : language === 'fr' ? "Agence immobilière de premier plan en République Dominicaine spécialisée dans les propriétés de luxe, les investissements et les locations." : "Inmobiliaria líder en República Dominicana especializada en propiedades de lujo, inversiones y alquileres.",
    "url": "https://clicinmobiliaria.com",
    "logo": "https://clicinmobiliaria.com/images/logo-clic-inmobiliaria.png",
    "image": "https://clicinmobiliaria.com/images/clic-team.jpg",
    "telephone": "+1-809-487-2542",
    "email": "info@clicinmobiliaria.com",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "Calle Erik Leonard Ekman No. 34, Edificio The Box Working Space",
      "addressLocality": "Santo Domingo",
      "addressRegion": "Distrito Nacional",
      "postalCode": "10108",
      "addressCountry": "DO"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 18.4861,
      "longitude": -69.9312
    },
    "sameAs": [
      "https://www.youtube.com/@clicinmobiliaria",
      "https://www.instagram.com/clic.do",
      "https://www.instagram.com/renecastillotv",
      "https://www.facebook.com/ClicInmobiliaria",
      "https://www.facebook.com/renecastillotv",
      "https://www.linkedin.com/company/clic-inmobiliaria",
      "https://www.tiktok.com/@clic.do",
      "https://www.tiktok.com/@renecastillo.tv"
    ],
    "founder": {
      "@type": "Person",
      "name": "René Castillo",
      "url": "https://clicinmobiliaria.com/rene-castillo",
      "sameAs": [
        "https://www.instagram.com/renecastillotv",
        "https://www.facebook.com/renecastillotv",
        "https://www.tiktok.com/@renecastillo.tv"
      ],
      "jobTitle": "CEO & Founder",
      "description": language === 'en' ? "Real estate expert and social media influencer with 600K+ followers, specializing in Dominican Republic property investments. 6 years of experience in real estate." : language === 'fr' ? "Expert immobilier et influenceur sur les réseaux sociaux avec plus de 600K abonnés, spécialisé dans les investissements immobiliers en République Dominicaine. 6 ans d'expérience dans l'immobilier." : "Experto inmobiliario e influencer con más de 600K seguidores, especializado en inversiones inmobiliarias en República Dominicana. 6 años de experiencia en bienes raíces."
    },
    "foundingDate": "2022",
    "legalName": "CLIC DOM SRL",
    "taxID": "132-68990-9",
    "priceRange": `${propertyAggregations.priceRange.min.toLocaleString()} - ${propertyAggregations.priceRange.max.toLocaleString()}`,
    "currenciesAccepted": "USD, DOP, EUR",
    "paymentAccepted": "Cash, Credit Card, Bank Transfer, Financing",
    "areaServed": {
      "@type": "Country",
      "name": "Dominican Republic"
    },
    "openingHours": [
      "Mo-Fr 09:00-18:00",
      "Sa 09:00-15:00"
    ],
    "contactPoint": [
      {
        "@type": "ContactPoint",
        "telephone": "+1-809-487-2542",
        "contactType": "sales",
        "areaServed": "DO",
        "availableLanguage": [
          "Spanish",
          "English",
          "French"
        ]
      },
      {
        "@type": "ContactPoint",
        "telephone": "+1-829-514-8080",
        "contactType": "customer service",
        "contactOption": [
          "TollFree",
          "WhatsApp"
        ],
        "areaServed": "DO",
        "availableLanguage": [
          "Spanish",
          "English",
          "French"
        ]
      }
    ]
  });
  // 2. ItemList Schema - Property Listings
  if (properties && properties.length > 0) {
    structuredDataArray.push({
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `Properties for Sale in Dominican Republic`,
      "description": `${propertyAggregations.totalProperties} properties available from ${propertyAggregations.priceRange.min.toLocaleString()} to ${propertyAggregations.priceRange.max.toLocaleString()}`,
      "numberOfItems": propertyAggregations.totalProperties,
      "url": canonicalUrl,
      "itemListElement": properties.slice(0, 20).map((property, index)=>({
          "@type": "RealEstateListing",
          "position": index + 1,
          "name": property.name,
          "description": property.description || `${property.bedrooms} bedroom ${property.category} in ${property.city || property.sector}`,
          "url": `https://clicinmobiliaria.com${property.url}`,
          "image": property.main_image_url,
          "offers": {
            "@type": "Offer",
            "price": property.sale_price || property.rental_price,
            "priceCurrency": property.sale_currency || property.rental_currency || "USD",
            "availability": "https://schema.org/InStock",
            "seller": {
              "@type": "RealEstateAgent",
              "name": "CLIC Inmobiliaria",
              "legalName": "CLIC DOM SRL"
            }
          },
          "address": {
            "@type": "PostalAddress",
            "addressLocality": property.city,
            "addressRegion": property.sector,
            "addressCountry": "DO"
          },
          "numberOfRooms": property.bedrooms,
          "numberOfBathroomsTotal": property.bathrooms,
          "floorSize": {
            "@type": "QuantitativeValue",
            "value": property.built_area,
            "unitCode": "MTK"
          },
          "category": property.category
        }))
    });
  }
  // 3. BreadcrumbList Schema
  if (breadcrumbs && breadcrumbs.length > 0) {
    structuredDataArray.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": breadcrumbs.map((crumb, index)=>({
          "@type": "ListItem",
          "position": index + 1,
          "name": crumb.name,
          "item": `https://clicinmobiliaria.com${crumb.url}`
        }))
    });
  }
  // 4. FAQPage Schema
  const faqs = relatedContent.filter((item)=>item.content_type === 'faq');
  if (faqs && faqs.length > 0) {
    structuredDataArray.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map((faq)=>({
          "@type": "Question",
          "name": faq.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": faq.answer
          }
        }))
    });
  }
  // 5. LocalBusiness/Service Area Schema
  const locationTags = tags?.filter((tag)=>[
      'ciudad',
      'sector'
    ].includes(tag.category));
  if (locationTags && locationTags.length > 0) {
    structuredDataArray.push({
      "@context": "https://schema.org",
      "@type": "Service",
      "serviceType": "Real Estate Services",
      "provider": {
        "@type": "RealEstateAgent",
        "name": "CLIC Inmobiliaria",
        "legalName": "CLIC DOM SRL"
      },
      "areaServed": locationTags.map((tag)=>({
          "@type": "City",
          "name": tag.display_name || tag.name,
          "containedInPlace": {
            "@type": "Country",
            "name": "Dominican Republic"
          }
        })),
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Property Listings",
        "itemListElement": [
          {
            "@type": "Offer",
            "itemOffered": {
              "@type": "Product",
              "name": "Real Estate Properties",
              "category": "Real Estate"
            },
            "priceSpecification": {
              "@type": "PriceSpecification",
              "minPrice": propertyAggregations.priceRange.min,
              "maxPrice": propertyAggregations.priceRange.max,
              "priceCurrency": propertyAggregations.primaryCurrency
            }
          }
        ]
      }
    });
  }
  // 6. WebPage Schema with rich data
  structuredDataArray.push({
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${propertyAggregations.totalProperties} Properties Available - CLIC Inmobiliaria`,
    "description": `Find ${propertyAggregations.totalProperties} properties in Dominican Republic from ${propertyAggregations.priceRange.min.toLocaleString()}.`,
    "url": canonicalUrl,
    "inLanguage": language,
    "isPartOf": {
      "@type": "WebSite",
      "name": "CLIC Inmobiliaria",
      "url": "https://clicinmobiliaria.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://clicinmobiliaria.com/buscar?q={search_term_string}",
        "query-input": "required name=search_term_string"
      }
    },
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": propertyAggregations.totalProperties
    },
    "relatedLink": Object.values(hreflangUrls),
    "significantLink": [
      "https://www.youtube.com/@clicinmobiliaria",
      "https://www.instagram.com/clic.do",
      "https://www.instagram.com/renecastillotv",
      "https://www.tiktok.com/@clic.do",
      "https://www.tiktok.com/@renecastillo.tv"
    ]
  });
  return structuredDataArray;
}
// NUEVA FUNCIÓN: Generar meta tags para Twitter Cards
export function generateTwitterCardMeta({ title, description, image, language, propertyAggregations }) {
  // Ajustar descripción para Twitter (máximo 200 caracteres)
  let twitterDescription = description;
  if (twitterDescription && twitterDescription.length > 200) {
    twitterDescription = twitterDescription.substring(0, 197) + '...';
  }
  // Ajustar título para Twitter (máximo 70 caracteres)
  let twitterTitle = title;
  if (twitterTitle && twitterTitle.length > 70) {
    twitterTitle = twitterTitle.substring(0, 67) + '...';
  }
  return {
    card: 'summary_large_image',
    site: '@clic.do',
    creator: '@renecastillotv',
    title: twitterTitle,
    description: twitterDescription,
    image: image || 'https://clicinmobiliaria.com/images/og-default.jpg',
    imageAlt: language === 'en' ? `${propertyAggregations.totalProperties} properties available in Dominican Republic` : language === 'fr' ? `${propertyAggregations.totalProperties} propriétés disponibles en République Dominicaine` : `${propertyAggregations.totalProperties} propiedades disponibles en República Dominicana`
  };
}
// NUEVA FUNCIÓN: Generar keywords SEO basadas en contexto
export function generateSEOKeywords({ tags, language, propertyAggregations }) {
  const keywords = [];
  // Keywords base según idioma
  const baseKeywords = {
    es: [
      'bienes raices',
      'inmobiliaria',
      'propiedades',
      'república dominicana',
      'santo domingo',
      'punta cana'
    ],
    en: [
      'real estate',
      'properties',
      'dominican republic',
      'santo domingo',
      'punta cana',
      'luxury properties'
    ],
    fr: [
      'immobilier',
      'propriétés',
      'république dominicaine',
      'saint domingue',
      'punta cana',
      'propriétés de luxe'
    ]
  };
  keywords.push(...baseKeywords[language] || baseKeywords.es);
  // Agregar keywords basadas en tags
  if (tags && tags.length > 0) {
    tags.forEach((tag)=>{
      if (tag.display_name) {
        keywords.push(tag.display_name.toLowerCase());
      }
      if (tag.name) {
        keywords.push(tag.name.toLowerCase());
      }
    });
  }
  // Agregar keywords de tipos de propiedad si hay datos
  if (propertyAggregations.totalProperties > 0) {
    if (language === 'es') {
      keywords.push('venta', 'alquiler', 'apartamentos', 'casas', 'villas');
    } else if (language === 'en') {
      keywords.push('for sale', 'for rent', 'apartments', 'houses', 'villas');
    } else if (language === 'fr') {
      keywords.push('à vendre', 'à louer', 'appartements', 'maisons', 'villas');
    }
  }
  // Agregar René Castillo como keyword (autoridad)
  keywords.push('rené castillo', 'clic inmobiliaria');
  // Eliminar duplicados y limitar a 15 keywords
  return [
    ...new Set(keywords)
  ].slice(0, 15).join(', ');
}
// NUEVA FUNCIÓN: Generar meta tags adicionales
export function generateAdditionalMetaTags({ language, propertyAggregations, canonicalUrl }) {
  return {
    // Geo tags para búsquedas locales
    geoRegion: 'DO',
    geoPlacename: 'Santo Domingo',
    geoPosition: '18.4861;-69.9312',
    ICBM: '18.4861, -69.9312',
    // Verificación de dominios (deberías agregar tus códigos reales)
    googleSiteVerification: '',
    msnValidate: '',
    yandexVerification: '',
    pinterestVerification: '',
    // Meta tags adicionales
    rating: 'General',
    distribution: 'Global',
    revisitAfter: '7 days',
    expires: 'never',
    // Información de precio para búsquedas
    priceRange: propertyAggregations.priceRange.min > 0 ? `${propertyAggregations.priceRange.min}-${propertyAggregations.priceRange.max}` : null,
    // Mobile meta tags
    mobileWebAppCapable: 'yes',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: 'black-translucent',
    formatDetection: 'telephone=no',
    // Información del negocio
    businessContactEmail: 'info@clicinmobiliaria.com',
    businessContactTelephone: '+18094872542',
    businessContactWhatsapp: '+18295148080'
  };
}
export function buildEnhancedDescription({ baseDescription, propertyAggregations, marketInsights, language }) {
  let enhanced = baseDescription;
  // Add market statistics if available
  if (propertyAggregations.totalProperties > 0) {
    const priceInfo = language === 'en' ? `Prices from ${propertyAggregations.priceRange.min.toLocaleString()} to ${propertyAggregations.priceRange.max.toLocaleString()}.` : language === 'fr' ? `Prix de ${propertyAggregations.priceRange.min.toLocaleString()} à ${propertyAggregations.priceRange.max.toLocaleString()}.` : `Precios desde ${propertyAggregations.priceRange.min.toLocaleString()} hasta ${propertyAggregations.priceRange.max.toLocaleString()}.`;
    enhanced += ` ${priceInfo}`;
  }
  // Add bedroom range info
  if (propertyAggregations.bedroomRange.max > 0) {
    const bedroomInfo = language === 'en' ? ` Available: ${propertyAggregations.bedroomRange.min}-${propertyAggregations.bedroomRange.max} bedrooms.` : language === 'fr' ? ` Disponible: ${propertyAggregations.bedroomRange.min}-${propertyAggregations.bedroomRange.max} chambres.` : ` Disponibles: ${propertyAggregations.bedroomRange.min}-${propertyAggregations.bedroomRange.max} habitaciones.`;
    enhanced += bedroomInfo;
  }
  // Add market insight highlight
  if (marketInsights && marketInsights.length > 0) {
    const topInsight = marketInsights[0];
    if (topInsight.market_growth) {
      enhanced += ` ${topInsight.market_growth}`;
    } else if (topInsight.tourism_boost) {
      enhanced += ` ${topInsight.tourism_boost}`;
    }
  }
  // Add YouTube authority with correct follower count
  const authorityNote = language === 'en' ? ' Expert advice from René Castillo (600K+ social media followers).' : language === 'fr' ? ' Conseils d\'expert de René Castillo (600K+ abonnés sur les réseaux sociaux).' : ' Asesoría experta de René Castillo (600K+ seguidores en redes sociales).';
  enhanced += authorityNote;
  return enhanced;
}
export function extractLocationFromTags(userTagsDetails) {
  if (!userTagsDetails) return null;
  const sectorTag = userTagsDetails.find((tag)=>tag.category === 'sector');
  if (sectorTag) return sectorTag.display_name || sectorTag.name;
  const cityTag = userTagsDetails.find((tag)=>tag.category === 'ciudad');
  if (cityTag) return cityTag.display_name || cityTag.name;
  return null;
}
