// ================================================================
// 📄 10. agent.ts - Servicio de agentes y usuarios
// ================================================================
export class AgentService {
  supabase;
  agentCache;
  constructor(supabase){
    this.supabase = supabase;
    this.agentCache = new Map();
  }
  async getPropertyAgent(agentId) {
    if (!agentId) return null;
    if (this.agentCache.has(agentId)) {
      return this.agentCache.get(agentId);
    }
    try {
      const { data: agent, error } = await this.supabase.from('users').select(`
          id, external_id, first_name, last_name, email, phone, 
          position, slug, biography, facebook_url, instagram_url, 
          twitter_url, linkedin_url, youtube_url,
          active, show_on_website, user_type, team_id,
          profile_photo_url, years_experience, specialty_description, languages
        `).eq('id', agentId).single();
      if (error) {
        console.log('❌ Error obteniendo agente:', error.message);
        return null;
      }
      const formattedAgent = this.formatAgent(agent, 'agent');
      this.agentCache.set(agentId, formattedAgent);
      setTimeout(()=>this.agentCache.delete(agentId), 15 * 60 * 1000);
      return formattedAgent;
    } catch (error) {
      console.error('❌ Error crítico buscando agente:', error);
      return null;
    }
  }
  async getReferralAgent(externalId) {
    if (!externalId) return null;
    try {
      const { data: referralAgent, error } = await this.supabase.from('users').select(`
          id, external_id, first_name, last_name, email, phone, 
          position, slug, biography, facebook_url, instagram_url, 
          twitter_url, linkedin_url, youtube_url,
          active, show_on_website, user_type, team_id,
          profile_photo_url, years_experience, specialty_description, languages
        `).eq('external_id', externalId).eq('active', true).single();
      if (error || !referralAgent) {
        console.log('⚠️ Usuario referido no encontrado:', externalId);
        return null;
      }
      return this.formatAgent(referralAgent, 'referral');
    } catch (error) {
      console.error('❌ Error buscando usuario referido:', error);
      return null;
    }
  }
  async getAgentProperties(agentId, excludePropertyId = null, limit = 20) {
    if (!agentId) {
      console.log('⚠️ No se proporcionó agent_id');
      return [];
    }
    console.log('👤 === OBTENIENDO PROPIEDADES DEL ASESOR ===');
    try {
      let query = this.supabase.from('properties').select(`
          id, code, name, sale_price, rental_price, temp_rental_price,
          furnished_rental_price, sale_currency, rental_currency,
          bedrooms, bathrooms, parking_spots, built_area, land_area,
          main_image_url, gallery_images_url, is_project, slug_url,
          property_categories(name),
          cities(name, provinces(name)),
          sectors(name),
          property_images(url, title, description, is_main, sort_order)
        `).eq('agent_id', agentId).eq('availability', 1).eq('property_status', 'Publicada').order('created_at', {
        ascending: false
      }).limit(limit);
      if (excludePropertyId) {
        query = query.neq('id', excludePropertyId);
      }
      const { data: properties, error } = await query;
      if (error) {
        console.error('❌ Error obteniendo propiedades del asesor:', error);
        return [];
      }
      if (!properties || properties.length === 0) {
        console.log('⚠️ No se encontraron propiedades para este asesor');
        return [];
      }
      console.log('✅ Propiedades del asesor obtenidas:', properties.length);
      return properties.map((prop)=>({
          id: prop.id,
          title: prop.name,
          price: this.formatPropertyPrice(prop),
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          area: prop.built_area || prop.land_area,
          image: this.getPropertyImage(prop),
          location: this.getPropertyLocation(prop),
          type: prop.property_categories?.name,
          url: prop.slug_url || `/propiedad/${prop.id}`,
          is_project: prop.is_project,
          parking_spots: prop.parking_spots
        }));
    } catch (error) {
      console.error('❌ Error en getAgentProperties:', error);
      return [];
    }
  }
  formatAgent(agent, type) {
    return {
      id: agent.id,
      name: `${agent.first_name || ''} ${agent.last_name || ''}`.trim(),
      email: agent.email,
      phone: agent.phone,
      position: agent.position || 'Asesor Inmobiliario',
      slug: agent.slug,
      biography: agent.biography,
      external_id: agent.external_id,
      profile_photo_url: agent.profile_photo_url,
      years_experience: agent.years_experience || 0,
      specialty_description: agent.specialty_description,
      languages: agent.languages,
      social: {
        facebook: agent.facebook_url,
        instagram: agent.instagram_url,
        twitter: agent.twitter_url,
        linkedin: agent.linkedin_url,
        youtube: agent.youtube_url
      },
      active: agent.active,
      show_on_website: agent.show_on_website,
      team_id: agent.team_id,
      user_type: agent.user_type,
      agent_type: type
    };
  }
  formatPropertyPrice(property) {
    if (property.sale_price) {
      return `${property.sale_price.toLocaleString()} ${property.sale_currency || 'USD'}`;
    } else if (property.rental_price) {
      return `${property.rental_price.toLocaleString()} ${property.rental_currency || 'USD'}/mes`;
    } else if (property.temp_rental_price) {
      return `${property.temp_rental_price.toLocaleString()} ${property.temp_rental_currency || 'USD'}/noche`;
    } else if (property.furnished_rental_price) {
      return `${property.furnished_rental_price.toLocaleString()} ${property.furnished_rental_currency || 'USD'}/mes`;
    }
    return 'Precio a consultar';
  }
  getPropertyImage(property) {
    let mainImage = property.main_image_url;
    if (!mainImage && property.property_images && property.property_images.length > 0) {
      const mainImg = property.property_images.find((img)=>img.is_main);
      mainImage = mainImg ? mainImg.url : property.property_images[0].url;
    }
    if (!mainImage && property.gallery_images_url) {
      if (Array.isArray(property.gallery_images_url)) {
        mainImage = property.gallery_images_url[0];
      } else if (typeof property.gallery_images_url === 'string') {
        mainImage = property.gallery_images_url.split(',')[0]?.trim();
      }
    }
    return mainImage || '/images/placeholder-property.jpg';
  }
  getPropertyLocation(property) {
    const locationParts = [
      property.sectors?.name,
      property.cities?.name
    ].filter(Boolean);
    return locationParts.length > 0 ? locationParts.join(', ') : 'Ubicación no especificada';
  }
}
