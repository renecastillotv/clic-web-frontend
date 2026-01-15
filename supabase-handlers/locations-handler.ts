// supabase/functions/content-backend/handlers/locations-handler.ts
// Handler para /ubicaciones, /en/locations, /fr/emplacements

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface LocationsResponse {
  pageType: string;
  language: string;
  seo: any;
  locations: {
    countries: any[];
    cities: any[];
    sectors: any[];
  };
  stats: {
    totalCities: number;
    totalSectors: number;
    totalProperties: number;
  };
  featuredLocations: any[];
  popularSearches: any[];
  globalConfig: any;
  country: any;
  trackingString: string;
}

export async function handleLocationsPage(
  language: string,
  supabaseClient: any,
  country: any,
  globalConfig: any
): Promise<LocationsResponse> {

  const translations: Record<string, any> = {
    es: {
      title: 'Ubicaciones Disponibles | CLIC',
      description: 'Explora todas las ciudades y sectores donde tenemos propiedades disponibles en República Dominicana',
      h1: 'Explora Ubicaciones',
      h2: 'Encuentra propiedades en las mejores zonas de República Dominicana',
      keywords: 'ubicaciones, ciudades, sectores, zonas, República Dominicana, Santo Domingo, Santiago, Punta Cana'
    },
    en: {
      title: 'Available Locations | CLIC',
      description: 'Explore all cities and sectors where we have available properties in Dominican Republic',
      h1: 'Explore Locations',
      h2: 'Find properties in the best areas of the Dominican Republic',
      keywords: 'locations, cities, sectors, areas, Dominican Republic, Santo Domingo, Santiago, Punta Cana'
    },
    fr: {
      title: 'Emplacements Disponibles | CLIC',
      description: 'Explorez toutes les villes et secteurs où nous avons des propriétés disponibles en République Dominicaine',
      h1: 'Explorer les Emplacements',
      h2: 'Trouvez des propriétés dans les meilleures zones de la République Dominicaine',
      keywords: 'emplacements, villes, secteurs, zones, République Dominicaine, Santo Domingo, Santiago, Punta Cana'
    }
  };

  const t = translations[language] || translations.es;

  // 1. Obtener ciudades con conteo de propiedades
  const { data: cities, error: citiesError } = await supabaseClient
    .from('properties')
    .select('city, city_slug')
    .not('city', 'is', null)
    .eq('status', 'active');

  // Agrupar por ciudad y contar
  const citiesMap = new Map();
  if (cities) {
    cities.forEach((prop: any) => {
      const cityName = prop.city;
      const citySlug = prop.city_slug || cityName.toLowerCase().replace(/\s+/g, '-');
      if (!citiesMap.has(cityName)) {
        citiesMap.set(cityName, { name: cityName, slug: citySlug, count: 0 });
      }
      citiesMap.get(cityName).count++;
    });
  }

  const citiesArray = Array.from(citiesMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)
    .map(city => ({
      name: city.name,
      slug: city.slug,
      count: city.count,
      image: `/images/cities/${city.slug}.jpg`
    }));

  // 2. Obtener sectores con conteo de propiedades
  const { data: sectors, error: sectorsError } = await supabaseClient
    .from('properties')
    .select('sector, sector_slug, city')
    .not('sector', 'is', null)
    .eq('status', 'active');

  // Agrupar por sector y contar
  const sectorsMap = new Map();
  if (sectors) {
    sectors.forEach((prop: any) => {
      const sectorName = prop.sector;
      const sectorSlug = prop.sector_slug || sectorName.toLowerCase().replace(/\s+/g, '-');
      const cityName = prop.city || '';
      const key = `${sectorName}-${cityName}`;

      if (!sectorsMap.has(key)) {
        sectorsMap.set(key, {
          name: sectorName,
          slug: sectorSlug,
          city: cityName,
          count: 0
        });
      }
      sectorsMap.get(key).count++;
    });
  }

  const sectorsArray = Array.from(sectorsMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 50)
    .map(sector => ({
      name: sector.name,
      slug: sector.slug,
      city: sector.city,
      count: sector.count
    }));

  // 3. Obtener estadísticas totales
  const { count: totalProperties } = await supabaseClient
    .from('properties')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active');

  // 4. Construir canonical URL
  const canonicalBase = language === 'es' ? '' : `/${language}`;
  const canonicalPath = language === 'es' ? '/ubicaciones' :
                       language === 'en' ? '/locations' : '/emplacements';

  // 5. Breadcrumbs
  const breadcrumbs = [
    { name: language === 'es' ? 'Inicio' : language === 'en' ? 'Home' : 'Accueil', url: '/' },
    { name: language === 'es' ? 'Ubicaciones' : language === 'en' ? 'Locations' : 'Emplacements', url: canonicalBase + canonicalPath }
  ];

  // 6. Structured Data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': t.h1,
    'description': t.description,
    'numberOfItems': citiesArray.length,
    'itemListElement': citiesArray.map((city, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': city.name,
      'url': `${globalConfig?.siteUrl || ''}/${city.slug}`
    }))
  };

  return {
    pageType: 'locations-main',
    language,
    seo: {
      title: t.title,
      description: t.description,
      h1: t.h1,
      h2: t.h2,
      keywords: t.keywords,
      canonical_url: canonicalBase + canonicalPath,
      breadcrumbs,
      structured_data: structuredData,
      open_graph: {
        title: t.title,
        description: t.description,
        image: '/og-locations.jpg',
        type: 'website'
      },
      twitter_card: {
        card: 'summary_large_image',
        title: t.title,
        description: t.description,
        image: '/og-locations.jpg'
      }
    },
    locations: {
      countries: [{
        name: country?.name || 'República Dominicana',
        slug: country?.slug || 'republica-dominicana',
        count: totalProperties || 0
      }],
      cities: citiesArray,
      sectors: sectorsArray
    },
    stats: {
      totalCities: citiesArray.length,
      totalSectors: sectorsArray.length,
      totalProperties: totalProperties || 0
    },
    featuredLocations: citiesArray.slice(0, 4),
    popularSearches: sectorsArray.slice(0, 10),
    globalConfig,
    country,
    trackingString: `location=${language}`
  };
}
