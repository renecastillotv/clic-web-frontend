// src/data/propertyDetailProvider.ts
// =====================================================
// PROVIDER ESPECÍFICO PARA PROPERTY-DETAIL EDGE FUNCTION
// =====================================================

// API de Neon en Vercel (reemplaza Supabase)
const API_URL = 'https://clic-api-neon.vercel.app';

// =====================================================
// FUNCIÓN PRINCIPAL PARA OBTENER DATOS DE PROPIEDAD INDIVIDUAL
// =====================================================

export async function getPropertyDetailData(segments: string[], searchParams?: URLSearchParams) {
  console.log('🏠 Calling property-detail edge function for:', segments);
  
  try {
    const referralCode = searchParams?.get('ref');
    const apiPath = `/${segments.join('/')}`;
    
    let apiUrl = `${API_URL}${apiPath}`;

    if (referralCode) {
      apiUrl += `?ref=${referralCode}`;
      console.log('🎯 Adding referral code:', referralCode);
    }

    console.log('📡 API URL:', apiUrl);

    // La API de Neon no requiere autenticación
    const response = await fetch(apiUrl, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error('❌ Property Detail API Error:', response.status, response.statusText);
      throw new Error(`Property Detail API Error: ${response.status}`);
    }
    
    const apiData = await response.json();
    console.log('✅ Property Detail API Response:', {
      type: apiData.type,
      hasProperty: !!apiData.property,
      hasAgent: !!apiData.property?.agent,
      hasReferralInfo: !!apiData.referral_info,
      hasRelatedContent: !!apiData.related_content,
      hasWidgets: !!apiData.widgets
    });
    
    return apiData;
    
  } catch (error) {
    console.error('❌ Error in getPropertyDetailData:', error);
    throw error;
  }
}

// =====================================================
// FORMATEAR DATOS PARA COMPONENTES (COMPATIBLE CON PRUEBA.ASTRO)
// =====================================================

export async function getPropertyDetailFormatted(segments: string[], searchParams?: URLSearchParams) {
  try {
    const apiData = await getPropertyDetailData(segments, searchParams);
    
    // Verificar que sea una propiedad individual válida
    if (apiData.type === 'single_property_enhanced' && apiData.property) {
      console.log('✅ Property found:', apiData.property.title);
      
      const formattedProperty = formatPropertyFromDetailAPI(apiData.property);
      const agentInfo = formatAgentFromDetailAPI(apiData.property.agent, apiData.referral_info);
      
      return {
        type: 'property',
        property: formattedProperty,
        agent: agentInfo,
        referral_info: apiData.referral_info || null,
        agent_info: apiData.agent_info || null,
        relatedProperties: formatSimilarProperties(apiData.widgets?.similar_properties || []),
        articles: apiData.related_content?.articles || [],
        videos: apiData.related_content?.videos || [],
        testimonials: apiData.related_content?.testimonials || [],
        faqs: apiData.related_content?.faqs || [],
        seoContent: apiData.related_content?.seo_content || [],
        meta: {
          title: apiData.seo?.title || apiData.property.title,
          description: apiData.seo?.description || generatePropertyDescription(apiData.property)
        },
        breadcrumbs: apiData.seo?.breadcrumbs || generateFallbackBreadcrumbs(segments),
        debug: apiData.debug || {}
      };
    } 
    
    // Manejar propiedad no disponible/vendida
    else if (apiData.type === 'property_sold_or_unavailable') {
      console.log('⚠️ Property sold or unavailable');
      
      return {
        type: 'property-sold',
        message: apiData.message,
        alternative_properties: formatSimilarProperties(apiData.alternative_properties || []),
        agent: formatAgentFromDetailAPI(apiData.agent_info?.agent, null),
        meta: {
          title: 'Propiedad no disponible - CLIC Inmobiliaria',
          description: 'Esta propiedad ya no está disponible, pero tenemos excelentes alternativas.'
        }
      };
    }
    
    else {
      throw new Error('Invalid response from property-detail API');
    }
    
  } catch (error) {
    console.error('❌ Error fetching property detail:', error);
    return get404PropertyPageData();
  }
}

// =====================================================
// FORMATEO DE DATOS DESDE PROPERTY-DETAIL API
// =====================================================

function formatPropertyFromDetailAPI(propertyData: any) {
  console.log('🔧 Formatting property from detail API:', propertyData.id);
  
  return {
    id: propertyData.id,
    slug: generatePropertySlug(propertyData),
    titulo: propertyData.title,
    precio: propertyData.formatted_price || formatPrice(propertyData.main_price, propertyData.main_currency),
    imagen: propertyData.main_image_url,
    imagenes: propertyData.gallery_images || [],
    sector: propertyData.location?.full_address || 'Ubicación no especificada',
    habitaciones: propertyData.bedrooms,
    banos: propertyData.bathrooms,
    metros: propertyData.built_area,
    tipo: propertyData.category?.name || 'Apartamento',
    code: propertyData.code,
    is_project: propertyData.is_project,
    descripcion: cleanDescription(propertyData.description),
    amenidades: propertyData.amenities || [],
    caracteristicas: formatCharacteristics(propertyData),
    url: propertyData.slug_url,
    property_status: propertyData.property_status,
    delivery_date: propertyData.delivery_date,
    coordinates: {
      latitude: propertyData.location?.coordinates?.lat,
      longitude: propertyData.location?.coordinates?.lng
    },
    project_info: propertyData.is_project ? formatProjectInfo(propertyData) : null,
    project_badges: propertyData.project?.project_badges || [],
    reserva_desde: propertyData.project?.min_reservation?.formatted || null,
    isFormattedByProvider: true
  };
}

function formatAgentFromDetailAPI(agentData: any, referralInfo?: any) {
  console.log('👤 Formatting agent from detail API:', agentData?.name || 'No agent');
  
  // Si hay información de referido, priorizar esa
  if (referralInfo && referralInfo.was_used) {
    return {
      name: referralInfo.agent_name || 'Asesor CLIC',
      email: agentData?.email || '',
      phone: agentData?.phone || '',
      position: 'Asesor Inmobiliario Referido',
      profile_image: agentData?.profile_image || '/images/default-agent.jpg',
      is_referral_agent: true,
      referral_code: referralInfo.referral_code,
      rating: agentData?.rating || 4.8,
      whatsapp_link: formatWhatsAppLink(agentData?.phone || ''),
      display_phone: formatPhoneForDisplay(agentData?.phone || ''),
      biography: `Asesor especializado con código de referencia ${referralInfo.referral_code}`
    };
  }
  
  // Agent normal de la propiedad
  if (!agentData) {
    return getDefaultClicAgent();
  }
  
  return {
    name: agentData.name || 'Asesor CLIC',
    email: agentData.email || '',
    phone: agentData.phone || '',
    position: agentData.position || 'Asesor Inmobiliario',
    profile_image: agentData.profile_image || '/images/default-agent.jpg',
    is_referral_agent: agentData.is_referral_agent || false,
    referral_code: agentData.referral_code || '',
    rating: agentData.rating || 4.8,
    whatsapp_link: formatWhatsAppLink(agentData.phone || ''),
    display_phone: formatPhoneForDisplay(agentData.phone || ''),
    biography: agentData.biography || 'Especialista en propiedades de calidad en República Dominicana.'
  };
}

function formatSimilarProperties(similarProperties: any[]): any[] {
  if (!Array.isArray(similarProperties)) return [];
  
  return similarProperties.map(prop => ({
    id: prop.id,
    titulo: prop.title || prop.name,
    precio: prop.price || formatPrice(prop.sale_price || prop.rental_price, 'USD'),
    imagen: prop.image || prop.main_image_url || '/images/placeholder-property.jpg',
    sector: prop.location || formatLocation(prop),
    habitaciones: prop.bedrooms,
    banos: prop.bathrooms,
    metros: prop.area || prop.built_area,
    tipo: prop.type || prop.category?.name || 'Apartamento',
    url: prop.url || `/propiedad/${prop.id}`,
    is_project: prop.is_project || false,
    parking_spots: prop.parking_spots
  }));
}

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

function formatCharacteristics(propertyData: any): { [key: string]: string } {
  const characteristics: { [key: string]: string } = {};
  
  if (propertyData.built_area) {
    characteristics['Área Construida'] = `${propertyData.built_area} m²`;
  }
  
  if (propertyData.land_area) {
    characteristics['Área de Terreno'] = `${propertyData.land_area} m²`;
  }
  
  if (propertyData.parking_spots) {
    characteristics['Parqueos'] = propertyData.parking_spots.toString();
  }
  
  if (propertyData.property_status) {
    characteristics['Estado'] = propertyData.property_status;
  }
  
  if (propertyData.delivery_date) {
    characteristics['Fecha de Entrega'] = formatDate(propertyData.delivery_date);
  }
  
  return characteristics;
}

function formatProjectInfo(propertyData: any) {
  return {
    is_project: true,
    project_badges: propertyData.project?.project_badges || [],
    developer: propertyData.project?.developer || null,
    typologies: propertyData.project?.typologies || [],
    amenities: propertyData.project?.amenities || [],
    payment_plans: propertyData.project?.payment_plans || [],
    phases: propertyData.project?.phases || []
  };
}

function generatePropertySlug(propertyData: any): string {
  const name = propertyData.title || propertyData.name || 'propiedad';
  const code = propertyData.code || propertyData.id || Date.now();
  
  const slug = name
    .toLowerCase()
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
    
  return `${slug}-${code}`;
}

function cleanDescription(description: string): string {
  if (!description) return 'Descripción no disponible';
  
  return description
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPrice(amount: number, currency: string = 'USD'): string {
  if (!amount) return 'Precio a consultar';
  
  const symbol = currency === 'USD' ? 'US$' : 'RD$';
  return `${symbol}${amount.toLocaleString()}`;
}

function formatLocation(property: any): string {
  const parts = [
    property.sectors?.name,
    property.cities?.name
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : 'Ubicación no especificada';
}

function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
}

function formatPhoneForDisplay(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
}

function formatWhatsAppLink(phone: string): string {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  
  let whatsappNumber = cleaned;
  if (cleaned.length === 10) {
    whatsappNumber = '1' + cleaned;
  }
  
  return `https://wa.me/${whatsappNumber}`;
}

function generatePropertyDescription(property: any): string {
  const location = property.location?.full_address || 'República Dominicana';
  const price = property.formatted_price || 'precio a consultar';
  return `${property.title} en ${location}. ${property.bedrooms || 'N/A'} hab, ${property.bathrooms || 'N/A'} baños, ${price}.`;
}

function generateFallbackBreadcrumbs(segments: string[]) {
  const breadcrumbs = [{ name: 'Inicio', url: '/' }];
  
  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const name = segment.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    breadcrumbs.push({ name, url: currentPath });
  }
  
  return breadcrumbs;
}

function getDefaultClicAgent() {
  return {
    name: 'CLIC Inmobiliaria',
    email: 'info@clicinmobiliaria.com',
    phone: '+1-809-555-0100',
    position: 'Equipo Comercial',
    profile_image: '/images/clic-logo-agent.jpg',
    is_referral_agent: false,
    referral_code: '',
    rating: 4.9,
    whatsapp_link: 'https://wa.me/18095550100',
    display_phone: '(809) 555-0100',
    biography: 'Somos el equipo comercial de CLIC Inmobiliaria, especialistas en propiedades premium en República Dominicana.',
    is_default_clic: true
  };
}

function get404PropertyPageData() {
  return {
    type: '404',
    meta: {
      title: 'Propiedad no encontrada - CLIC Inmobiliaria',
      description: 'La propiedad que buscas no existe o ha sido movida.'
    }
  };
}