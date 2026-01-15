// vacation-rentals-handler.ts
import { getUIText } from './ui-texts.ts';
// ============================================================================
// VACATION RENTALS HANDLER - SEPARADO PARA EXTENSIÓN FUTURA
// ============================================================================
async function handleVacationRentalsMain(params) {
  const { supabase, language, trackingString, baseData } = params;
  console.log('🏖️ Handling vacation rentals main page');
  // Obtener propiedades de rentas vacacionales
  const { data: vacationProperties } = await supabase.from('properties').select(`
      id, name, description, main_image_url, sale_price, rental_price, temp_rental_price,
      bedrooms, bathrooms, area, slug_url, featured, status, operation, property_type,
      city, sector, country, currency, amenities, gallery_images,
      users:users!properties_agent_id_fkey(first_name, last_name, profile_photo_url, slug, position)
    `).contains('operation', [
    'temp_rental'
  ]).eq('status', 'active').order('featured', {
    ascending: false
  }).order('created_at', {
    ascending: false
  }).limit(12);
  // Obtener destinos populares para rentas vacacionales
  const { data: popularDestinations } = await supabase.from('tags').select(`
      id, slug, slug_en, slug_fr, display_name, display_name_en, display_name_fr,
      content_tags!inner(content_id)
    `).eq('category', 'ciudad').eq('active', true).order('sort_order');
  // Procesar destinos con conteo de propiedades
  const processedDestinations = (popularDestinations || []).map((destination)=>{
    const name = language === 'en' && destination.display_name_en ? destination.display_name_en : language === 'fr' && destination.display_name_fr ? destination.display_name_fr : destination.display_name;
    const slug = language === 'en' && destination.slug_en ? destination.slug_en : language === 'fr' && destination.slug_fr ? destination.slug_fr : destination.slug;
    return {
      id: destination.id,
      name,
      slug,
      count: destination.content_tags?.length || 0,
      url: buildVacationRentalsDestinationUrl(slug, language, trackingString)
    };
  }).filter((dest)=>dest.count > 0).slice(0, 8);
  // Procesar propiedades
  const processedProperties = (vacationProperties || []).map((property)=>processVacationRentalProperty(property, language, trackingString));
  // Amenidades más buscadas
  const topAmenities = [
    {
      name: language === 'en' ? 'Private Pool' : language === 'fr' ? 'Piscine Privée' : 'Piscina Privada',
      icon: 'swimming-pool',
      slug: 'piscina-privada'
    },
    {
      name: language === 'en' ? 'Beach Access' : language === 'fr' ? 'Accès Plage' : 'Acceso a la Playa',
      icon: 'waves',
      slug: 'acceso-playa'
    },
    {
      name: language === 'en' ? 'WiFi' : language === 'fr' ? 'WiFi' : 'WiFi',
      icon: 'wifi',
      slug: 'wifi'
    },
    {
      name: language === 'en' ? 'Air Conditioning' : language === 'fr' ? 'Climatisation' : 'Aire Acondicionado',
      icon: 'snowflake',
      slug: 'aire-acondicionado'
    },
    {
      name: language === 'en' ? 'Kitchen' : language === 'fr' ? 'Cuisine' : 'Cocina',
      icon: 'chef-hat',
      slug: 'cocina'
    },
    {
      name: language === 'en' ? 'Parking' : language === 'fr' ? 'Parking' : 'Parqueo',
      icon: 'car',
      slug: 'parqueo'
    }
  ];
  const seo = {
    title: language === 'en' ? 'Vacation Rentals in Dominican Republic | CLIC Inmobiliaria' : language === 'fr' ? 'Locations de Vacances en République Dominicaine | CLIC Inmobiliaria' : 'Rentas Vacacionales en República Dominicana | CLIC Inmobiliaria',
    description: language === 'en' ? 'Discover amazing vacation rentals in Dominican Republic. Luxury villas, beachfront condos, and unique accommodations for your perfect getaway.' : language === 'fr' ? 'Découvrez d\'incroyables locations de vacances en République Dominicaine. Villas de luxe, condos en bord de mer et hébergements uniques pour votre escapade parfaite.' : 'Descubre increíbles rentas vacacionales en República Dominicana. Villas de lujo, condos frente al mar y alojamientos únicos para tu escapada perfecta.',
    h1: language === 'en' ? 'Vacation Rentals in Paradise' : language === 'fr' ? 'Locations de Vacances au Paradis' : 'Rentas Vacacionales en el Paraíso',
    h2: language === 'en' ? 'Your perfect Dominican Republic getaway awaits' : language === 'fr' ? 'Votre escapade parfaite en République Dominicaine vous attend' : 'Tu escapada perfecta en República Dominicana te espera',
    canonical_url: language === 'es' ? '/rentas-vacacionales' : `/${language}/vacation-rentals`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: language === 'en' ? 'Vacation Rentals' : language === 'fr' ? 'Locations de Vacances' : 'Rentas Vacacionales',
        url: language === 'es' ? '/rentas-vacacionales' : `/${language}/vacation-rentals`
      }
    ]
  };
  return {
    type: 'vacation-rentals-main',
    pageType: 'vacation-rentals-main',
    seo,
    properties: processedProperties,
    featuredProperties: processedProperties.filter((p)=>p.featured).slice(0, 6),
    destinations: processedDestinations,
    amenities: topAmenities,
    stats: {
      totalProperties: processedProperties.length,
      averageNightlyRate: calculateAverageRate(processedProperties),
      totalDestinations: processedDestinations.length,
      occupancyRate: '85%' // Esto podría venir de una tabla de stats
    },
    filters: {
      priceRanges: [
        {
          min: 0,
          max: 100,
          label: language === 'en' ? 'Under $100' : language === 'fr' ? 'Moins de $100' : 'Menos de $100'
        },
        {
          min: 100,
          max: 250,
          label: '$100 - $250'
        },
        {
          min: 250,
          max: 500,
          label: '$250 - $500'
        },
        {
          min: 500,
          max: null,
          label: language === 'en' ? 'Over $500' : language === 'fr' ? 'Plus de $500' : 'Más de $500'
        }
      ],
      propertyTypes: [
        {
          value: 'villa',
          label: language === 'en' ? 'Villa' : language === 'fr' ? 'Villa' : 'Villa'
        },
        {
          value: 'apartment',
          label: language === 'en' ? 'Apartment' : language === 'fr' ? 'Appartement' : 'Apartamento'
        },
        {
          value: 'condo',
          label: language === 'en' ? 'Condo' : language === 'fr' ? 'Condo' : 'Condominio'
        },
        {
          value: 'house',
          label: language === 'en' ? 'House' : language === 'fr' ? 'Maison' : 'Casa'
        }
      ]
    }
  };
}
async function handleVacationRentalsPlans(params) {
  const { language, trackingString } = params;
  console.log('📋 Handling vacation rentals management plans');
  const plans = [
    {
      id: 'basic',
      name: language === 'en' ? 'Basic Plan' : language === 'fr' ? 'Plan de Base' : 'Plan Básico',
      price: language === 'en' ? '$99/month' : language === 'fr' ? '$99/mois' : '$99/mes',
      commission: '15%',
      features: [
        language === 'en' ? 'Property listing on major platforms' : language === 'fr' ? 'Listage sur les principales plateformes' : 'Listado en plataformas principales',
        language === 'en' ? 'Basic photography (10 photos)' : language === 'fr' ? 'Photographie de base (10 photos)' : 'Fotografía básica (10 fotos)',
        language === 'en' ? 'Guest communication management' : language === 'fr' ? 'Gestion communication invités' : 'Gestión comunicación huéspedes',
        language === 'en' ? 'Check-in/out coordination' : language === 'fr' ? 'Coordination arrivée/départ' : 'Coordinación check-in/out',
        language === 'en' ? 'Monthly reporting' : language === 'fr' ? 'Rapport mensuel' : 'Reporte mensual'
      ],
      limitations: [
        language === 'en' ? 'No cleaning service included' : language === 'fr' ? 'Service nettoyage non inclus' : 'Servicio de limpieza no incluido',
        language === 'en' ? 'Basic customer support' : language === 'fr' ? 'Support client de base' : 'Soporte básico al cliente'
      ]
    },
    {
      id: 'premium',
      name: language === 'en' ? 'Premium Plan' : language === 'fr' ? 'Plan Premium' : 'Plan Premium',
      price: language === 'en' ? '$199/month' : language === 'fr' ? '$199/mois' : '$199/mes',
      commission: '12%',
      popular: true,
      features: [
        language === 'en' ? 'Everything in Basic Plan' : language === 'fr' ? 'Tout du plan de base' : 'Todo del plan básico',
        language === 'en' ? 'Professional photography & staging' : language === 'fr' ? 'Photographie & mise en scène pro' : 'Fotografía profesional y staging',
        language === 'en' ? 'Dynamic pricing optimization' : language === 'fr' ? 'Optimisation prix dynamique' : 'Optimización de precios dinámica',
        language === 'en' ? 'Cleaning service coordination' : language === 'fr' ? 'Coordination service nettoyage' : 'Coordinación servicio de limpieza',
        language === 'en' ? '24/7 guest support' : language === 'fr' ? 'Support invités 24/7' : 'Soporte 24/7 a huéspedes',
        language === 'en' ? 'Property maintenance oversight' : language === 'fr' ? 'Supervision maintenance propriété' : 'Supervisión mantenimiento propiedad'
      ]
    },
    {
      id: 'luxury',
      name: language === 'en' ? 'Luxury Plan' : language === 'fr' ? 'Plan Luxe' : 'Plan Lujo',
      price: language === 'en' ? '$399/month' : language === 'fr' ? '$399/mois' : '$399/mes',
      commission: '10%',
      features: [
        language === 'en' ? 'Everything in Premium Plan' : language === 'fr' ? 'Tout du plan premium' : 'Todo del plan premium',
        language === 'en' ? 'Professional video tours' : language === 'fr' ? 'Tours vidéo professionnels' : 'Tours de video profesionales',
        language === 'en' ? 'Concierge services for guests' : language === 'fr' ? 'Services conciergerie invités' : 'Servicios de conserjería',
        language === 'en' ? 'Custom welcome packages' : language === 'fr' ? 'Paquets bienvenue personnalisés' : 'Paquetes de bienvenida personalizados',
        language === 'en' ? 'Dedicated account manager' : language === 'fr' ? 'Gestionnaire compte dédié' : 'Gestor de cuenta dedicado',
        language === 'en' ? 'Revenue guarantee program' : language === 'fr' ? 'Programme garantie revenus' : 'Programa garantía de ingresos'
      ]
    }
  ];
  const services = [
    {
      title: language === 'en' ? 'Property Setup & Photography' : language === 'fr' ? 'Configuration & Photographie' : 'Configuración y Fotografía',
      description: language === 'en' ? 'Professional staging and high-quality photography to showcase your property at its best' : language === 'fr' ? 'Mise en scène professionnelle et photographie haute qualité pour présenter votre propriété sous son meilleur jour' : 'Staging profesional y fotografía de alta calidad para mostrar tu propiedad en su mejor forma',
      icon: 'camera',
      included: [
        'basic',
        'premium',
        'luxury'
      ]
    },
    {
      title: language === 'en' ? 'Multi-Platform Listing' : language === 'fr' ? 'Listage Multi-Plateformes' : 'Listado Multi-Plataforma',
      description: language === 'en' ? 'Your property listed on Airbnb, Booking.com, VRBO, and other major vacation rental platforms' : language === 'fr' ? 'Votre propriété listée sur Airbnb, Booking.com, VRBO et autres plateformes principales' : 'Tu propiedad listada en Airbnb, Booking.com, VRBO y otras plataformas principales',
      icon: 'globe',
      included: [
        'basic',
        'premium',
        'luxury'
      ]
    },
    {
      title: language === 'en' ? 'Guest Management' : language === 'fr' ? 'Gestion Invités' : 'Gestión de Huéspedes',
      description: language === 'en' ? 'Complete guest communication, from inquiry to check-out, ensuring 5-star experiences' : language === 'fr' ? 'Communication complète avec invités, de la demande au départ, garantissant des expériences 5 étoiles' : 'Comunicación completa con huéspedes, desde consulta hasta check-out, garantizando experiencias 5 estrellas',
      icon: 'users',
      included: [
        'basic',
        'premium',
        'luxury'
      ]
    },
    {
      title: language === 'en' ? 'Revenue Optimization' : language === 'fr' ? 'Optimisation Revenus' : 'Optimización de Ingresos',
      description: language === 'en' ? 'Dynamic pricing strategies and occupancy optimization to maximize your rental income' : language === 'fr' ? 'Stratégies prix dynamiques et optimisation occupation pour maximiser revenus locatifs' : 'Estrategias de precios dinámicos y optimización de ocupación para maximizar ingresos',
      icon: 'trending-up',
      included: [
        'premium',
        'luxury'
      ]
    }
  ];
  const seo = {
    title: language === 'en' ? 'Vacation Rental Management Plans | CLIC Inmobiliaria' : language === 'fr' ? 'Plans de Gestion Locations Vacances | CLIC Inmobiliaria' : 'Planes de Gestión Rentas Vacacionales | CLIC Inmobiliaria',
    description: language === 'en' ? 'Maximize your vacation rental income with our professional management plans. Full-service property management, guest services, and revenue optimization.' : language === 'fr' ? 'Maximisez vos revenus locatifs avec nos plans de gestion professionnels. Gestion immobilière complète, services invités et optimisation revenus.' : 'Maximiza los ingresos de tu renta vacacional con nuestros planes de gestión profesionales. Administración completa, servicios a huéspedes y optimización de ingresos.',
    h1: language === 'en' ? 'Vacation Rental Management Plans' : language === 'fr' ? 'Plans de Gestion Locations Vacances' : 'Planes de Gestión Rentas Vacacionales',
    h2: language === 'en' ? 'Professional property management for maximum returns' : language === 'fr' ? 'Gestion immobilière professionnelle pour retours maximaux' : 'Gestión inmobiliaria profesional para máximos retornos',
    canonical_url: language === 'es' ? '/planes-rentas-vacacionales' : `/${language}/vacation-rental-plans`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: language === 'en' ? 'Vacation Rentals' : language === 'fr' ? 'Locations Vacances' : 'Rentas Vacacionales',
        url: language === 'es' ? '/rentas-vacacionales' : `/${language}/vacation-rentals`
      },
      {
        name: language === 'en' ? 'Management Plans' : language === 'fr' ? 'Plans Gestion' : 'Planes de Gestión',
        url: language === 'es' ? '/planes-rentas-vacacionales' : `/${language}/vacation-rental-plans`
      }
    ]
  };
  return {
    type: 'vacation-rentals-plans',
    pageType: 'vacation-rentals-plans',
    seo,
    plans,
    services,
    benefits: {
      averageIncrease: '35%',
      occupancyRate: '87%',
      guestSatisfaction: '4.9/5',
      responseTime: '< 2 hours'
    }
  };
}
async function handleVacationRentalsDynamic(params) {
  const { supabase, language, trackingString, contentSegments, queryParams } = params;
  if (contentSegments.length === 0) {
    throw new Error('Destination required for dynamic vacation rentals');
  }
  const destinationSlug = contentSegments[0];
  console.log('🏖️ Handling vacation rentals destination:', destinationSlug);
  // Buscar el destino
  const slugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
  const { data: destination } = await supabase.from('tags').select('*').eq(slugField, destinationSlug).eq('category', 'ciudad').eq('active', true).single();
  if (!destination) {
    throw new Error(`Destination "${destinationSlug}" not found`);
  }
  const destinationName = language === 'en' && destination.display_name_en ? destination.display_name_en : language === 'fr' && destination.display_name_fr ? destination.display_name_fr : destination.display_name;
  // Obtener propiedades del destino
  const page = parseInt(queryParams.get('page') || '1');
  const limit = 12;
  const offset = (page - 1) * limit;
  // Filtros de la query
  const minPrice = queryParams.get('min_price');
  const maxPrice = queryParams.get('max_price');
  const bedrooms = queryParams.get('bedrooms');
  const amenity = queryParams.get('amenity');
  // Construir query base
  let query = supabase.from('properties').select(`
      id, name, description, main_image_url, temp_rental_price, bedrooms, bathrooms, 
      area, slug_url, featured, amenities, gallery_images, city, sector,
      users:users!properties_agent_id_fkey(first_name, last_name, profile_photo_url, slug, position)
    `, {
    count: 'exact'
  }).contains('operation', [
    'temp_rental'
  ]).eq('status', 'active').ilike('city', `%${destinationName}%`);
  // Aplicar filtros
  if (minPrice) query = query.gte('temp_rental_price', parseInt(minPrice));
  if (maxPrice) query = query.lte('temp_rental_price', parseInt(maxPrice));
  if (bedrooms) query = query.gte('bedrooms', parseInt(bedrooms));
  if (amenity) query = query.contains('amenities', [
    amenity
  ]);
  const { data: properties, count } = await query.order('featured', {
    ascending: false
  }).order('created_at', {
    ascending: false
  }).range(offset, offset + limit - 1);
  const processedProperties = (properties || []).map((property)=>processVacationRentalProperty(property, language, trackingString));
  // Construir paginación
  const totalPages = Math.ceil((count || 0) / limit);
  const pagination = {
    page,
    limit,
    total: count || 0,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
  const seo = {
    title: language === 'en' ? `Vacation Rentals in ${destinationName} | CLIC Inmobiliaria` : language === 'fr' ? `Locations Vacances à ${destinationName} | CLIC Inmobiliaria` : `Rentas Vacacionales en ${destinationName} | CLIC Inmobiliaria`,
    description: language === 'en' ? `Find the perfect vacation rental in ${destinationName}. Luxury accommodations, beachfront properties, and unique stays in Dominican Republic.` : language === 'fr' ? `Trouvez la location vacances parfaite à ${destinationName}. Hébergements luxueux, propriétés front de mer et séjours uniques en République Dominicaine.` : `Encuentra la renta vacacional perfecta en ${destinationName}. Alojamientos de lujo, propiedades frente al mar y estadías únicas en República Dominicana.`,
    h1: language === 'en' ? `Vacation Rentals in ${destinationName}` : language === 'fr' ? `Locations Vacances à ${destinationName}` : `Rentas Vacacionales en ${destinationName}`,
    h2: language === 'en' ? `${count || 0} amazing properties available` : language === 'fr' ? `${count || 0} propriétés incroyables disponibles` : `${count || 0} propiedades increíbles disponibles`,
    canonical_url: language === 'es' ? `/rentas-vacacionales/${destinationSlug}` : `/${language}/vacation-rentals/${destinationSlug}`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: language === 'en' ? 'Vacation Rentals' : language === 'fr' ? 'Locations Vacances' : 'Rentas Vacacionales',
        url: language === 'es' ? '/rentas-vacacionales' : `/${language}/vacation-rentals`
      },
      {
        name: destinationName,
        url: language === 'es' ? `/rentas-vacacionales/${destinationSlug}` : `/${language}/vacation-rentals/${destinationSlug}`
      }
    ]
  };
  return {
    type: 'vacation-rentals-dynamic',
    pageType: 'vacation-rentals-dynamic',
    seo,
    destination: {
      id: destination.id,
      name: destinationName,
      slug: destinationSlug,
      description: destination.description
    },
    properties: processedProperties,
    pagination,
    activeFilters: {
      minPrice,
      maxPrice,
      bedrooms,
      amenity
    },
    stats: {
      totalProperties: count || 0,
      averagePrice: calculateAverageRate(processedProperties),
      availabilityRate: '78%'
    }
  };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function processVacationRentalProperty(property, language, trackingString) {
  let url = property.slug_url;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  const agent = property.users ? {
    name: `${property.users.first_name || ''} ${property.users.last_name || ''}`.trim() || getUIText('TEAM_CLIC', language),
    avatar: property.users.profile_photo_url || '/images/team/clic-experts.jpg',
    slug: property.users.slug,
    position: property.users.position || getUIText('REAL_ESTATE_ADVISOR', language)
  } : null;
  return {
    id: property.id,
    name: property.name,
    description: property.description,
    mainImage: property.main_image_url,
    gallery: property.gallery_images || [],
    nightlyRate: property.temp_rental_price,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    area: property.area,
    amenities: property.amenities || [],
    city: property.city,
    sector: property.sector,
    featured: property.featured,
    url: `/${url}${trackingString}`,
    agent
  };
}
function buildVacationRentalsDestinationUrl(destinationSlug, language, trackingString) {
  const basePath = language === 'es' ? 'rentas-vacacionales' : language === 'en' ? 'vacation-rentals' : 'locations-vacances';
  let url = `${basePath}/${destinationSlug}`;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  return `/${url}${trackingString}`;
}
function calculateAverageRate(properties) {
  if (!properties.length) return 0;
  const total = properties.reduce((sum, prop)=>sum + (prop.nightlyRate || 0), 0);
  return Math.round(total / properties.length);
}
// ============================================================================
// MAIN EXPORT HANDLER
// ============================================================================
export async function handleVacationRentals(params) {
  try {
    const { contentSegments, contentType } = params;
    if (contentType === 'vacation-rentals-plans') {
      // Planes de gestión
      return await handleVacationRentalsPlans(params);
    } else if (contentSegments.length > 0) {
      // Destino específico
      return await handleVacationRentalsDynamic(params);
    } else {
      // Página principal
      return await handleVacationRentalsMain(params);
    }
  } catch (error) {
    console.error('Error in vacation rentals handler:', error);
    throw error;
  }
}
