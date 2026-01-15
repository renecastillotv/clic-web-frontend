// src/data/processors/seoProcessor.ts
// =====================================================
// PROCESADOR SEO ULTRA-AGRESIVO PARA POSICIONAMIENTO
// =====================================================

import { sanitizeText, cleanDescription, formatPrice } from './utilityProcessors.js';

// =====================================================
// GENERADOR DE CONTENIDO SEO CONTEXTUAL INTELIGENTE
// =====================================================

export function generateSEOContent(searchData: any, properties: any[], locationData: any): any {
  const location = searchData.location;
  const propertyType = searchData.propertyType;
  const operation = searchData.operation || 'Comprar';
  const totalProperties = properties.length;
  
  console.log('🎯 === GENERANDO CONTENIDO SEO ULTRA-AGRESIVO ===');
  console.log('📊 Contexto:', { location, propertyType, operation, totalProperties });

  // Calcular estadísticas de propiedades para contenido dinámico
  const priceStats = calculatePriceStatistics(properties);
  const typeDistribution = calculateTypeDistribution(properties);
  
  return {
    // Secciones específicas por tipo de búsqueda
    featuredCollections: generateFeaturedCollections(location, propertyType, properties),
    priceRangeGuides: generatePriceRangeGuides(location, propertyType, priceStats),
    neighborhoodGuides: generateNeighborhoodGuides(location, propertyType),
    investmentAnalysis: generateInvestmentAnalysis(location, propertyType, priceStats),
    buyingGuides: generateBuyingGuides(location, propertyType),
    agentRecommendations: generateAgentContent(location, propertyType),
    
    // Long-tail keywords específicos
    longTailContent: generateLongTailContent(location, propertyType, operation, priceStats),
    
    // FAQs ultra-específicos
    specificFAQs: generateSpecificFAQs(location, propertyType, operation, priceStats),
    
    // Meta data optimizada
    seoMetadata: generateAdvancedSEOMetadata(location, propertyType, operation, totalProperties, priceStats)
  };
}

// =====================================================
// COLECCIONES DESTACADAS (LISTAS ESPECÍFICAS)
// =====================================================

function generateFeaturedCollections(location: string, propertyType: string, properties: any[]): any[] {
  const collections = [];
  
  // 1. Propiedades Listas para Mudarse
  const readyProperties = properties.filter(p => !p.is_project);
  if (readyProperties.length > 0) {
    collections.push({
      id: 'ready-to-move',
      title: `${propertyType || 'Propiedades'} Listas para Mudarse en ${location}`,
      subtitle: `${readyProperties.length} opciones disponibles para entrega inmediata`,
      description: `Descubre nuestra selección de ${propertyType?.toLowerCase() || 'propiedades'} listas para mudarse en ${location}. Sin esperas, sin construcción, listo para ti.`,
      keywords: [`${propertyType} listo ${location}`, `mudarse inmediato ${location}`, `entrega inmediata ${location}`],
      properties: readyProperties.slice(0, 6),
      totalCount: readyProperties.length,
      badges: ['Entrega Inmediata', 'Listo para Mudarse', 'Sin Esperas'],
      icon: 'fas fa-key',
      color: 'green'
    });
  }

  // 2. Propiedades en Construcción/Proyectos
  const projectProperties = properties.filter(p => p.is_project);
  if (projectProperties.length > 0) {
    collections.push({
      id: 'under-construction',
      title: `${propertyType || 'Propiedades'} en Construcción en ${location}`,
      subtitle: `${projectProperties.length} proyectos con precios de preventa`,
      description: `Invierte en el futuro con nuestra selección de ${propertyType?.toLowerCase() || 'propiedades'} en construcción en ${location}. Precios de preventa y facilidades de pago.`,
      keywords: [`${propertyType} construcción ${location}`, `preventa ${location}`, `proyecto ${location}`],
      properties: projectProperties.slice(0, 6),
      totalCount: projectProperties.length,
      badges: ['En Construcción', 'Precio Preventa', 'Bono Vivienda'],
      icon: 'fas fa-hard-hat',
      color: 'blue'
    });
  }

  // 3. Propiedades de Lujo
  const luxuryProperties = properties.filter(p => 
    p.precio?.includes('millón') || 
    p.precio?.includes('USD') ||
    p.metros > 200 ||
    p.habitaciones >= 4
  );
  if (luxuryProperties.length > 0) {
    collections.push({
      id: 'luxury',
      title: `${propertyType || 'Propiedades'} de Lujo en ${location}`,
      subtitle: `${luxuryProperties.length} opciones premium disponibles`,
      description: `Selección exclusiva de ${propertyType?.toLowerCase() || 'propiedades'} de lujo en ${location}. Espacios amplios, ubicaciones premium y acabados de primera.`,
      keywords: [`${propertyType} lujo ${location}`, `premium ${location}`, `exclusivo ${location}`],
      properties: luxuryProperties.slice(0, 6),
      totalCount: luxuryProperties.length,
      badges: ['Lujo', 'Premium', 'Exclusivo'],
      icon: 'fas fa-crown',
      color: 'purple'
    });
  }

  // 4. Propiedades Económicas
  const affordableProperties = properties.filter(p => 
    !p.precio?.includes('millón') && 
    !p.precio?.includes('USD') &&
    p.metros < 120
  );
  if (affordableProperties.length > 0) {
    collections.push({
      id: 'affordable',
      title: `${propertyType || 'Propiedades'} Económicas en ${location}`,
      subtitle: `${affordableProperties.length} opciones accesibles con financiamiento`,
      description: `Encuentra tu hogar ideal con nuestra selección de ${propertyType?.toLowerCase() || 'propiedades'} económicas en ${location}. Precios accesibles y opciones de financiamiento.`,
      keywords: [`${propertyType} económico ${location}`, `barato ${location}`, `accesible ${location}`],
      properties: affordableProperties.slice(0, 6),
      totalCount: affordableProperties.length,
      badges: ['Económico', 'Accesible', 'Financiamiento'],
      icon: 'fas fa-piggy-bank',
      color: 'emerald'
    });
  }

  // 5. Propiedades con Piscina
  const poolProperties = properties.filter(p => 
    p.amenities?.some(a => a.name?.toLowerCase().includes('piscina')) ||
    p.description?.toLowerCase().includes('piscina')
  );
  if (poolProperties.length > 0) {
    collections.push({
      id: 'with-pool',
      title: `${propertyType || 'Propiedades'} con Piscina en ${location}`,
      subtitle: `${poolProperties.length} propiedades con áreas recreativas`,
      description: `Disfruta del verano con nuestra selección de ${propertyType?.toLowerCase() || 'propiedades'} con piscina en ${location}. Ideal para familias y entretenimiento.`,
      keywords: [`${propertyType} piscina ${location}`, `alberca ${location}`, `recreativo ${location}`],
      properties: poolProperties.slice(0, 6),
      totalCount: poolProperties.length,
      badges: ['Con Piscina', 'Recreativo', 'Familiar'],
      icon: 'fas fa-swimming-pool',
      color: 'cyan'
    });
  }

  console.log('✅ Colecciones generadas:', collections.length);
  return collections;
}

// =====================================================
// GUÍAS DE PRECIOS POR RANGO
// =====================================================

function generatePriceRangeGuides(location: string, propertyType: string, priceStats: any): any[] {
  const guides = [];
  
  guides.push({
    id: 'budget-guide',
    title: `Guía de Precios: ${propertyType || 'Propiedades'} en ${location} 2024`,
    content: `
      <h3>Análisis de Precios por Zona en ${location}</h3>
      <p>El mercado de ${propertyType?.toLowerCase() || 'propiedades'} en ${location} presenta una gran variedad de opciones para todos los presupuestos.</p>
      
      <h4>Rangos de Precios Promedio</h4>
      <ul>
        <li><strong>Económicas:</strong> RD$2.5M - RD$4.5M - Ideal para primera vivienda</li>
        <li><strong>Clase Media:</strong> RD$4.5M - RD$8M - Excelente relación precio-calidad</li>
        <li><strong>Premium:</strong> RD$8M - RD$15M - Ubicaciones privilegiadas</li>
        <li><strong>Lujo:</strong> RD$15M+ - Propiedades exclusivas</li>
      </ul>
      
      <h4>Factores que Influyen en el Precio</h4>
      <p>Los precios en ${location} varían según la ubicación específica, cercanía a servicios, año de construcción y amenidades disponibles.</p>
      
      <h4>Tendencias del Mercado 2024</h4>
      <p>El mercado inmobiliario en ${location} muestra estabilidad con perspectivas de crecimiento moderado. Es un momento favorable para inversores y compradores.</p>
    `,
    keywords: [`precios ${propertyType} ${location}`, `costo ${location}`, `presupuesto ${location}`],
    avgPrice: priceStats.average,
    minPrice: priceStats.min,
    maxPrice: priceStats.max
  });

  return guides;
}

// =====================================================
// GUÍAS DE BARRIOS
// =====================================================

function generateNeighborhoodGuides(location: string, propertyType: string): any[] {
  const guides = [];
  
  // Generar guías específicas según la ubicación
  if (location?.toLowerCase().includes('santo domingo este')) {
    guides.push({
      id: 'sde-guide',
      title: `Guía Completa: Vivir en Santo Domingo Este`,
      content: `
        <h3>¿Por Qué Elegir Santo Domingo Este?</h3>
        <p>Santo Domingo Este se ha consolidado como una de las zonas de mayor crecimiento inmobiliario en la capital dominicana.</p>
        
        <h4>Principales Sectores</h4>
        <ul>
          <li><strong>Ozama:</strong> En desarrollo, precios accesibles</li>
          <li><strong>San Isidro:</strong> Consolidado, cerca del aeropuerto</li>
          <li><strong>Boca Chica:</strong> Turístico, frente al mar</li>
          <li><strong>Villa Mella:</strong> Tradicional, bien conectado</li>
        </ul>
        
        <h4>Conectividad y Transporte</h4>
        <p>Excelente acceso al Metro, autopistas principales y cercanía al Aeropuerto Internacional de las Américas.</p>
        
        <h4>Servicios y Amenidades</h4>
        <p>Centros comerciales, hospitales, universidades y áreas recreativas en constante desarrollo.</p>
      `,
      keywords: ['vivir santo domingo este', 'sectores santo domingo este', 'conectividad santo domingo este']
    });
  }

  return guides;
}

// =====================================================
// ANÁLISIS DE INVERSIÓN
// =====================================================

function generateInvestmentAnalysis(location: string, propertyType: string, priceStats: any): any {
  return {
    id: 'investment-analysis',
    title: `Análisis de Inversión: ${propertyType || 'Propiedades'} en ${location}`,
    content: `
      <h3>Perspectivas de Inversión en ${location}</h3>
      <p>Invertir en ${propertyType?.toLowerCase() || 'propiedades'} en ${location} ofrece excelentes oportunidades de retorno y valorización.</p>
      
      <h4>Rentabilidad Estimada</h4>
      <ul>
        <li><strong>Alquiler Residencial:</strong> 8-12% anual</li>
        <li><strong>Valorización:</strong> 5-8% anual</li>
        <li><strong>Alquiler Vacacional:</strong> 15-20% anual (zonas turísticas)</li>
      </ul>
      
      <h4>Ventajas de Invertir</h4>
      <ul>
        <li>Ubicación estratégica con alta demanda</li>
        <li>Infraestructura en desarrollo continuo</li>
        <li>Mercado rental activo</li>
        <li>Potencial turístico</li>
      </ul>
      
      <h4>Recomendaciones</h4>
      <p>Para inversionistas novatos recomendamos propiedades en sectores consolidados. Para inversores experimentados, los nuevos desarrollos ofrecen mayor potencial.</p>
    `,
    keywords: [`inversión ${propertyType} ${location}`, `rentabilidad ${location}`, `ROI ${location}`],
    averagePrice: priceStats.average,
    expectedROI: '8-12%',
    appreciation: '5-8%'
  };
}

// =====================================================
// LONG-TAIL KEYWORDS ULTRA-ESPECÍFICOS
// =====================================================

function generateLongTailContent(location: string, propertyType: string, operation: string, priceStats: any): any[] {
  const longTailContent = [];
  
  // Generar contenido para keywords específicos
  const longTailKeywords = [
    `${propertyType} barato en ${location}`,
    `${propertyType} de lujo en ${location}`,
    `${propertyType} con piscina en ${location}`,
    `${propertyType} listo para mudarse en ${location}`,
    `${propertyType} en construcción en ${location}`,
    `${propertyType} con financiamiento en ${location}`,
    `${propertyType} primera vivienda en ${location}`,
    `${propertyType} para inversión en ${location}`,
    `mejores ${propertyType} en ${location}`,
    `${propertyType} nuevos en ${location}`
  ];

  longTailKeywords.forEach((keyword, index) => {
    longTailContent.push({
      id: `longtail-${index}`,
      keyword: keyword,
      title: `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} - Guía 2024`,
      content: generateKeywordSpecificContent(keyword, location, propertyType, priceStats),
      searchVolume: 'medium',
      competition: 'low',
      priority: index < 5 ? 'high' : 'medium'
    });
  });

  return longTailContent;
}

function generateKeywordSpecificContent(keyword: string, location: string, propertyType: string, priceStats: any): string {
  if (keyword.includes('barato') || keyword.includes('económico')) {
    return `
      <h3>Las Mejores Opciones Económicas en ${location}</h3>
      <p>Encuentra ${propertyType?.toLowerCase()} económicos en ${location} sin sacrificar calidad. Nuestra selección incluye propiedades desde RD$2.5M con excelente ubicación y acabados.</p>
      
      <h4>Sectores con Mejores Precios</h4>
      <ul>
        <li>Zonas en desarrollo con alto potencial</li>
        <li>Proyectos con promociones especiales</li>
        <li>Propiedades con financiamiento del desarrollador</li>
      </ul>
      
      <h4>Opciones de Financiamiento</h4>
      <p>Accede al Bono Primera Vivienda y financia hasta 80% del valor. Cuotas desde RD$15,000 mensuales.</p>
    `;
  }
  
  if (keyword.includes('lujo') || keyword.includes('premium')) {
    return `
      <h3>Propiedades de Lujo Exclusivas en ${location}</h3>
      <p>Descubre nuestra colección premium de ${propertyType?.toLowerCase()} de lujo en ${location}. Espacios únicos, ubicaciones privilegiadas y acabados de primera.</p>
      
      <h4>Características Exclusivas</h4>
      <ul>
        <li>Espacios amplios desde 200m²</li>
        <li>Ubicaciones premium con vista panorámica</li>
        <li>Amenidades de resort: piscina, gym, salón social</li>
        <li>Seguridad 24/7 y estacionamiento privado</li>
      </ul>
      
      <h4>Servicios VIP</h4>
      <p>Atención personalizada, tours privados y asesoría especializada en propiedades de lujo.</p>
    `;
  }
  
  // Contenido genérico para otros keywords
  return `
    <h3>Tu Búsqueda: ${keyword}</h3>
    <p>Encuentra exactamente lo que buscas en ${location}. Nuestra selección de ${propertyType?.toLowerCase()} está cuidadosamente curada para satisfacer tus necesidades específicas.</p>
    
    <h4>¿Por qué elegir ${location}?</h4>
    <ul>
      <li>Ubicación estratégica y bien conectada</li>
      <li>Crecimiento sostenido del sector inmobiliario</li>
      <li>Amplia oferta de servicios y entretenimiento</li>
      <li>Comunidad establecida y segura</li>
    </ul>
    
    <h4>Proceso Simplificado</h4>
    <p>Te acompañamos desde la búsqueda hasta la entrega de llaves. Financiamiento, asesoría legal y gestión completa incluida.</p>
  `;
}

// =====================================================
// FAQs ULTRA-ESPECÍFICOS
// =====================================================

function generateSpecificFAQs(location: string, propertyType: string, operation: string, priceStats: any): any[] {
  return [
    {
      question: `¿Cuál es el precio promedio de ${propertyType?.toLowerCase()} en ${location}?`,
      answer: `El precio promedio de ${propertyType?.toLowerCase()} en ${location} varía entre RD$3M y RD$8M, dependiendo de la ubicación específica, tamaño y amenidades. Las propiedades en sectores premium pueden alcanzar precios superiores a RD$12M.`
    },
    {
      question: `¿Qué documentos necesito para comprar en ${location}?`,
      answer: `Para comprar en ${location} necesitas: cédula de identidad, comprobantes de ingresos (últimos 3 meses), carta laboral, referencia bancaria, y declaración jurada de patrimonio. Si usas financiamiento bancario, se requieren documentos adicionales.`
    },
    {
      question: `¿Hay ${propertyType?.toLowerCase()} con Bono Primera Vivienda en ${location}?`,
      answer: `Sí, tenemos múltiples ${propertyType?.toLowerCase()} en ${location} que califican para el Bono Primera Vivienda. Este subsidio puede cubrir hasta RD$300,000 del valor de la propiedad, reduciendo significativamente tu inversión inicial.`
    },
    {
      question: `¿Cuáles son los mejores sectores para comprar en ${location}?`,
      answer: `Los sectores más recomendados en ${location} incluyen zonas consolidadas con servicios completos, sectores en desarrollo con alto potencial de valorización, y áreas cerca de centros comerciales y vías principales.`
    },
    {
      question: `¿Ofrecen financiamiento directo del desarrollador en ${location}?`,
      answer: `Varios desarrolladores en ${location} ofrecen planes de financiamiento directo con iniciales desde 10% y plazos hasta 60 meses. Estas opciones son ideales para compradores que buscan mayor flexibilidad.`
    }
  ];
}

// =====================================================
// UTILIDADES DE CÁLCULO
// =====================================================

function calculatePriceStatistics(properties: any[]): any {
  const prices = properties
    .map(p => extractNumericPrice(p.precio))
    .filter(p => p > 0);
    
  if (prices.length === 0) {
    return { min: 0, max: 0, average: 0 };
  }
  
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    average: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
  };
}

function calculateTypeDistribution(properties: any[]): any {
  const distribution = {};
  properties.forEach(p => {
    const type = p.tipo || 'Apartamento';
    distribution[type] = (distribution[type] || 0) + 1;
  });
  return distribution;
}

function extractNumericPrice(priceString: string): number {
  if (!priceString) return 0;
  
  const match = priceString.match(/[\d,]+/);
  if (!match) return 0;
  
  const numStr = match[0].replace(/,/g, '');
  return parseInt(numStr) || 0;
}

// =====================================================
// CONTENIDO DE ASESORES
// =====================================================

function generateAgentContent(location: string, propertyType: string): any {
  return {
    id: 'agents-section',
    title: `Asesores Especializados en ${location}`,
    content: `
      <h3>Equipo Experto en ${location}</h3>
      <p>Nuestros asesores especializados en ${location} conocen cada detalle del mercado local. Con años de experiencia y deep knowledge de la zona.</p>
      
      <h4>¿Por qué elegir nuestros asesores?</h4>
      <ul>
        <li><strong>Especialización local:</strong> Conocimiento profundo de ${location}</li>
        <li><strong>Asesoría integral:</strong> Desde búsqueda hasta entrega de llaves</li>
        <li><strong>Red de contactos:</strong> Acceso a propiedades exclusivas</li>
        <li><strong>Atención personalizada:</strong> Servicio 24/7 durante todo el proceso</li>
      </ul>
      
      <h4>Servicios Incluidos</h4>
      <p>Tours personalizados, análisis de mercado, gestión de financiamiento, asesoría legal, y seguimiento post-venta.</p>
    `,
    keywords: [`asesor inmobiliario ${location}`, `agente ${location}`, `consultor ${location}`]
  };
}

// =====================================================
// METADATA SEO AVANZADA
// =====================================================

function generateAdvancedSEOMetadata(location: string, propertyType: string, operation: string, totalProperties: number, priceStats: any): any {
  const baseTitle = `${propertyType || 'Propiedades'} en ${location}`;
  const priceRange = priceStats.average > 0 ? `desde RD$${(priceStats.min / 1000000).toFixed(1)}M` : '';
  
  return {
    title: `${baseTitle} ${priceRange} | ${totalProperties} Opciones Disponibles | CLIC Inmobiliaria`,
    description: `✅ ${totalProperties} ${propertyType?.toLowerCase() || 'propiedades'} en ${location} ${priceRange}. Financiamiento 80%, Bono Primera Vivienda, Tours Virtuales. ¡Encuentra tu hogar ideal hoy!`,
    keywords: [
      `${propertyType} ${location}`,
      `comprar ${propertyType} ${location}`,
      `${propertyType} baratos ${location}`,
      `${propertyType} lujo ${location}`,
      `financiamiento ${location}`,
      `bono primera vivienda ${location}`,
      `inmobiliaria ${location}`,
      `propiedades ${location} 2024`
    ],
    canonical: `/comprar/${propertyType?.toLowerCase()}/${location?.toLowerCase()}`,
    ogTitle: `🏠 ${totalProperties} ${propertyType || 'Propiedades'} en ${location} | Desde RD$${(priceStats.min / 1000000).toFixed(1)}M`,
    ogDescription: `Descubre las mejores ${propertyType?.toLowerCase() || 'propiedades'} en ${location}. Financiamiento hasta 80%, Bono Primera Vivienda disponible. ¡Tours virtuales gratis!`,
    schema: generateSchemaMarkup(location, propertyType, totalProperties, priceStats)
  };
}

function generateSchemaMarkup(location: string, propertyType: string, totalProperties: number, priceStats: any): any {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": `${propertyType || 'Propiedades'} en ${location}`,
    "description": `Listado completo de ${propertyType?.toLowerCase() || 'propiedades'} disponibles en ${location}`,
    "numberOfItems": totalProperties,
    "itemListElement": {
      "@type": "RealEstate",
      "name": `${propertyType || 'Propiedades'} en ${location}`,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": location,
        "addressCountry": "DO"
      },
      "priceRange": `RD$${(priceStats.min / 1000000).toFixed(1)}M - RD$${(priceStats.max / 1000000).toFixed(1)}M`,
      "provider": {
        "@type": "RealEstateAgent",
        "name": "CLIC Inmobiliaria",
        "url": "https://clicinmobiliaria.com",
        "telephone": "+1-829-555-0100"
      }
    }
  };
}