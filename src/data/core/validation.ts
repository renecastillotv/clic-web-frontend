// src/data/core/validation.ts
// =====================================================
// VALIDACIONES CENTRALIZADAS
// =====================================================

import { VALIDATION_CONFIG } from './constants.js';

export function isValidPropertySegments(segments: string[]): boolean {
  if (!segments || segments.length === 0) return false;
  
  // Verificar si algún segmento es inválido
  for (const segment of segments) {
    const segmentLower = segment.toLowerCase();
    
    // Verificar segmentos inválidos
    if (VALIDATION_CONFIG.INVALID_SEGMENTS.includes(segmentLower)) {
      console.log('❌ Segmento inválido detectado:', segment);
      return false;
    }
    
    // Verificar extensiones de archivo
    if (VALIDATION_CONFIG.FILE_EXTENSIONS.some(ext => segmentLower.endsWith(ext))) {
      console.log('❌ Extensión de archivo detectada:', segment);
      return false;
    }
    
    // Verificar segmentos muy cortos o sospechosos
    if (segment.length < VALIDATION_CONFIG.MIN_SEGMENT_LENGTH && segments.length === 1) {
      console.log('❌ Segmento demasiado corto:', segment);
      return false;
    }
  }
  
  return true;
}

export function cleanUrlSegments(segments: string[]): string[] {
  if (!segments || segments.length === 0) return [];
  
  let cleaned = segments
    .filter(segment => segment && segment.trim().length > 0)
    .map(segment => {
      const withoutId = segment.replace(/-\d+$/, '');
      return withoutId || segment;
    });

  const seen = new Set();
  const duplicateWords = ['comprar', 'venta', 'alquilar', 'apartamento', 'casa', 'proyecto'];
  
  cleaned = cleaned.filter(segment => {
    const segmentLower = segment.toLowerCase();
    
    if (duplicateWords.includes(segmentLower)) {
      if (seen.has(segmentLower)) {
        return false;
      }
      seen.add(segmentLower);
    }
    
    return true;
  });
  
  if (!isValidPropertySegments(cleaned)) {
    console.log('❌ Segmentos inválidos después de limpieza:', cleaned);
    return [];
  }
  
  return cleaned;
}

export function validateSearchParams(searchParams: URLSearchParams): boolean {
  // Validaciones básicas de parámetros de búsqueda
  const page = searchParams.get('page');
  const limit = searchParams.get('limit');
  
  if (page && (isNaN(Number(page)) || Number(page) < 1)) {
    console.warn('⚠️ Parámetro page inválido:', page);
    return false;
  }
  
  if (limit && (isNaN(Number(limit)) || Number(limit) < 1 || Number(limit) > 100)) {
    console.warn('⚠️ Parámetro limit inválido:', limit);
    return false;
  }
  
  return true;
}

export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  
  return query
    .trim()
    .replace(/[<>\"']/g, '') // Remover caracteres peligrosos
    .replace(/\s+/g, ' ') // Normalizar espacios
    .substring(0, 100); // Limitar longitud
}