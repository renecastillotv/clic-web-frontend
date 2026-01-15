// src/data/formatters/projectFormatter.ts
// =====================================================
// FORMATEO DE PROYECTOS
// =====================================================

import { formatTitle, cleanDescription, sanitizeText } from '../processors/utilityProcessors.js';

export function formatProjectDetails(projectData: any) {
  if (!projectData) return null;
  
  return {
    id: projectData.id,
    name: formatTitle(projectData.name || ''),
    description: cleanDescription(projectData.description || ''),
    developer: projectData.developers ? {
      name: formatTitle(projectData.developers.name || ''),
      description: cleanDescription(projectData.developers.description || ''),
      logo_url: projectData.developers.logo_url,
      website: projectData.developers.website,
      years_experience: projectData.developers.years_experience,
      total_projects: projectData.developers.total_projects
    } : null,
    status: {
      construction: sanitizeText(projectData.construction_status || 'En construcción'),
      sales: sanitizeText(projectData.sales_status || 'En venta'),
      completion: projectData.estimated_completion_date,
      delivery_date: projectData.delivery_date
    },
    typologies: projectData.project_typologies?.map((typ: any) => ({
      id: typ.id,
      name: sanitizeText(typ.name || `${typ.bedrooms} habitaciones`),
      bedrooms: typ.bedrooms,
      bathrooms: typ.bathrooms,
      area: typ.built_area,
      priceFrom: typ.sale_price_from,
      priceTo: typ.sale_price_to,
      currency: typ.sale_currency || 'USD',
      available: !typ.is_sold_out,
      totalUnits: typ.total_units,
      availableUnits: typ.available_units
    })) || [],
    amenities: projectData.project_amenities?.map((amenity: any) => ({
      name: sanitizeText(amenity.amenities?.name || amenity.name || ''),
      icon: amenity.amenities?.icon || 'fas fa-check',
      category: sanitizeText(amenity.amenities?.category || ''),
      included: amenity.included !== false
    })) || [],
    paymentPlans: projectData.project_payment_plans?.map((plan: any) => ({
      id: plan.id,
      name: sanitizeText(plan.plan_name || 'Plan de Pago'),
      description: cleanDescription(plan.description || ''),
      reservation: plan.reservation_amount || 1000,
      reservationCurrency: plan.reservation_currency || 'USD',
      separationPercentage: plan.separation_percentage || 10,
      constructionPercentage: plan.construction_percentage || 20,
      deliveryPercentage: plan.delivery_percentage || 70,
      benefits: cleanDescription(plan.benefits || ''),
      isDefault: plan.is_default || false
    })) || [],
    phases: projectData.project_phases?.map((phase: any) => ({
      id: phase.id,
      name: sanitizeText(phase.phase_name || ''),
      description: cleanDescription(phase.description || ''),
      constructionStart: phase.construction_start,
      estimatedDelivery: phase.estimated_delivery,
      actualDelivery: phase.actual_delivery,
      totalUnits: phase.total_units,
      availableUnits: phase.available_units,
      status: sanitizeText(phase.status || ''),
      completionPercentage: phase.completion_percentage
    })) || []
  };
}