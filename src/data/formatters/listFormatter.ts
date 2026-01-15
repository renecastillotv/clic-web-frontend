// src/data/formatters/listFormatter.ts
// =====================================================
// FORMATEO DE LISTAS DE PROPIEDADES - VERSIÓN CORREGIDA
// =====================================================

import type { APIResponse, PropertyData } from '../types/interfaces.js';
import { processBreadcrumbs } from '../processors/contentProcessor.js';
import { extractGooglePlacesData, formatLocation } from '../processors/locationProcessor.js';
import { formatImagesArray, getMainImage, formatTitle, cleanDescription, sanitizeText } from '../processors/utilityProcessors.js';
import { SEO_DEFAULTS } from '../core/constants.js';

// ✅ FUNCIÓN DE NORMALIZACIÓN COMPARTIDA
function normalizeText(text: string): string {
    if (!text) return text;

    return text
        // Corregir plurales duplicados específicos
        .replace(/apartamentoss/gi, 'apartamentos')
        .replace(/apartamentoo/gi, 'apartamento')
        .replace(/casass/gi, 'casas')
        .replace(/casaa/gi, 'casa')
        .replace(/villass/gi, 'villas')
        .replace(/villaa/gi, 'villa')
        .replace(/proyectoss/gi, 'proyectos')
        .replace(/proyectoo/gi, 'proyecto')
        .replace(/propiedadess/gi, 'propiedades')
        .replace(/propiedadd/gi, 'propiedad')
        .replace(/localess/gi, 'locales')
        .replace(/locall/gi, 'local')
        .replace(/terrenoss/gi, 'terrenos')
        .replace(/terrenoo/gi, 'terreno')
        .replace(/penthousess/gi, 'penthouses')
        .replace(/penthousee/gi, 'penthouse')

        // Corregir operaciones duplicadas
        .replace(/comprarr/gi, 'comprar')
        .replace(/ventaa/gi, 'venta')
        .replace(/ventass/gi, 'ventas')
        .replace(/alquilerr/gi, 'alquiler')
        .replace(/alquileress/gi, 'alquileres')

        // Corregir ubicaciones comunes
        .replace(/santo\s+domingoo/gi, 'Santo Domingo')
        .replace(/punta\s+canaa/gi, 'Punta Cana')
        .replace(/santiagoo/gi, 'Santiago')

        // Limpiar espacios múltiples y trimear
        .replace(/\s+/g, ' ')
        .trim();
}

export function formatPropertyListResponse(apiData: APIResponse) {
    const searchResults = apiData.searchResults!;
    const properties = searchResults.properties || [];
    const pagination = searchResults.pagination || {};

    // ✅ USAR FAQs REALES DE LA API O ARRAY VACÍO - NO FALLBACKS
    const apiFAQs = extractRealFAQsFromAPI(apiData);

    return {
        type: 'property-list',
        properties: properties.map(formatPropertyForList),
        pagination: {
            currentPage: pagination.currentPage || 1,
            totalCount: pagination.totalCount || 0,
            itemsPerPage: pagination.itemsPerPage || 30,
            totalPages: pagination.totalPages || 1,
            hasMore: pagination.hasMore || false,
            hasNextPage: pagination.hasMore || false,
            hasPreviousPage: (pagination.currentPage || 1) > 1
        },
        search: {
            tags: searchResults.tags || [],
            location: extractLocationFromTags(searchResults.tags),
            propertyType: extractPropertyTypeFromTags(searchResults.tags),
            operation: extractOperationFromTags(searchResults.tags)
        },
        locationData: extractGooglePlacesData(apiData.seo),
        seo: {
            title: normalizeText(sanitizeText(apiData.seo?.title || SEO_DEFAULTS.DEFAULT_TITLE)),
            description: normalizeText(cleanDescription(apiData.seo?.description || SEO_DEFAULTS.DEFAULT_DESCRIPTION)),
            h1: normalizeText(sanitizeText(apiData.seo?.h1 || 'Propiedades Disponibles')),
            keywords: apiData.seo?.keywords || SEO_DEFAULTS.DEFAULT_KEYWORDS
        },
        content: {
            intro: generateIntroText(searchResults.tags),
            benefits: generateBenefits(searchResults.tags),
            nearbyServices: extractNearbyServices(apiData.seo),
            faqs: apiFAQs, // ✅ Solo FAQs reales, array vacío si no hay
            seoContent: apiData.relatedContent?.seo_content || [],
            hasTagRelatedContent: apiData.relatedContent?.content_source?.includes('tag_related') || false,
            contentHierarchy: apiData.relatedContent?.hierarchy_info || {
                specific_count: 0,
                tag_related_count: 0,
                default_count: 0
            }
        },
        breadcrumbs: processBreadcrumbs(apiData.breadcrumbs, null, 'list', searchResults.tags),
        relatedContent: {
            articles: apiData.relatedContent?.articles || [],
            videos: apiData.relatedContent?.videos || [],
            seo_content: apiData.relatedContent?.seo_content || [],
            faqs: apiFAQs, // ✅ AGREGAR FAQs REALES AQUÍ TAMBIÉN
            contentSource: apiData.relatedContent?.content_source || 'general_only'
        },
        meta: {
            timestamp: new Date().toISOString(),
            searchTerms: searchResults.tags?.map(t => sanitizeText(t.name)) || [],
            totalResults: pagination.totalCount || 0,
            hasBreadcrumbs: !!(apiData.breadcrumbs?.length),
            breadcrumbsSource: apiData.breadcrumbs?.length ? 'api' : 'fallback',
            hasContentHierarchy: !!(apiData.relatedContent?.hierarchy_info),
            contentHierarchyInfo: apiData.relatedContent?.hierarchy_info || null,
            tagRelatedContentUsed: apiData.meta?.tagRelatedContentUsed || false,
            seoContentCount: apiData.relatedContent?.seo_content?.length || 0,
            // ✅ AGREGAR METADATOS DE FAQs
            realFAQsCount: apiFAQs.length,
            faqsSource: apiFAQs.length > 0 ? 'api' : 'none', // ✅ 'none' no 'generated'
            // Metadatos de ubicación en listados
            propertiesWithCoordinates: properties.filter(p => p.locationData?.coordinates).length,
            totalProperties: properties.length,
            coordinatesSuccessRate: properties.length > 0 ?
                (properties.filter(p => p.locationData?.coordinates).length / properties.length * 100).toFixed(1) + '%' :
                '0%'
        }
    };
}

// ✅ FUNCIÓN MEJORADA: Extraer FAQs reales de la API con ordenamiento y límite
function extractRealFAQsFromAPI(apiData: APIResponse): Array<{ question: string; answer: string; id?: string; category?: string }> {
    const realFAQs: Array<{ question: string; answer: string; id?: string; category?: string; total_weight?: number; sort_order?: number; content_priority?: string }> = [];

    // Buscar en todas las posibles ubicaciones de FAQs en la API
    const possibleFAQLocations = [
        apiData.relatedContent?.faqs,
        apiData.content?.faqs,
        apiData.searchResults?.faqs,
        apiData.faqs,
        apiData.seo?.faqs,
        apiData.data?.faqs
    ];

    for (const faqSource of possibleFAQLocations) {
        if (faqSource && Array.isArray(faqSource) && faqSource.length > 0) {
            // Validar que sean FAQs reales (no hardcodeados)
            const validFAQs = faqSource.filter(faq => {
                // Verificar que tengan las propiedades básicas
                const hasBasicProps = faq.question && faq.answer;

                // Verificar que no sean los FAQs hardcodeados del sistema
                const hardcodedQuestions = [
                    '¿Cómo funciona el proceso de compra?',
                    '¿Qué incluye el Bono Primera Vivienda?',
                    '¿Ofrecen financiamiento?'
                ];

                const isNotHardcoded = !hardcodedQuestions.some(hardQ =>
                    faq.question && faq.question.trim() === hardQ.trim()
                );

                // Preferir FAQs con ID (indica que vienen de base de datos)
                const hasRealId = faq.id && typeof faq.id === 'string';

                return hasBasicProps && (isNotHardcoded || hasRealId);
            });

            // Transformar y agregar FAQs válidos
            validFAQs.forEach(faq => {
                realFAQs.push({
                    question: normalizeText(sanitizeText(faq.question)),
                    answer: normalizeText(cleanDescription(faq.answer)),
                    id: faq.id || `faq-${Date.now()}-${Math.random()}`,
                    category: faq.category || 'api',
                    total_weight: faq.total_weight || 0,
                    sort_order: faq.sort_order || 0,
                    content_priority: faq.content_priority || 'default'
                });
            });

            // Si encontramos FAQs reales, procesar y retornar los mejores
            if (realFAQs.length > 0) {
                console.log(`✅ [listFormatter] Encontrados ${realFAQs.length} FAQs reales de la API`);

                // ✅ ORDENAR POR RELEVANCIA
                const sortedFAQs = realFAQs.sort((a, b) => {
                    // 1. Prioridad: tag_related > default
                    const priorityA = a.content_priority === 'tag_related' ? 3 : 1;
                    const priorityB = b.content_priority === 'tag_related' ? 3 : 1;

                    if (priorityA !== priorityB) {
                        return priorityB - priorityA; // Mayor prioridad primero
                    }

                    // 2. Total weight (mayor peso primero)
                    if (a.total_weight !== b.total_weight) {
                        return (b.total_weight || 0) - (a.total_weight || 0);
                    }

                    // 3. Sort order (menor sort_order primero)
                    return (a.sort_order || 0) - (b.sort_order || 0);
                });

                // ✅ LIMITAR A 6 FAQs MÁXIMO
                const limitedFAQs = sortedFAQs.slice(0, 6);

                console.log(`📋 [listFormatter] Mostrando ${limitedFAQs.length} FAQs ordenados por relevancia:`,
                    limitedFAQs.map(f => `"${f.question.substring(0, 40)}..." (peso: ${f.total_weight}, prioridad: ${f.content_priority})`));

                // Limpiar propiedades internas antes de retornar
                return limitedFAQs.map(faq => ({
                    question: faq.question,
                    answer: faq.answer,
                    id: faq.id,
                    category: faq.category
                }));
            }
        }
    }

    console.log('❌ [listFormatter] No se encontraron FAQs reales en la API');
    return [];
}

function formatPropertyForList(property: PropertyData) {
    const pricing = property.pricing_unified || {};
    const images = property.images_unified || [];

    // ✅ SOLO usar slug_url si existe y es válido, sino null
    const validSlugUrl = property.slug_url &&
        typeof property.slug_url === 'string' &&
        property.slug_url.trim().length > 0 ?
        property.slug_url : null;

    return {
        id: property.id,
        slug: validSlugUrl, // Puede ser null si no hay slug válido
        titulo: formatTitle(property.name || 'Propiedad sin nombre'),
        precio: pricing.display_price?.formatted || 'Precio a consultar',
        imagen: getMainImage(images),
        imagenes: formatImagesArray(images),
        sector: formatLocation(property),
        habitaciones: property.bedrooms || 0,
        banos: property.bathrooms || 0,
        metros: property.built_area || 0,
        tipo: sanitizeText(property.property_categories?.name || 'Apartamento'),
        url: validSlugUrl, // ✅ Solo URL real o null - NO FALLBACKS HARDCODEADOS
        code: property.code,
        isFormattedByProvider: true,
        is_project: property.is_project || false,
        project_badges: property.is_project ? ['PROYECTO', 'BONO VIVIENDA'] : undefined,
        habitaciones_rango: property.is_project ? `${property.bedrooms || 1}-3 hab` : undefined,
        banos_rango: property.is_project ? `${property.bathrooms || 1}-3 baños` : undefined,
        metros_rango: property.is_project ? `${property.built_area || 60}-90m²` : undefined,
        reserva_desde: property.is_project ? 'US$1,000' : undefined,
        // Agregar coordenadas si están disponibles
        coordinates: property.location?.coordinates || null,
        hasCoordinates: !!(property.location?.coordinates),
        locationData: property.location || null,

        // ✅ METADATA PARA DEBUGGING
        hasValidUrl: !!validSlugUrl,
        urlStatus: validSlugUrl ? 'valid' : 'missing'
    };
}

function extractLocationFromTags(tags: any[]): string | null {
    const locationTag = tags?.find(tag =>
        tag.category === 'ciudad' || tag.category === 'sector' || tag.category === 'provincia'
    );
    return locationTag?.name ? normalizeText(locationTag.name) : null;
}

function extractPropertyTypeFromTags(tags: any[]): string | null {
    const typeTag = tags?.find(tag => tag.category === 'categoria');
    return typeTag?.name ? normalizeText(typeTag.name) : null;
}

function extractOperationFromTags(tags: any[]): string | null {
    const operationTag = tags?.find(tag => tag.category === 'operacion');
    return operationTag?.name ? normalizeText(operationTag.name) : null;
}

function extractNearbyServices(seoData: any): string[] {
    const places = seoData?.places_enrichment;
    if (!places || !places.featured_services) return [];

    return places.featured_services.slice(0, 8).map((service: any) => sanitizeText(service.place_name));
}

function generateIntroText(tags: any[]): string {
    const location = extractLocationFromTags(tags);
    const propertyType = extractPropertyTypeFromTags(tags);

    if (location && propertyType) {
        return cleanDescription(`Descubre las mejores opciones de ${propertyType.toLowerCase()} en ${location}. Propiedades cuidadosamente seleccionadas con excelente ubicación y servicios cercanos.`);
    }

    return 'Encuentra tu propiedad ideal con CLIC Inmobiliaria. Propiedades verificadas y servicios de calidad.';
}

function generateBenefits(tags: any[]): string[] {
    return [
        'Financiamiento hasta 80%',
        'Bono Primera Vivienda disponible',
        'Asesoría legal incluida',
        'Tours virtuales',
        'Proceso 100% transparente'
    ];
}

// ✅ FUNCIÓN ELIMINADA: Solo generar FAQs como fallback si es absolutamente necesario
function generateFAQs(tags: any[]): Array<{ question: string; answer: string }> {
    console.log('⚠️ [listFormatter] No hay FAQs reales disponibles - retornando array vacío');
    // ✅ NO GENERAR FALLBACKS HARDCODEADOS
    return [];
}

export function getEmptyListResponse() {
    return {
        type: 'property-list' as const,
        properties: [],
        pagination: {
            currentPage: 1,
            totalCount: 0,
            itemsPerPage: 30,
            totalPages: 0,
            hasMore: false,
            hasNextPage: false,
            hasPreviousPage: false
        },
        search: {
            tags: [],
            location: null,
            propertyType: null,
            operation: null
        },
        seo: {
            title: 'Propiedades no encontradas - CLIC Inmobiliaria',
            description: 'No se encontraron propiedades que coincidan con tu búsqueda',
            h1: 'Sin resultados',
            keywords: SEO_DEFAULTS.DEFAULT_KEYWORDS
        },
        breadcrumbs: [
            { name: 'Inicio', url: '/', current: false },
            { name: 'Propiedades', url: '/propiedades', current: true }
        ],
        content: {
            intro: 'No se encontraron propiedades para los criterios especificados.',
            benefits: [],
            nearbyServices: [],
            faqs: [],
            seoContent: [],
            hasTagRelatedContent: false,
            contentHierarchy: {
                specific_count: 0,
                tag_related_count: 0,
                default_count: 0
            }
        },
        relatedContent: {
            articles: [],
            videos: [],
            seo_content: [],
            faqs: [], // ✅ FAQs vacíos en respuesta vacía
            contentSource: 'empty'
        },
        meta: {
            timestamp: new Date().toISOString(),
            searchTerms: [],
            totalResults: 0,
            hasBreadcrumbs: true,
            breadcrumbsSource: 'fallback',
            hasContentHierarchy: false,
            contentHierarchyInfo: null,
            tagRelatedContentUsed: false,
            seoContentCount: 0,
            realFAQsCount: 0, // ✅ Agregar contador de FAQs reales
            faqsSource: 'none',
            propertiesWithCoordinates: 0,
            totalProperties: 0,
            coordinatesSuccessRate: '0%'
        }
    };
}