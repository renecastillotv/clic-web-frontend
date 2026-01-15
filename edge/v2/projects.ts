// 📁 supabase/functions/unified-property-search/projects.ts
export class ProjectsService {
  supabase;
  constructor(supabase){
    this.supabase = supabase;
  }
  async getCompleteProjectDetails(projectDetailId) {
    if (!projectDetailId) return null;
    try {
      const { data: projectData, error } = await this.supabase.from('project_details').select(`
          *,
          developers(*),
          project_typologies(*),
          project_amenities(*, amenities(*)),
          project_payment_plans(*),
          project_phases(*),
          project_availability(*, project_typologies(*)),
          project_benefits(*, project_benefits_catalog(*)),
          project_documents(*, project_documents_catalog(*))
        `).eq('id', projectDetailId).single();
      if (error) {
        console.error('❌ Error obteniendo detalles del proyecto:', error);
        return null;
      }
      return projectData;
    } catch (error) {
      console.error('❌ Error crítico en getCompleteProjectDetails:', error);
      return null;
    }
  }
  async getPropertySpecificContent(propertyId) {
    try {
      const { data: relations, error } = await this.supabase.from('content_property_relations').select('content_id, content_type, relation_type, weight').eq('property_id', propertyId).order('weight', {
        ascending: false
      });
      if (error || !relations || relations.length === 0) {
        return null;
      }
      const contentByType = relations.reduce((acc, rel)=>{
        if (!acc[rel.content_type]) acc[rel.content_type] = [];
        acc[rel.content_type].push(rel.content_id);
        return acc;
      }, {});
      const [articles, videos, testimonials, faqs] = await Promise.all([
        contentByType.article ? this.supabase.from('articles').select(`
              id, title, slug, excerpt, content, featured_image,
              published_at, created_at, updated_at,
              meta_title, meta_description, read_time,
              views, featured, category, author_id,
              users!articles_author_id_fkey(
                first_name, last_name, profile_photo_url
              )
            `).in('id', contentByType.article).eq('status', 'published') : Promise.resolve({
          data: []
        }),
        contentByType.video ? this.supabase.from('videos').select('*').in('id', contentByType.video).eq('status', 'published') : Promise.resolve({
          data: []
        }),
        contentByType.testimonial ? this.supabase.from('testimonials').select('*').in('id', contentByType.testimonial).eq('status', 'published') : Promise.resolve({
          data: []
        }),
        contentByType.faq ? this.supabase.from('faqs').select('*').in('id', contentByType.faq).eq('status', 'published') : Promise.resolve({
          data: []
        })
      ]);
      const processedArticles = articles.data ? articles.data.map((article)=>{
        const author = {
          name: article.users ? `${article.users.first_name || ''} ${article.users.last_name || ''}`.trim() || 'Equipo CLIC' : 'Equipo CLIC',
          avatar: article.users?.profile_photo_url || '/images/team/clic-experts.jpg'
        };
        return {
          ...article,
          featuredImage: article.featured_image,
          publishedAt: article.published_at,
          readTime: article.read_time ? `${article.read_time} min` : '8 min',
          author: author,
          category: article.category || 'Artículos',
          views: article.views || `${Math.floor(Math.random() * 5 + 1)}.${Math.floor(Math.random() * 9 + 1)}K`,
          featured: article.featured || false
        };
      }) : [];
      return {
        articles: processedArticles,
        videos: videos.data || [],
        testimonials: testimonials.data || [],
        faqs: faqs.data || [],
        has_specific_content: true
      };
    } catch (error) {
      console.error('❌ Error obteniendo contenido específico:', error);
      return null;
    }
  }
  async generateDynamicThematicCarousels(baseTagIds, countryTagId, limit = 8) {
    console.log('🎯 === GENERANDO CARRUSELES DINÁMICOS TEMÁTICOS ===');
    try {
      // 1. Obtener grupos activos con sus tags relacionados
      const { data: tagGroups, error: groupsError } = await this.supabase.from('tag_groups').select(`
          id, slug, name, description, min_score, priority,
          seo_title, seo_description, icon, color,
          tag_group_tags!inner(
            tag_id, weight,
            tags!inner(id, slug, name, category)
          )
        `).eq('active', true).order('priority', {
        ascending: true
      });
      if (groupsError || !tagGroups?.length) {
        console.log('⚠️ No se encontraron grupos de tags activos');
        return [];
      }
      console.log(`📋 Encontrados ${tagGroups.length} grupos activos`);
      const carousels = [];
      // 2. Procesar cada grupo
      for (const group of tagGroups){
        console.log(`🔍 Procesando grupo: "${group.name}"`);
        // Extraer IDs de tags del grupo
        const groupTagIds = group.tag_group_tags.map((tgt)=>tgt.tag_id);
        if (groupTagIds.length === 0) {
          console.log(`⚠️ Grupo "${group.name}" sin tags`);
          continue;
        }
        // 3. Buscar propiedades con fallback progresivo
        const searchResult = await this.searchWithProgressiveFallback(baseTagIds, groupTagIds, countryTagId, group.min_score || 4, limit);
        // 4. Verificar si cumple el mínimo
        if (searchResult.properties.length >= (group.min_score || 4)) {
          console.log(`✅ "${group.name}": ${searchResult.properties.length} propiedades`);
          carousels.push({
            id: group.id,
            title: group.name,
            subtitle: group.description || `Descubre ${group.name.toLowerCase()}`,
            properties: searchResult.properties.map(this.formatPropertyForCarousel),
            viewAllLink: await this.generateViewAllLink(baseTagIds, groupTagIds),
            theme: this.mapGroupToTheme(group.slug, group.color),
            thematicGroup: group.slug,
            priority: group.priority,
            searchStats: {
              totalFound: searchResult.properties.length,
              fallbackLevel: searchResult.fallbackLevel,
              groupTagsCount: groupTagIds.length,
              minScoreRequired: group.min_score || 4
            },
            seo: {
              title: group.seo_title,
              description: group.seo_description
            },
            styling: {
              icon: group.icon,
              color: group.color
            }
          });
        } else {
          console.log(`❌ "${group.name}": ${searchResult.properties.length}/${group.min_score || 4} propiedades`);
        }
      }
      // 5. Ordenar por prioridad
      return carousels.sort((a, b)=>a.priority - b.priority);
    } catch (error) {
      console.error('❌ Error generando carruseles:', error);
      return [];
    }
  }
  async searchWithProgressiveFallback(baseTagIds, thematicTagIds, countryTagId, minResults, limit) {
    console.log('🔄 Búsqueda con fallback progresivo');
    // Obtener información de categorías de los tags base
    const { data: baseTags } = await this.supabase.from('tags').select('id, category').in('id', baseTagIds);
    // Estrategias de fallback
    const strategies = [
      {
        level: 0,
        name: "Completo",
        filter: (tags)=>tags // Todos los tags base
      },
      {
        level: 1,
        name: "Sin sector",
        filter: (tags)=>tags.filter((t)=>t.category !== 'sector')
      },
      {
        level: 2,
        name: "Sin sector ni ciudad",
        filter: (tags)=>tags.filter((t)=>![
              'sector',
              'ciudad'
            ].includes(t.category))
      },
      {
        level: 3,
        name: "Solo esenciales",
        filter: (tags)=>tags.filter((t)=>[
              'operacion',
              'categoria'
            ].includes(t.category))
      }
    ];
    for (const strategy of strategies){
      console.log(`🎯 Nivel ${strategy.level}: ${strategy.name}`);
      const filteredBaseTags = strategy.filter(baseTags || []);
      const filteredBaseTagIds = filteredBaseTags.map((t)=>t.id);
      // Combinar: país + base filtrados + temáticos
      const finalTagIds = [
        countryTagId,
        ...filteredBaseTagIds,
        ...thematicTagIds
      ].filter(Boolean);
      console.log(`📋 Buscando con ${finalTagIds.length} tags`);
      const result = await this.searchPropertiesByTags(finalTagIds, limit);
      const count = result.properties?.length || 0;
      if (count >= minResults) {
        console.log(`✅ Éxito nivel ${strategy.level}: ${count} propiedades`);
        return {
          properties: result.properties,
          fallbackLevel: strategy.level,
          strategy: strategy.name
        };
      }
    }
    return {
      properties: [],
      fallbackLevel: -1,
      strategy: 'no_results'
    };
  }
  async searchPropertiesByTags(tagIds, limit) {
    try {
      // Intentar RPC primero
      const { data: rpcPropertyIds, error: rpcError } = await this.supabase.rpc('get_properties_with_all_tags', {
        tag_ids: tagIds
      });
      let validPropertyIds = [];
      if (!rpcError && rpcPropertyIds && rpcPropertyIds.length > 0) {
        validPropertyIds = rpcPropertyIds;
      } else {
        // Fallback method
        const { data: contentTags } = await this.supabase.from('content_tags').select('content_id, tag_id').eq('content_type', 'properties').in('tag_id', tagIds);
        if (contentTags) {
          const tagCountByProperty = {};
          contentTags.forEach((ct)=>{
            tagCountByProperty[ct.content_id] = (tagCountByProperty[ct.content_id] || 0) + 1;
          });
          const requiredTagCount = tagIds.length;
          validPropertyIds = Object.keys(tagCountByProperty).filter((propertyId)=>tagCountByProperty[propertyId] === requiredTagCount);
        }
      }
      if (validPropertyIds.length === 0) {
        return {
          properties: []
        };
      }
      const paginatedPropertyIds = validPropertyIds.slice(0, limit);
      const { data: properties } = await this.supabase.from('properties').select(`
          id, code, name, sale_price, rental_price, temp_rental_price,
          furnished_rental_price, sale_currency, rental_currency,
          bedrooms, bathrooms, parking_spots, built_area, land_area,
          main_image_url, gallery_images_url, is_project, slug_url,
          property_categories(name),
          cities(name, provinces(name)),
          sectors(name)
        `).in('id', paginatedPropertyIds).eq('availability', 1).eq('property_status', 'Publicada');
      return {
        properties: properties || []
      };
    } catch (error) {
      console.error('❌ Error en searchPropertiesByTags:', error);
      return {
        properties: []
      };
    }
  }
  formatPropertyForCarousel(property) {
    // Mapear el formato de la API al formato esperado por PropertyCarousel.astro
    return {
      slug: property.slug_url || `propiedad-${property.id}`,
      titulo: property.name,
      precio: this.formatPropertyPrice(property),
      imagen: property.main_image_url || '/placeholder.jpg',
      sector: property.sectors?.name || property.cities?.name || '',
      habitaciones: property.bedrooms || 0,
      banos: property.bathrooms || 0,
      metros: property.built_area || property.land_area || 0,
      tipo: property.property_categories?.name || 'Propiedad',
      destacado: false,
      nuevo: property.is_project || false,
      descuento: null
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
  async generateViewAllLink(baseTagIds, thematicTagIds) {
    // Obtener slugs de todos los tags para construir URL
    const allTagIds = [
      ...baseTagIds,
      ...thematicTagIds
    ];
    const { data: tags } = await this.supabase.from('tags').select('slug, category').in('id', allTagIds);
    if (!tags?.length) return '/comprar';
    // Ordenar por jerarquía: operacion -> categoria -> ciudad -> sector -> otros
    const hierarchy = [
      'operacion',
      'categoria',
      'ciudad',
      'sector'
    ];
    const sortedTags = tags.sort((a, b)=>{
      const aIndex = hierarchy.indexOf(a.category);
      const bIndex = hierarchy.indexOf(b.category);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });
    const urlPath = sortedTags.map((t)=>t.slug).join('/');
    return `/${urlPath}`;
  }
  mapGroupToTheme(groupSlug, color) {
    const themeMap = {
      'airbnb': 'investment',
      'perfectos-airbnb': 'investment',
      'familia': 'family',
      'perfectos-familia': 'family',
      'lujo': 'luxury',
      'todo-lujo': 'luxury',
      'entrega-2026': 'new',
      'en-construccion': 'new',
      'default': 'default'
    };
    return themeMap[groupSlug] || 'default';
  }
}
