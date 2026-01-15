// ================================================================
// 📄 9. similar-properties.ts - Servicio de propiedades similares
// ================================================================
import { CATEGORY_WEIGHTS } from './config.ts';
import { formatSimilarProperty, checkIfHasCountryTag } from './utils.ts';
export class SimilarPropertiesService {
  supabase;
  constructor(supabase){
    this.supabase = supabase;
  }
  async getSmartSimilarProperties(propertyTags, excludeId, countryTagId = null) {
    console.log('🏠 === BUSCANDO PROPIEDADES SIMILARES CON PAÍS ===');
    console.log('📋 Exclude ID:', excludeId);
    console.log('📋 Tags disponibles:', propertyTags?.length || 0);
    console.log('🌍 Country Tag ID:', countryTagId);
    if (!propertyTags || propertyTags.length === 0) {
      console.log('⚠️ No hay tags de la propiedad, usando fallback con país');
      return await this.getFallbackSimilarProperties(excludeId, countryTagId);
    }
    try {
      // ✅ INYECCIÓN AUTOMÁTICA DE PAÍS
      let finalTagIds = propertyTags.map((t)=>t.id);
      let countryInjected = false;
      if (countryTagId) {
        const hasCountryTag = await checkIfHasCountryTag(this.supabase, finalTagIds);
        if (!hasCountryTag) {
          finalTagIds = [
            countryTagId,
            ...finalTagIds
          ];
          countryInjected = true;
          console.log('✅ Tag de país inyectado en propiedades similares:', countryTagId);
        }
      }
      console.log('🔍 Buscando propiedades que tengan estos tag IDs:', finalTagIds);
      const { data: propertyMatches, error } = await this.supabase.from('content_tags').select(`
          content_id,
          tag_id,
          weight,
          tags(id, name, category)
        `).eq('content_type', 'property').in('tag_id', finalTagIds).neq('content_id', excludeId);
      if (error || !propertyMatches) {
        console.error('❌ Error buscando propiedades similares:', error);
        return await this.getFallbackSimilarProperties(excludeId, countryTagId);
      }
      console.log('📊 Property matches encontrados:', propertyMatches.length);
      const propertyScores = {};
      propertyMatches.forEach((match)=>{
        const propertyId = match.content_id;
        const tagCategory = match.tags?.category || 'caracteristica';
        const categoryWeight = CATEGORY_WEIGHTS[tagCategory] || 1;
        const tagWeight = match.weight || 1;
        if (!propertyScores[propertyId]) {
          propertyScores[propertyId] = {
            property_id: propertyId,
            total_score: 0,
            matched_tags: 0,
            categories: new Set(),
            has_country_tag: false
          };
        }
        propertyScores[propertyId].total_score += categoryWeight * tagWeight;
        propertyScores[propertyId].matched_tags += 1;
        propertyScores[propertyId].categories.add(tagCategory);
        if (tagCategory === 'pais') {
          propertyScores[propertyId].has_country_tag = true;
        }
      });
      // ✅ NUEVA LÓGICA: FORZAR QUE TODAS TENGAN TAG DE PAÍS
      let validProperties;
      if (countryTagId) {
        validProperties = Object.values(propertyScores).filter((prop)=>prop.has_country_tag && prop.matched_tags >= 1).sort((a, b)=>b.total_score - a.total_score).slice(0, 6);
        console.log('🔒 Filtro estricto: solo propiedades CON tag de país:', validProperties.length);
        if (validProperties.length < 3) {
          console.log('⚠️ Muy pocas propiedades con tag de país, usando fallback específico');
          return await this.getFallbackSimilarProperties(excludeId, countryTagId);
        }
      } else {
        validProperties = Object.values(propertyScores).filter((prop)=>prop.matched_tags >= 2).sort((a, b)=>b.total_score - a.total_score).slice(0, 6);
      }
      console.log('📊 Propiedades similares encontradas:', {
        totalMatches: Object.keys(propertyScores).length,
        withCountryTag: validProperties.filter((p)=>p.has_country_tag).length,
        finalSelected: validProperties.length,
        countryInjected: countryInjected
      });
      const propertyIds = validProperties.map((p)=>p.property_id);
      return await this.getPropertiesDetails(propertyIds);
    } catch (error) {
      console.error('❌ Error en getSmartSimilarProperties:', error);
      return await this.getFallbackSimilarProperties(excludeId, countryTagId);
    }
  }
  async getFallbackSimilarProperties(excludeId, countryTagId = null) {
    console.log('🔄 Usando método fallback para propiedades similares CON PAÍS');
    try {
      if (countryTagId) {
        console.log('🎯 Buscando propiedades del mismo país como fallback');
        const { data: contentTags } = await this.supabase.from('content_tags').select('content_id').eq('content_type', 'property').eq('tag_id', countryTagId).neq('content_id', excludeId);
        if (contentTags && contentTags.length > 0) {
          const propertyIds = contentTags.map((ct)=>ct.content_id);
          const { data: properties, error } = await this.supabase.from('properties').select(`
              id, code, name, sale_price, rental_price, temp_rental_price,
              furnished_rental_price, sale_currency, rental_currency,
              bedrooms, bathrooms, parking_spots, built_area, land_area,
              main_image_url, gallery_images_url, is_project, slug_url,
              property_categories(name),
              cities(name, provinces(name)),
              sectors(name),
              property_images(url, title, description, is_main, sort_order)
            `).in('id', propertyIds).eq('availability', 1).eq('property_status', 'Publicada').order('created_at', {
            ascending: false
          }).limit(6);
          if (!error && properties && properties.length > 0) {
            console.log('✅ Propiedades fallback del país obtenidas:', properties.length);
            return properties.map(formatSimilarProperty);
          }
        }
      }
      console.warn('⚠️ NO SE ENCONTRARON PROPIEDADES SIMILARES DEL MISMO PAÍS');
      return [];
    } catch (error) {
      console.error('❌ Error en getFallbackSimilarProperties:', error);
      return [];
    }
  }
  async getPropertiesDetails(propertyIds) {
    if (!propertyIds || propertyIds.length === 0) return [];
    console.log('📋 Obteniendo detalles de', propertyIds.length, 'propiedades similares');
    try {
      const { data: properties, error } = await this.supabase.from('properties').select(`
          id, code, name, sale_price, rental_price, temp_rental_price,
          furnished_rental_price, sale_currency, rental_currency,
          bedrooms, bathrooms, parking_spots, built_area, land_area,
          main_image_url, gallery_images_url, is_project, slug_url,
          property_categories(name),
          cities(name, provinces(name)),
          sectors(name),
          property_images(url, title, description, is_main, sort_order)
        `).in('id', propertyIds).eq('availability', 1).eq('property_status', 'Publicada');
      if (error) {
        console.error('❌ Error obteniendo detalles de propiedades:', error);
        return [];
      }
      const orderedProperties = propertyIds.map((id)=>properties?.find((prop)=>prop.id === id)).filter(Boolean);
      console.log('✅ Propiedades similares obtenidas:', orderedProperties.length);
      return orderedProperties.map(formatSimilarProperty);
    } catch (error) {
      console.error('❌ Error en getPropertiesDetails:', error);
      return [];
    }
  }
}
