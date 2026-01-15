// supabase/functions/content-backend/handlers/property-types-handler.ts
// Handler para /propiedades, /en/property-types, /fr/types-de-proprietes

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface PropertyTypesResponse {
  pageType: string;
  language: string;
  seo: any;
  propertyTypes: any[];
  featuredByType: Record<string, any[]>;
  globalConfig: any;
  country: any;
  trackingString: string;
}

export async function handlePropertyTypesPage(
  language: string,
  supabaseClient: any,
  country: any,
  globalConfig: any
): Promise<PropertyTypesResponse> {

  const translations: Record<string, any> = {
    es: {
      title: 'Tipos de Propiedades | CLIC',
      description: 'Explora todos los tipos de propiedades disponibles: apartamentos, casas, villas, penthouses, terrenos y locales comerciales',
      h1: 'Tipos de Propiedades',
      h2: 'Encuentra el inmueble perfecto para ti',
      keywords: 'tipos de propiedades, apartamentos, casas, villas, penthouses, terrenos, locales comerciales',
      types: {
        'Apartamentos': { description: 'Modernos espacios urbanos', icon: '🏢' },
        'Casas': { description: 'Espacios familiares amplios', icon: '🏠' },
        'Villas': { description: 'Lujo y exclusividad', icon: '🏰' },
        'Penthouses': { description: 'Vistas panorámicas únicas', icon: '🌆' },
        'Terrenos': { description: 'Inversión para desarrollo', icon: '🌳' },
        'Locales Comerciales': { description: 'Oportunidades de negocio', icon: '🏪' }
      }
    },
    en: {
      title: 'Property Types | CLIC',
      description: 'Explore all available property types: apartments, houses, villas, penthouses, land and commercial spaces',
      h1: 'Property Types',
      h2: 'Find the perfect property for you',
      keywords: 'property types, apartments, houses, villas, penthouses, land, commercial spaces',
      types: {
        'Apartments': { description: 'Modern urban spaces', icon: '🏢' },
        'Houses': { description: 'Spacious family homes', icon: '🏠' },
        'Villas': { description: 'Luxury and exclusivity', icon: '🏰' },
        'Penthouses': { description: 'Unique panoramic views', icon: '🌆' },
        'Land': { description: 'Investment for development', icon: '🌳' },
        'Commercial Spaces': { description: 'Business opportunities', icon: '🏪' }
      }
    },
    fr: {
      title: 'Types de Propriétés | CLIC',
      description: 'Explorez tous les types de propriétés disponibles : appartements, maisons, villas, penthouses, terrains et locaux commerciaux',
      h1: 'Types de Propriétés',
      h2: 'Trouvez la propriété parfaite pour vous',
      keywords: 'types de propriétés, appartements, maisons, villas, penthouses, terrains, locaux commerciaux',
      types: {
        'Appartements': { description: 'Espaces urbains modernes', icon: '🏢' },
        'Maisons': { description: 'Maisons familiales spacieuses', icon: '🏠' },
        'Villas': { description: 'Luxe et exclusivité', icon: '🏰' },
        'Penthouses': { description: 'Vues panoramiques uniques', icon: '🌆' },
        'Terrains': { description: 'Investissement pour développement', icon: '🌳' },
        'Locaux Commerciaux': { description: 'Opportunités d\'affaires', icon: '🏪' }
      }
    }
  };

  const t = translations[language] || translations.es;

  // 1. Obtener categorías/tipos de propiedades con conteo
  const { data: properties, error: propertiesError } = await supabaseClient
    .from('properties')
    .select('category, category_slug')
    .eq('status', 'active');

  // Agrupar por categoría y contar
  const categoriesMap = new Map();
  if (properties) {
    properties.forEach((prop: any) => {
      const category = prop.category;
      if (!category) return;

      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, {
          name: category,
          slug: prop.category_slug || category.toLowerCase().replace(/\s+/g, '-'),
          count: 0
        });
      }
      categoriesMap.get(category).count++;
    });
  }

  // Crear array de tipos con info adicional
  const propertyTypesArray = Array.from(categoriesMap.values())
    .map(cat => {
      const typeInfo = t.types[cat.name] || { description: '', icon: '🏘️' };
      return {
        type: cat.name,
        slug: cat.slug,
        count: cat.count,
        icon: typeInfo.icon,
        description: typeInfo.description,
        image: `/images/types/${cat.slug}.jpg`
      };
    })
    .sort((a, b) => b.count - a.count);

  // 2. Obtener propiedades destacadas por tipo (top 6 de cada tipo)
  const featuredByType: Record<string, any[]> = {};

  for (const type of propertyTypesArray.slice(0, 3)) { // Solo top 3 tipos
    const { data: featured } = await supabaseClient
      .from('properties')
      .select(`
        id, code, title, category, operation,
        price, currency, city, sector,
        bedrooms, bathrooms, area, parking_spaces,
        image, images, featured, views_count
      `)
      .eq('category', type.type)
      .eq('status', 'active')
      .order('featured', { ascending: false })
      .order('views_count', { ascending: false })
      .limit(6);

    if (featured && featured.length > 0) {
      featuredByType[type.type] = featured.map((prop: any) => ({
        id: prop.id,
        code: prop.code,
        titulo: prop.title,
        categoria: prop.category,
        operacion: prop.operation,
        precio: prop.price,
        moneda: prop.currency,
        ciudad: prop.city,
        sector: prop.sector,
        habitaciones: prop.bedrooms,
        banos: prop.bathrooms,
        area: prop.area,
        parqueos: prop.parking_spaces,
        imagen: prop.image,
        imagenes: prop.images || [prop.image],
        destacado: prop.featured,
        url: `/${type.slug}/${prop.code}`
      }));
    }
  }

  // 3. Construir canonical URL
  const canonicalBase = language === 'es' ? '' : `/${language}`;
  const canonicalPath = language === 'es' ? '/propiedades' :
                       language === 'en' ? '/property-types' : '/types-de-proprietes';

  // 4. Breadcrumbs
  const breadcrumbs = [
    { name: language === 'es' ? 'Inicio' : language === 'en' ? 'Home' : 'Accueil', url: '/' },
    { name: language === 'es' ? 'Tipos de Propiedades' : language === 'en' ? 'Property Types' : 'Types de Propriétés', url: canonicalBase + canonicalPath }
  ];

  // 5. Structured Data
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    'name': t.h1,
    'description': t.description,
    'numberOfItems': propertyTypesArray.length,
    'itemListElement': propertyTypesArray.map((type, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': type.type,
      'url': `${globalConfig?.siteUrl || ''}/${type.slug}`,
      'description': type.description
    }))
  };

  return {
    pageType: 'property-types-main',
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
        image: '/og-property-types.jpg',
        type: 'website'
      },
      twitter_card: {
        card: 'summary_large_image',
        title: t.title,
        description: t.description,
        image: '/og-property-types.jpg'
      }
    },
    propertyTypes: propertyTypesArray,
    featuredByType,
    globalConfig,
    country,
    trackingString: `property-types=${language}`
  };
}
