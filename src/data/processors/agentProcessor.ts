// src/data/processors/agentProcessor.ts
// =====================================================
// PROCESAMIENTO DE ASESORES
// =====================================================

import type { AgentData, ProcessedAgent } from '../types/interfaces.js';
import { sanitizeText, cleanDescription, formatWhatsApp, formatTitle } from './utilityProcessors.js';
import { CONTACT_DEFAULTS, IMAGE_DEFAULTS } from '../core/constants.js';

// =====================================================
// FORMATEO PRINCIPAL DE ASESOR
// =====================================================

export function formatAgent(agentData: AgentData | null | undefined): ProcessedAgent {
  console.log('👤 Formateando datos del asesor:', {
    hasAgent: !!agentData,
    agentName: agentData?.name,
    hasLanguages: !!agentData?.languages,
    languagesType: typeof agentData?.languages,
    languagesValue: agentData?.languages
  });

  if (!agentData) {
    return getDefaultAgent();
  }
  
  return {
    // Información básica
    name: sanitizeText(agentData.name || CONTACT_DEFAULTS.COMPANY_NAME),
    phone: agentData.phone || CONTACT_DEFAULTS.COMPANY_PHONE,
    email: agentData.email || CONTACT_DEFAULTS.COMPANY_EMAIL,
    position: sanitizeText(agentData.position || 'Asesor Inmobiliario'),
    whatsapp: formatWhatsApp(agentData.phone),
    
    // Imágenes y visuales
    image: agentData.profile_photo_url || agentData.image || IMAGE_DEFAULTS.PLACEHOLDER_AGENT,
    profile_photo_url: agentData.profile_photo_url || IMAGE_DEFAULTS.PLACEHOLDER_AGENT,
    
    // Información profesional
    rating: agentData.rating || 4.9,
    code: agentData.external_id || agentData.code || 'AGENT001',
    years_experience: agentData.years_experience || 0,
    specialty_description: sanitizeText(agentData.specialty_description || ''),
    
    // Idiomas procesados como array
    languages: processLanguages(agentData.languages),
    
    // Descripción y biografía
    biography: cleanDescription(agentData.biography || ''),
    
    // Información adicional
    slug: agentData.slug,
    
    // Redes sociales completas
    social: {
      facebook: agentData.social?.facebook || null,
      instagram: agentData.social?.instagram || null,
      twitter: agentData.social?.twitter || null,
      linkedin: agentData.social?.linkedin || null,
      youtube: agentData.social?.youtube || null
    },
    
    // Campos administrativos adicionales
    active: agentData.active,
    show_on_website: agentData.show_on_website,
    team_id: agentData.team_id,
    user_type: agentData.user_type,
    agent_type: agentData.agent_type || 'agent'
  };
}

// =====================================================
// PROCESAMIENTO DE IDIOMAS
// =====================================================

function processLanguages(languages: string | string[] | undefined): string[] {
  let processedLanguages = ['Español']; // Default
  
  if (languages) {
    try {
      if (typeof languages === 'string') {
        // Si es un string, intentar parsearlo como JSON
        if (languages.startsWith('[') && languages.endsWith(']')) {
          processedLanguages = JSON.parse(languages);
        } else {
          // Si es un string simple, dividir por comas
          processedLanguages = languages.split(',').map((lang: string) => lang.trim());
        }
      } else if (Array.isArray(languages)) {
        // Si ya es un array, usarlo directamente
        processedLanguages = languages;
      }
    } catch (error) {
      console.warn('Error procesando idiomas del asesor:', error);
      processedLanguages = ['Español'];
    }
  }

  console.log('✅ Idiomas procesados:', processedLanguages);
  return processedLanguages;
}

// =====================================================
// AGENTE POR DEFECTO
// =====================================================

function getDefaultAgent(): ProcessedAgent {
  return {
    name: CONTACT_DEFAULTS.COMPANY_NAME,
    phone: CONTACT_DEFAULTS.COMPANY_PHONE,
    email: CONTACT_DEFAULTS.COMPANY_EMAIL,
    position: 'Equipo Comercial',
    whatsapp: CONTACT_DEFAULTS.COMPANY_WHATSAPP,
    image: IMAGE_DEFAULTS.PLACEHOLDER_AGENT,
    rating: 4.9,
    code: 'CLIC001',
    profile_photo_url: IMAGE_DEFAULTS.PLACEHOLDER_AGENT,
    years_experience: 5,
    specialty_description: 'Asesor inmobiliario especializado en propiedades residenciales',
    languages: ['Español'],
    biography: 'Asesor inmobiliario con experiencia en el mercado dominicano',
    social: {
      facebook: null,
      instagram: null,
      twitter: null,
      linkedin: null,
      youtube: null
    }
  };
}

// =====================================================
// PROCESAMIENTO DE PROPIEDADES DEL ASESOR
// =====================================================

export function processAgentProperties(apiAgentProperties: any[] | undefined): any[] {
  console.log('👤 === PROCESANDO PROPIEDADES DEL ASESOR ===');
  console.log('📊 API agent properties recibidas:', apiAgentProperties?.length || 0);

  if (!apiAgentProperties || apiAgentProperties.length === 0) {
    console.log('⚠️ No hay propiedades del asesor de la API');
    return [];
  }

  const processedAgentProperties = apiAgentProperties.map((property, index) => ({
    id: property.id,
    slug: property.url || `/propiedad/${property.id}`,
    titulo: formatTitle(property.title || 'Propiedad sin nombre'),
    precio: property.price || 'Precio a consultar',
    imagen: property.image || IMAGE_DEFAULTS.PLACEHOLDER_PROPERTY,
    imagenes: [property.image || IMAGE_DEFAULTS.PLACEHOLDER_PROPERTY],
    sector: sanitizeText(property.location || ''),
    habitaciones: property.bedrooms || 0,
    banos: property.bathrooms || 0,
    metros: property.area || 0,
    tipo: sanitizeText(property.type || 'Apartamento'),
    url: property.url || `/propiedad/${property.id}`,
    code: `AG-${property.id}`,
    isFormattedByProvider: true,
    is_project: property.is_project || false,
    parking_spots: property.parking_spots || 0,
    agent_property_rank: index + 1,
    is_agent_property: true,
    source: 'agent_properties',
    coordinates: property.location?.coordinates || null,
    hasCoordinates: !!(property.location?.coordinates)
  }));

  console.log('✅ Propiedades del asesor procesadas:', processedAgentProperties.length);
  return processedAgentProperties;
}

export function generateAgentPropertiesInfo(apiAgentPropertiesInfo: any, agentProperties: any[]): any {
  return {
    total_found: agentProperties.length,
    agent_id: apiAgentPropertiesInfo?.agent_id || null,
    excluded_property: apiAgentPropertiesInfo?.excluded_property || null,
    has_agent_properties: agentProperties.length > 0,
    purpose: apiAgentPropertiesInfo?.purpose || 'agent_showcase',
    display_limit: Math.min(agentProperties.length, 6),
    provider_processed: true
  };
}

// =====================================================
// FUNCIONES DE VALIDACIÓN DE ASESOR
// =====================================================

export function validateAgentData(agentData: any): boolean {
  if (!agentData) return false;
  
  // Validaciones básicas
  if (!agentData.name || agentData.name.trim().length === 0) {
    console.warn('⚠️ Asesor sin nombre válido');
    return false;
  }
  
  if (agentData.email && !isValidEmail(agentData.email)) {
    console.warn('⚠️ Email de asesor inválido:', agentData.email);
  }
  
  if (agentData.phone && !isValidPhoneNumber(agentData.phone)) {
    console.warn('⚠️ Teléfono de asesor inválido:', agentData.phone);
  }
  
  return true;
}

// Funciones auxiliares de validación
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleaned);
}

// =====================================================
// GENERACIÓN DE ESTADÍSTICAS DEL ASESOR
// =====================================================

export function generateAgentStats(agentData: any, properties: any[] = []): any {
  return {
    totalProperties: properties.length || agentData?.total_properties || 0,
    propertiesSold: agentData?.properties_sold || 0,
    clientSatisfaction: agentData?.rating || 4.9,
    avgResponseTime: agentData?.avg_response_time || '< 2 horas',
    experienceYears: agentData?.years_experience || 0,
    specialties: agentData?.specialties || [],
    languages: processLanguages(agentData?.languages),
    activeListings: properties.filter(p => !p.is_sold).length,
    soldThisYear: agentData?.sold_this_year || 0
  };
}