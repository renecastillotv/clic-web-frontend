// src/utils/iconHelper.js
// Helper completo para convertir nombres de Lucide a SVG paths para usar en Astro

// Mapeo completo de iconos de Lucide a sus SVG paths
const LUCIDE_ICONS = {
  // Navegación y UI
  'ChevronRight': '<path d="m9 18 6-6-6-6"/>',
  'ChevronDown': '<path d="m6 9 6 6 6-6"/>',
  'ChevronUp': '<path d="m18 15-6-6-6 6"/>',
  'X': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  'Plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
  'Check': '<path d="m9 12 2 2 4-4"/>',
  'ArrowRight': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  'ExternalLink': '<path d="M15 3h6v6"/><path d="m10 14 9-9"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  
  // Ubicación y mapas
  'MapPin': '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  'Navigation': '<polygon points="3,11 22,2 13,21 11,13"/>',
  'Globe': '<circle cx="12" cy="12" r="10"/><path d="m12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  'Map': '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="m9 3v15"/><path d="m15 6v15"/>',
  
  // Características de propiedades
  'Home': '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>',
  'Building': '<path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h20v-8a2 2 0 0 0-2-2h-2"/><path d="M10 6h0"/><path d="M10 10h0"/><path d="M10 14h0"/><path d="M14 6h0"/><path d="M14 10h0"/><path d="M14 14h0"/>',
  'Bed': '<path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4"/>',
  'Bath': '<path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><line x1="10" x2="8" y1="5" y2="7"/><line x1="2" x2="22" y1="12" y2="12"/><line x1="7" x2="7" y1="19" y2="21"/><line x1="17" x2="17" y1="19" y2="21"/>',
  'Car': '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.7 9H5.3L3.5 11.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2m0-7 1.3-2.9"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
  'Square': '<rect width="18" height="18" x="3" y="3" rx="2"/>',
  
  // Amenidades y servicios
  'Waves': '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  'Dumbbell': '<path d="m6.5 6.5 11 11"/><path d="m21 21-1-1"/><path d="m3 3 1 1"/><path d="m18 22 4-4"/><path d="m2 6 4-4"/><path d="m3 10 7-7"/><path d="m14 21 7-7"/>',
  'Shield': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  'Users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m22 21-3.3-3.3a4.8 4.8 0 0 0 0-6.4l3.3-3.3"/>',
  'TreePine': '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 3l4 4.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22V3"/>',
  'Camera': '<path d="m9 9 3-3 3 3"/><path d="m9 15 3 3 3-3"/><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><circle cx="12" cy="12" r="3"/>',
  'Wifi': '<path d="m12 20 8-8a16.47 16.47 0 0 0-16 0l8 8Z"/><path d="M16 16s3-2.5 3-6-3-6-3-6"/><path d="m8 16-3-3c1.5-2 4-3 6-3s4.5 1 6 3l-3 3"/><path d="M8 8s-3 2.5-3 6 3 6 3 6"/>',
  'Coffee': '<path d="M10 2v20"/><path d="M14 2v20"/><path d="M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M7 7h10"/><path d="M7 12h10"/>',
  
  // Comunicación y redes sociales
  'Phone': '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  'Mail': '<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>',
  'MessageCircle': '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  'Send': '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  'Copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  'Share': '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" x2="12" y1="2" y2="15"/>',
  
  // Multimedia y entretenimiento
  'Play': '<polygon points="6,3 20,12 6,21"/>',
  'Video': '<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>',
  'Image': '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  'Eye': '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  'EyeOff': '<path d="m15 18-.722-3.25"/><path d="M2 2l20 20"/><path d="m20 20-.722-3.25"/><path d="M6.71 6.71 2.12 2.12"/><path d="m17.29 17.29 4.59 4.59"/>',
  
  // Información y ayuda
  'Info': '<circle cx="12" cy="12" r="10"/><path d="m9 9h.01"/><path d="m9 15 3-3h3"/>',
  'AlertCircle': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  'HelpCircle': '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/>',
  'FileText': '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  
  // Tiempo y fechas
  'Clock': '<circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>',
  'Calendar': '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  
  // Finanzas
  'DollarSign': '<line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  'CreditCard': '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  'Calculator': '<rect width="16" height="20" x="4" y="2" rx="2"/><line x1="8" x2="16" y1="6" y2="6"/><line x1="16" x2="16" y1="14" y2="18"/><path d="m9 18 3-3 3 3-3 3Z"/>',
  'TrendingUp': '<polyline points="22,7 13.5,15.5 8.5,10.5 2,17"/><polyline points="16,7 22,7 22,13"/>',
  
  // Configuración y herramientas
  'Settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'Filter': '<polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>',
  'Search': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
  'Edit': '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  'Trash2': '<path d="m3 6 .5 14a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2L21 6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  'Save': '<path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h8"/>',
  
  // Otros iconos útiles
  'Star': '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>',
  'Heart': '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/>',
  'ThumbsUp': '<path d="M7 10v12"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h3.73a2 2 0 0 1 1.92 2.56z"/>',
  'Download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7,10 12,15 17,10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  'Upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17,8 12,3 7,8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  'Refresh': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  'ZoomIn': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="11" x2="11" y1="8" y2="14"/><line x1="8" x2="14" y1="11" y2="11"/>',
  'ZoomOut': '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><line x1="8" x2="14" y1="11" y2="11"/>',
  'Maximize': '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  'Minimize': '<path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>',
  
  // Fallback
  'Default': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>'
};

/**
 * Obtiene el SVG path de un icono de Lucide
 * @param {string} iconName - Nombre del icono (ej: 'Waves', 'Dumbbell')
 * @returns {string} - SVG paths del icono
 */
export function getLucideIconSVG(iconName) {
  return LUCIDE_ICONS[iconName] || LUCIDE_ICONS['Default'];
}

/**
 * Genera el SVG completo de un icono de Lucide
 * @param {string} iconName - Nombre del icono
 * @param {string} className - Clases CSS adicionales
 * @param {string} strokeWidth - Grosor del trazo (default: "2")
 * @returns {string} - SVG completo como string
 */
export function generateLucideIcon(iconName, className = 'w-4 h-4', strokeWidth = '2') {
  const paths = getLucideIconSVG(iconName);
  return `<svg class="${className}" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

/**
 * Convierte un icono de Font Awesome a Lucide (mapeo completo)
 * @param {string} faIcon - Clase de Font Awesome (ej: 'fas fa-swimming-pool')
 * @returns {string} - Nombre del icono equivalente en Lucide
 */
export function mapFontAwesomeToLucide(faIcon) {
  const faToLucideMap = {
    // Amenidades
    'fas fa-swimming-pool': 'Waves',
    'fas fa-dumbbell': 'Dumbbell',
    'fas fa-shield-alt': 'Shield',
    'fas fa-shield': 'Shield',
    'fas fa-car': 'Car',
    'fas fa-users': 'Users',
    'fas fa-tree': 'TreePine',
    'fas fa-camera': 'Camera',
    'fas fa-wifi': 'Wifi',
    'fas fa-coffee': 'Coffee',
    'fas fa-building': 'Building',
    
    // Características de propiedades
    'fas fa-home': 'Home',
    'fas fa-bed': 'Bed',
    'fas fa-bath': 'Bath',
    'fas fa-shower': 'Bath',
    'fas fa-car-side': 'Car',
    'fas fa-parking': 'Car',
    
    // UI y navegación
    'fas fa-chevron-right': 'ChevronRight',
    'fas fa-chevron-down': 'ChevronDown',
    'fas fa-chevron-up': 'ChevronUp',
    'fas fa-times': 'X',
    'fas fa-plus': 'Plus',
    'fas fa-check': 'Check',
    'fas fa-arrow-right': 'ArrowRight',
    'fas fa-external-link-alt': 'ExternalLink',
    
    // Ubicación
    'fas fa-map-marker-alt': 'MapPin',
    'fas fa-map-pin': 'MapPin',
    'fas fa-globe': 'Globe',
    'fas fa-map': 'Map',
    'fas fa-compass': 'Navigation',
    
    // Comunicación
    'fas fa-phone': 'Phone',
    'fas fa-phone-alt': 'Phone',
    'fas fa-envelope': 'Mail',
    'fas fa-comment': 'MessageCircle',
    'fas fa-paper-plane': 'Send',
    'fas fa-copy': 'Copy',
    'fas fa-share': 'Share',
    
    // Multimedia
    'fas fa-play': 'Play',
    'fas fa-video': 'Video',
    'fas fa-image': 'Image',
    'fas fa-photo': 'Image',
    'fas fa-eye': 'Eye',
    'fas fa-eye-slash': 'EyeOff',
    
    // Información
    'fas fa-info': 'Info',
    'fas fa-info-circle': 'Info',
    'fas fa-exclamation-circle': 'AlertCircle',
    'fas fa-question-circle': 'HelpCircle',
    'fas fa-file-alt': 'FileText',
    'fas fa-file-text': 'FileText',
    
    // Tiempo
    'fas fa-clock': 'Clock',
    'fas fa-calendar': 'Calendar',
    'fas fa-calendar-alt': 'Calendar',
    
    // Finanzas
    'fas fa-dollar-sign': 'DollarSign',
    'fas fa-credit-card': 'CreditCard',
    'fas fa-calculator': 'Calculator',
    'fas fa-chart-line': 'TrendingUp',
    
    // Herramientas
    'fas fa-cog': 'Settings',
    'fas fa-cogs': 'Settings',
    'fas fa-filter': 'Filter',
    'fas fa-search': 'Search',
    'fas fa-edit': 'Edit',
    'fas fa-trash': 'Trash2',
    'fas fa-trash-alt': 'Trash2',
    'fas fa-save': 'Save',
    
    // Otros
    'fas fa-star': 'Star',
    'fas fa-heart': 'Heart',
    'fas fa-thumbs-up': 'ThumbsUp',
    'fas fa-download': 'Download',
    'fas fa-upload': 'Upload',
    'fas fa-sync': 'Refresh',
    'fas fa-search-plus': 'ZoomIn',
    'fas fa-search-minus': 'ZoomOut',
    'fas fa-expand': 'Maximize',
    'fas fa-compress': 'Minimize'
  };
  
  return faToLucideMap[faIcon] || 'Default';
}

/**
 * Limpia y normaliza el nombre de un icono
 * @param {string} iconName - Nombre del icono
 * @returns {string} - Nombre limpio
 */
export function normalizeIconName(iconName) {
  if (!iconName || iconName === '') return 'Default';
  
  // Si es una clase de Font Awesome, convertir
  if (iconName.includes('fas ') || iconName.includes('fa-')) {
    return mapFontAwesomeToLucide(iconName);
  }
  
  // Si ya es un nombre de Lucide, limpiar
  const cleanName = iconName.replace(/[^a-zA-Z]/g, '');
  
  // Verificar si existe en nuestro mapeo
  return LUCIDE_ICONS[cleanName] ? cleanName : 'Default';
}

/**
 * Obtiene múltiples iconos como objeto
 * @param {string[]} iconNames - Array de nombres de iconos
 * @param {string} className - Clases CSS
 * @returns {Object} - Objeto con iconos como SVG strings
 */
export function generateMultipleIcons(iconNames, className = 'w-4 h-4') {
  const icons = {};
  iconNames.forEach(name => {
    icons[name] = generateLucideIcon(name, className);
  });
  return icons;
}

/**
 * Helper específico para generar iconos inline en Astro
 * @param {string} iconName - Nombre del icono
 * @param {string} className - Clases CSS
 * @returns {string} - HTML del icono listo para usar con set:html
 */
export function inlineIcon(iconName, className = 'w-4 h-4') {
  return generateLucideIcon(normalizeIconName(iconName), className);
}