// 📁 supabase/functions/unified-property-search/seo.ts
import { CATEGORY_NAMES_ES } from './config.ts';
import { extractLocationFromTags, extractPropertyTypeFromTags, extractOperationFromTags } from './utils.ts';
export class SEOService {
  supabase;
  googlePlacesCache;
  constructor(supabase){
    this.supabase = supabase;
    this.googlePlacesCache = new Map();
  }
  async getLocationGooglePlacesData(locationName) {
    if (!locationName) return null;
    if (this.googlePlacesCache.has(locationName)) {
      console.log(`🎯 Cache hit para Google Places: ${locationName}`);
      return this.googlePlacesCache.get(locationName);
    }
    console.log(`🔍 Obteniendo datos de Google Places para: ${locationName}`);
    try {
      const { data: locationInsight, error: locationError } = await this.supabase.from('location_insights_with_places').select('id, location_name, services_score').ilike('location_name', `%${locationName}%`).eq('status', 'active').single();
      if (locationError || !locationInsight) {
        console.log(`⚠️ No se encontró location_insight para: ${locationName}`);
        return null;
      }
      const { data: placesData, error: placesError } = await this.supabase.from('google_places_data').select(`
          place_name, place_category, place_type, rating, 
          user_ratings_total, distance_display, business_status,
          is_featured, relevance_score, address
        `).eq('location_insight_id', locationInsight.id).eq('status', 'active').order('distance_meters', {
        ascending: true
      });
      if (placesError) {
        console.error(`❌ Error obteniendo Google Places data:`, placesError);
        return null;
      }
      const placesByCategory = {};
      const featuredPlaces = [];
      (placesData || []).forEach((place)=>{
        if (!placesByCategory[place.place_category]) {
          placesByCategory[place.place_category] = [];
        }
        placesByCategory[place.place_category].push(place);
        if (place.is_featured && featuredPlaces.length < 10) {
          featuredPlaces.push(place);
        }
      });
      const stats = {
        total_places: placesData?.length || 0,
        categories_count: Object.keys(placesByCategory).length,
        featured_count: featuredPlaces.length,
        avg_rating: placesData?.length > 0 ? (placesData.filter((p)=>p.rating).reduce((sum, p)=>sum + p.rating, 0) / placesData.filter((p)=>p.rating).length).toFixed(1) : null,
        services_score: locationInsight.services_score || 0
      };
      const result = {
        location_insight_id: locationInsight.id,
        location_name: locationInsight.location_name,
        places_by_category: placesByCategory,
        featured_places: featuredPlaces,
        stats
      };
      this.googlePlacesCache.set(locationName, result);
      setTimeout(()=>this.googlePlacesCache.delete(locationName), 30 * 60 * 1000);
      return result;
    } catch (error) {
      console.error(`❌ Error crítico obteniendo Google Places data:`, error);
      return null;
    }
  }
  generateSEOMetadata(context) {
    const { type, searchResults, property, tags, urlSegments, googlePlacesData } = context;
    let seoData = {
      title: '',
      description: '',
      keywords: [],
      h1: '',
      structured_data: {},
      og: {
        title: '',
        description: '',
        image: '',
        url: '',
        type: 'website',
        site_name: 'CLIC Inmobiliaria',
        locale: 'es_DO'
      },
      twitter: {
        card: 'summary_large_image',
        title: '',
        description: '',
        image: '',
        site: '@clicinmobiliaria'
      },
      technical: {
        robots: {
          index: true,
          follow: true,
          'max-snippet': -1,
          'max-image-preview': 'large',
          'max-video-preview': -1
        },
        sitemap: {
          lastModified: new Date().toISOString(),
          changeFreq: 'weekly',
          priority: 0.8
        }
      }
    };
    if (type === 'single-property' || type === 'single-property-project' || type === 'property-not-available') {
      return this.generatePropertySEO(seoData, property, type, googlePlacesData);
    } else if (type === 'property-list') {
      return this.generateListingSEO(seoData, searchResults, tags, urlSegments, googlePlacesData);
    }
    return seoData;
  }
  generatePropertySEO(seoData, property, type, googlePlacesData) {
    const location = property.sectors?.name || property.cities?.name || 'República Dominicana';
    const propertyType = property.property_categories?.name || 'Propiedad';
    const pricing = property.pricing_unified?.display_price;
    const price = pricing ? pricing.formatted : 'Precio disponible';
    let nearbyServices = '';
    if (googlePlacesData && googlePlacesData.featured_places?.length > 0) {
      const topServices = googlePlacesData.featured_places.slice(0, 3);
      nearbyServices = ` Cerca de ${topServices.map((s)=>s.place_name).join(', ')}.`;
    }
    // Título específico para propiedades no disponibles
    if (type === 'property-not-available') {
      seoData.title = `${property.name} - No Disponible | Propiedades Similares | CLIC Inmobiliaria`;
      seoData.description = `${propertyType} en ${location} ya no está disponible. Descubre propiedades similares de ${property.bedrooms} habitaciones y ${property.bathrooms} baños.${nearbyServices}`;
    } else {
      seoData.title = `${property.name} | ${propertyType} en ${location} | CLIC Inmobiliaria`;
      seoData.description = `${propertyType} de ${property.bedrooms} habitaciones y ${property.bathrooms} baños en ${location}. ${price}. ${property.built_area}m².${nearbyServices} Ver fotos y detalles.`;
    }
    seoData.h1 = property.name;
    seoData.keywords = [
      `${propertyType.toLowerCase()} ${location.toLowerCase()}`,
      `${property.bedrooms} habitaciones ${location.toLowerCase()}`,
      `comprar ${propertyType.toLowerCase()} ${location.toLowerCase()}`,
      'bienes raices republica dominicana'
    ];
    if (googlePlacesData) {
      const serviceKeywords = Object.keys(googlePlacesData.places_by_category).map((category)=>`cerca de ${category.replace('_', ' ')}`).slice(0, 3);
      seoData.keywords.push(...serviceKeywords);
    }
    seoData.structured_data = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      "name": property.name,
      "description": seoData.description,
      "url": `https://clic.do/${property.slug_url}`,
      "image": property.main_image_optimized?.url ? [
        property.main_image_optimized.url
      ] : [],
      "offers": {
        "@type": "Offer",
        "price": pricing?.amount,
        "priceCurrency": pricing?.currency,
        "availability": type === 'property-not-available' ? "OutOfStock" : property.property_status === 'Publicada' ? "InStock" : "OutOfStock"
      },
      "address": {
        "@type": "PostalAddress",
        "addressLocality": location,
        "addressCountry": "DO"
      },
      "floorSize": {
        "@type": "QuantitativeValue",
        "value": property.built_area,
        "unitCode": "MTK"
      },
      "numberOfRooms": property.bedrooms,
      "numberOfBathroomsTotal": property.bathrooms
    };
    if (googlePlacesData && googlePlacesData.featured_places?.length > 0) {
      seoData.structured_data.nearbyPoints = googlePlacesData.featured_places.slice(0, 5).map((place)=>({
          "@type": "Place",
          "name": place.place_name,
          "description": place.place_category,
          "address": place.address
        }));
    }
    // OG and Twitter
    seoData.og.title = seoData.title;
    seoData.og.description = seoData.description;
    seoData.og.image = property.main_image_optimized?.url || 'https://clic.do/default-og-image.jpg';
    seoData.og.url = `https://clic.do/${property.slug_url}`;
    seoData.twitter.title = seoData.title;
    seoData.twitter.description = seoData.description;
    seoData.twitter.image = seoData.og.image;
    return seoData;
  }
  generateListingSEO(seoData, searchResults, tags, urlSegments, googlePlacesData) {
    const properties = searchResults?.properties || [];
    const count = searchResults?.pagination?.totalCount || properties.length;
    const location = extractLocationFromTags(tags) || 'República Dominicana';
    const propertyType = extractPropertyTypeFromTags(tags) || 'Propiedades';
    const operation = extractOperationFromTags(tags) || 'Venta';
    const displayPrices = properties.map((p)=>p.pricing_unified?.display_price?.amount).filter((p)=>p && p > 0).sort((a, b)=>a - b);
    const minPrice = displayPrices.length > 0 ? displayPrices[0] : null;
    const maxPrice = displayPrices.length > 0 ? displayPrices[displayPrices.length - 1] : null;
    let servicesInfo = '';
    if (googlePlacesData && googlePlacesData.stats.total_places > 0) {
      const topCategories = Object.keys(googlePlacesData.places_by_category).sort((a, b)=>googlePlacesData.places_by_category[b].length - googlePlacesData.places_by_category[a].length).slice(0, 3);
      const services = topCategories.map((cat)=>CATEGORY_NAMES_ES[cat] || cat).join(', ');
      servicesInfo = ` Zona con excelentes servicios: ${services}.`;
    }
    seoData.title = `${propertyType} en ${operation} en ${location} | ${count} Disponibles | CLIC Inmobiliaria`;
    let priceInfo = '';
    if (minPrice && maxPrice) {
      if (minPrice === maxPrice) {
        priceInfo = `Precio: $${minPrice.toLocaleString()}`;
      } else {
        priceInfo = `Precios desde $${minPrice.toLocaleString()} hasta $${maxPrice.toLocaleString()}`;
      }
    }
    seoData.description = `Descubre ${count} ${propertyType.toLowerCase()} en ${operation.toLowerCase()} en ${location}. ${priceInfo}.${servicesInfo} ✅ Tours virtuales ✅ Financiamiento disponible`;
    seoData.h1 = `${propertyType} en ${operation} en ${location} - ${count} Propiedades Disponibles`;
    seoData.keywords = [
      `${propertyType.toLowerCase()} ${location.toLowerCase()}`,
      `${operation.toLowerCase()} ${propertyType.toLowerCase()} ${location.toLowerCase()}`,
      `bienes raices ${location.toLowerCase()}`,
      'inmobiliaria republica dominicana',
      'propiedades republica dominicana'
    ];
    seoData.structured_data = {
      "@context": "https://schema.org",
      "@type": "SearchResultsPage",
      "name": seoData.title,
      "description": seoData.description,
      "url": `https://clic.do/${urlSegments?.join('/') || ''}`,
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": count,
        "itemListElement": properties.slice(0, 10).map((prop, index)=>({
            "@type": "RealEstateListing",
            "position": index + 1,
            "name": prop.name,
            "url": `https://clic.do/${prop.slug_url}`,
            "offers": {
              "@type": "Offer",
              "price": prop.pricing_unified?.display_price?.amount,
              "priceCurrency": prop.pricing_unified?.display_price?.currency
            }
          }))
      }
    };
    if (googlePlacesData) {
      seoData.places_enrichment = {
        total_services: googlePlacesData.stats.total_places,
        services_score: googlePlacesData.stats.services_score,
        avg_rating: googlePlacesData.stats.avg_rating,
        top_categories: Object.keys(googlePlacesData.places_by_category),
        featured_services: googlePlacesData.featured_places.slice(0, 5)
      };
    }
    // OG and Twitter
    seoData.og.title = seoData.title;
    seoData.og.description = seoData.description;
    seoData.og.image = properties?.[0]?.main_image_optimized?.url || 'https://clic.do/default-og-image.jpg';
    seoData.og.url = `https://clic.do/${urlSegments?.join('/') || ''}`;
    seoData.twitter.title = seoData.title;
    seoData.twitter.description = seoData.description;
    seoData.twitter.image = seoData.og.image;
    // Technical SEO
    seoData.technical.sitemap.changeFreq = 'daily';
    seoData.technical.sitemap.priority = 0.6;
    return seoData;
  }
  async getArticlesStats() {
    try {
      const { count, error } = await this.supabase.from('articles').select('*', {
        count: 'exact',
        head: true
      }).eq('status', 'published');
      if (error) {
        console.error('❌ Error obteniendo stats de artículos:', error);
        return {
          total_articles: 200,
          last_updated: 'Contenido actualizado semanalmente'
        };
      }
      return {
        total_articles: count || 200,
        last_updated: 'Contenido actualizado semanalmente'
      };
    } catch (error) {
      console.error('❌ Error crítico en getArticlesStats:', error);
      return {
        total_articles: 200,
        last_updated: 'Contenido actualizado semanalmente'
      };
    }
  }
}
