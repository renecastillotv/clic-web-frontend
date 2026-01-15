// src/data/processors/utilityProcessors.ts
// =====================================================
// FUNCIONES UTILITARIAS COMPARTIDAS
// =====================================================

import { CONTACT_DEFAULTS } from '../core/constants.js';

// =====================================================
// LIMPIEZA Y SANITIZACIÓN DE TEXTO
// =====================================================

export function cleanDescription(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[^\w\s\.,;:!?¿¡áéíóúüñÁÉÍÓÚÜÑ()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\.\s*([a-záéíóúüñ])/g, (match, letter) => '. ' + letter.toUpperCase())
    .trim();
}

export function sanitizeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/[^\w\s\.,;:!?¿¡áéíóúüñÁÉÍÓÚÜÑ()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatTitle(title: string): string {
  if (!title) return 'Propiedad sin nombre';
  
  return sanitizeText(title)
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// =====================================================
// FORMATEO DE CONTACTO
// =====================================================

export function formatWhatsApp(phone: string): string {
  if (!phone) return CONTACT_DEFAULTS.COMPANY_WHATSAPP;
  
  const cleaned = phone.replace(/\D/g, '');
  const number = cleaned.length === 10 ? '1' + cleaned : cleaned;
  return `https://wa.me/${number}`;
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return CONTACT_DEFAULTS.COMPANY_PHONE;
  
  // Limpiar y formatear número de teléfono
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    // Formato dominicano: (829) 555-0100
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // Formato internacional: +1 (829) 555-0100
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  
  return phone; // Retornar original si no coincide con formatos esperados
}

// =====================================================
// SLUG GENERATION
// =====================================================

export function createSlug(text: string): string {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .trim()
    .replace('apartamentos', 'apartamento')
    .replace('casas', 'casa')
    .replace('santo domingo este', 'santo-domingo-este')
    .replace('distrito nacional', 'distrito-nacional')
    .replace('ciudad juan bosch', 'ciudad-juan-bosch')
    .replace('autopista las americas', 'autopista-las-americas')
    .replace('punta cana', 'punta-cana')
    .replace('la altagracia', 'la-altagracia')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// =====================================================
// FORMATEO DE PRECIOS
// =====================================================

export function formatPrice(price: any): string {
  if (!price) return 'Precio a consultar';
  
  if (typeof price === 'object' && price.formatted) {
    return price.formatted;
  }
  
  if (typeof price === 'string') {
    return price;
  }
  
  if (typeof price === 'number') {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  }
  
  return 'Precio a consultar';
}

// =====================================================
// PROCESAMIENTO DE AMENIDADES
// =====================================================

export function formatAmenities(amenitiesData: any[]): Array<{name: string; icon: string}> {
  if (!amenitiesData || amenitiesData.length === 0) {
    return [];
  }
  
  const formatted = amenitiesData.map(amenity => ({
    name: sanitizeText(amenity.amenities?.name || amenity.name || ''),
    icon: amenity.amenities?.icon || amenity.icon || 'fas fa-check'
  })).filter(amenity => amenity.name);
  
  return formatted;
}

// =====================================================
// PROCESAMIENTO DE IMÁGENES
// =====================================================

export function formatImagesArray(images: any[]): string[] {
  if (!images || images.length === 0) {
    return ['/images/placeholder-property.jpg'];
  }
  
  const processedImages = [];
  
  for (const img of images) {
    if (!img || !img.url) continue;
    
    if (img.url.includes(',')) {
      const urls = img.url.split(',').filter(Boolean);
      urls.forEach(url => {
        if (url.trim()) {
          processedImages.push({
            ...img,
            url: url.trim(),
            optimized_url: url.trim()
          });
        }
      });
    } else {
      processedImages.push(img);
    }
  }
  
  const uniqueImages = processedImages.filter((img, index, self) => 
    index === self.findIndex(i => i.url === img.url)
  );
  
  return uniqueImages
    .sort((a, b) => {
      if (a.is_main && !b.is_main) return -1;
      if (!a.is_main && b.is_main) return 1;
      return (a.sort_order || a.position || 0) - (b.sort_order || b.position || 0);
    })
    .map(img => img.optimized_url || img.url)
    .filter(Boolean)
    .slice(0, 50);
}

export function getMainImage(images: any[]): string {
  if (!images || images.length === 0) {
    return '/images/placeholder-property.jpg';
  }
  
  const processedImages = [];
  
  for (const img of images) {
    if (!img || !img.url) continue;
    
    if (img.url.includes(',')) {
      const urls = img.url.split(',').filter(Boolean);
      if (urls.length > 0) {
        processedImages.push({
          ...img,
          url: urls[0].trim(),
          optimized_url: urls[0].trim()
        });
      }
    } else {
      processedImages.push(img);
    }
  }
  
  const mainImg = processedImages.find(img => img.is_main);
  if (mainImg) {
    return mainImg.optimized_url || mainImg.url;
  }
  
  const firstImg = processedImages[0];
  if (firstImg) {
    return firstImg.optimized_url || firstImg.url;
  }
  
  return '/images/placeholder-property.jpg';
}

// =====================================================
// GENERACIÓN DE TEXTO DESCRIPTIVO
// =====================================================

export function generateSubtitle(property: any): string {
  const location = formatLocation(property);
  const type = sanitizeText(property.property_categories?.name || 'Propiedad');
  return `${type} en ${location}`;
}

function formatLocation(property: any): string {
  const parts = [
    sanitizeText(property.sectors?.name || ''),
    sanitizeText(property.cities?.name || '')
  ].filter(Boolean);
  
  return parts.length > 0 ? parts.join(', ') : 'República Dominicana';
}

// =====================================================
// VALIDACIONES
// =====================================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return phoneRegex.test(cleaned);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}