// 📁 supabase/functions/unified-property-search/property-search.ts
import { checkIfHasCountryTag } from './utils.ts';
export class PropertySearchService {
  supabase;
  constructor(supabase){
    this.supabase = supabase;
  }
  async searchPropertyBySlugUrl(searchPath) {
    console.log('🔍 Búsqueda por slug_url:', searchPath);
    // ✅ CONSULTA ACTUALIZADA CON COORDENADAS
    const selectQuery = `
      id, code, name, description, agent_id, slug_url,
      sale_price, sale_currency, rental_price, rental_currency,
      temp_rental_price, temp_rental_currency, 
      furnished_rental_price, furnished_rental_currency,
      bedrooms, bathrooms, parking_spots, built_area, land_area,
      main_image_url, gallery_images_url, property_status, is_project,
      delivery_date, project_detail_id,
      exact_coordinates, show_exact_location,
      property_categories(name, description),
      cities(name, coordinates, provinces(name, coordinates)),
      sectors(name, coordinates),
      property_images(url, title, description, is_main, sort_order),
      property_amenities(amenity_id, value, amenities(name, icon, category))
    `;
    // ✅ MEJORAR VARIANTES DE BÚSQUEDA
    const searchVariants = [
      searchPath,
      `/${searchPath}`,
      searchPath.replace(/^\//, ''),
      `/${searchPath.replace(/^\//, '')}`,
      `/property/${searchPath}`,
      `/properties/${searchPath}`,
      `property/${searchPath}`,
      `properties/${searchPath}`,
      `${searchPath}/`,
      `/${searchPath}/` // /mystic-bay-a-solo-2min-de-playa-gorda/
    ];
    console.log('🔍 Variantes de búsqueda:', searchVariants);
    // ✅ MEJORA: Buscar primero en propiedades publicadas
    for (const variant of searchVariants){
      const { data: property, error } = await this.supabase.from('properties').select(selectQuery).eq('slug_url', variant).eq('availability', 1).eq('property_status', 'Publicada').single();
      if (!error && property) {
        console.log(`✅ Propiedad DISPONIBLE encontrada con slug: "${variant}"`);
        return {
          found: true,
          property: property,
          searchMethod: 'exact_slug',
          matchedVariant: variant,
          available: true
        };
      }
    }
    // ✅ BÚSQUEDA MÁS AGRESIVA: Buscar por name también
    console.log('🔍 Propiedad no encontrada por slug_url, buscando por nombre...');
    // Limpiar el searchPath para búsqueda por nombre
    const cleanName = searchPath.replace(/[\/\-_]/g, ' ') // Reemplazar separadores por espacios
    .replace(/\s+/g, ' ') // Normalizar espacios múltiples
    .trim().toLowerCase();
    console.log('🔍 Buscando por nombre normalizado:', cleanName);
    // Buscar por nombre (más flexible)
    for (const variant of searchVariants){
      const { data: property, error } = await this.supabase.from('properties').select(selectQuery).or(`name.ilike.%${cleanName}%,slug_url.eq.${variant}`).eq('availability', 1).eq('property_status', 'Publicada').single();
      if (!error && property) {
        console.log(`✅ Propiedad DISPONIBLE encontrada por nombre/slug híbrido`);
        return {
          found: true,
          property: property,
          searchMethod: 'name_or_slug_hybrid',
          matchedVariant: variant,
          available: true
        };
      }
    }
    // ✅ BÚSQUEDA POR NOMBRE PARCIAL (Más agresiva)
    console.log('🔍 Búsqueda por nombre parcial...');
    const nameWords = cleanName.split(' ').filter((word)=>word.length > 2); // Solo palabras de 3+ caracteres
    if (nameWords.length > 0) {
      const nameQuery = nameWords.map((word)=>`name.ilike.%${word}%`).join(',');
      const { data: properties, error } = await this.supabase.from('properties').select(selectQuery).or(nameQuery).eq('availability', 1).eq('property_status', 'Publicada').limit(5);
      if (!error && properties && properties.length > 0) {
        // Tomar la primera que tenga más coincidencias
        const bestMatch = properties.find((prop)=>{
          const propName = prop.name.toLowerCase();
          return nameWords.some((word)=>propName.includes(word));
        });
        if (bestMatch) {
          console.log(`✅ Propiedad DISPONIBLE encontrada por coincidencia parcial: ${bestMatch.name}`);
          return {
            found: true,
            property: bestMatch,
            searchMethod: 'partial_name_match',
            matchedVariant: cleanName,
            available: true
          };
        }
      }
    }
    // ✅ NUEVA FUNCIONALIDAD: Buscar en propiedades NO disponibles (vendidas/retiradas)
    console.log('🔍 Buscando en propiedades NO disponibles...');
    for (const variant of searchVariants){
      const { data: property, error } = await this.supabase.from('properties').select(selectQuery).eq('slug_url', variant).single(); // Sin filtros de disponibilidad
      if (!error && property && property.property_status !== 'Publicada') {
        console.log(`⚠️ Propiedad NO DISPONIBLE encontrada con slug: "${variant}", status: ${property.property_status}`);
        return {
          found: true,
          property: property,
          searchMethod: 'exact_slug_sold',
          matchedVariant: variant,
          available: false,
          soldStatus: property.property_status
        };
      }
    }
    // ✅ BÚSQUEDA POR NOMBRE EN NO DISPONIBLES
    if (nameWords && nameWords.length > 0) {
      const nameQuery = nameWords.map((word)=>`name.ilike.%${word}%`).join(',');
      const { data: properties, error } = await this.supabase.from('properties').select(selectQuery).or(nameQuery).neq('property_status', 'Publicada') // Solo NO disponibles
      .limit(3);
      if (!error && properties && properties.length > 0) {
        const bestMatch = properties.find((prop)=>{
          const propName = prop.name.toLowerCase();
          return nameWords.some((word)=>propName.includes(word));
        });
        if (bestMatch) {
          console.log(`⚠️ Propiedad NO DISPONIBLE encontrada por nombre: ${bestMatch.name}`);
          return {
            found: true,
            property: bestMatch,
            searchMethod: 'partial_name_match_sold',
            matchedVariant: cleanName,
            available: false,
            soldStatus: bestMatch.property_status
          };
        }
      }
    }
    return {
      found: false,
      property: null,
      available: false
    };
  }
  async searchPropertiesByTags(tagIds, countryTagId, page = 1, limit = 32) {
    console.log('🔍 === BÚSQUEDA DE PROPIEDADES CON INYECCIÓN AUTOMÁTICA DE PAÍS ===');
    // ✅ INYECCIÓN AUTOMÁTICA DEL TAG DE PAÍS
    let finalTagIds = [
      ...tagIds
    ];
    let countryInjected = false;
    if (countryTagId) {
      // Verificar si ya tiene tag de país
      const hasCountryTag = await checkIfHasCountryTag(this.supabase, tagIds);
      if (!hasCountryTag) {
        finalTagIds = [
          countryTagId,
          ...tagIds
        ];
        countryInjected = true;
        console.log('✅ Tag de país inyectado automáticamente:', countryTagId);
      } else {
        console.log('✅ Ya existe tag de país en la búsqueda');
      }
    } else {
      console.log('⚠️ No hay tag de país para inyectar');
    }
    console.log('📋 Tags finales para búsqueda:', {
      original: tagIds.length,
      final: finalTagIds.length,
      countryInjected: countryInjected
    });
    if (finalTagIds.length === 0) {
      return {
        properties: [],
        totalCount: 0,
        currentPage: page,
        hasMore: false,
        itemsPerPage: limit,
        countryInjected: false
      };
    }
    try {
      let totalCount = 0;
      let validPropertyIds = [];
      // Intentar RPC primero
      const { data: rpcPropertyIds, error: rpcError } = await this.supabase.rpc('get_properties_with_all_tags', {
        tag_ids: finalTagIds
      });
      if (!rpcError && rpcPropertyIds && rpcPropertyIds.length > 0) {
        validPropertyIds = rpcPropertyIds;
        totalCount = rpcPropertyIds.length;
        console.log(`✅ RPC exitoso con país: ${totalCount} propiedades encontradas`);
      } else {
        console.log('🔄 Usando método fallback con content_tags');
        const { data: contentTags, error: contentTagsError } = await this.supabase.from('content_tags').select('content_id, tag_id').eq('content_type', 'properties').in('tag_id', finalTagIds);
        if (contentTagsError || !contentTags) {
          return {
            properties: [],
            totalCount: 0,
            currentPage: page,
            hasMore: false,
            itemsPerPage: limit,
            countryInjected: countryInjected
          };
        }
        const tagCountByProperty = {};
        contentTags.forEach((ct)=>{
          tagCountByProperty[ct.content_id] = (tagCountByProperty[ct.content_id] || 0) + 1;
        });
        // DEBE tener TODOS los tags (incluyendo país)
        const requiredTagCount = finalTagIds.length;
        validPropertyIds = Object.keys(tagCountByProperty).filter((propertyId)=>tagCountByProperty[propertyId] === requiredTagCount);
        totalCount = validPropertyIds.length;
        console.log(`✅ Fallback exitoso con país: ${totalCount} propiedades encontradas`);
      }
      if (totalCount === 0) {
        return {
          properties: [],
          totalCount: 0,
          currentPage: page,
          hasMore: false,
          itemsPerPage: limit,
          countryInjected: countryInjected
        };
      }
      const offset = (page - 1) * limit;
      const paginatedPropertyIds = validPropertyIds.slice(offset, offset + limit);
      console.log(`📄 Obteniendo página ${page}: ${paginatedPropertyIds.length} propiedades (offset: ${offset})`);
      // ✅ CONSULTA ACTUALIZADA CON COORDENADAS PARA LISTADOS
      const { data: properties, error: propertiesError } = await this.supabase.from('properties').select(`
          id, code, name, description, agent_id, slug_url,
          sale_price, sale_currency, rental_price, rental_currency,
          temp_rental_price, temp_rental_currency, 
          furnished_rental_price, furnished_rental_currency,
          bedrooms, bathrooms, parking_spots, built_area, land_area,
          main_image_url, gallery_images_url, property_status, is_project,
          delivery_date, project_detail_id,
          exact_coordinates, show_exact_location,
          property_categories(name, description),
          cities(name, coordinates, provinces(name, coordinates)),
          sectors(name, coordinates),
          property_images(url, title, description, is_main, sort_order)
        `).in('id', paginatedPropertyIds).eq('availability', 1).eq('property_status', 'Publicada');
      if (propertiesError) {
        console.error('❌ Error obteniendo propiedades:', propertiesError);
        return {
          properties: [],
          totalCount: 0,
          currentPage: page,
          hasMore: false,
          itemsPerPage: limit,
          countryInjected: countryInjected
        };
      }
      const hasMore = offset + limit < totalCount;
      console.log(`✅ Búsqueda completada con país: ${properties?.length || 0} propiedades obtenidas, ${totalCount} total, hasMore: ${hasMore}`);
      return {
        properties: properties || [],
        totalCount,
        currentPage: page,
        hasMore,
        itemsPerPage: limit,
        countryInjected: countryInjected,
        searchMetadata: {
          originalTagsCount: tagIds.length,
          finalTagsCount: finalTagIds.length,
          countryTagIncluded: countryInjected,
          countryTagId: countryInjected ? countryTagId : undefined
        }
      };
    } catch (error) {
      console.error('❌ Error en searchPropertiesByTags con país:', error);
      return {
        properties: [],
        totalCount: 0,
        currentPage: page,
        hasMore: false,
        itemsPerPage: limit,
        countryInjected: false
      };
    }
  }
  async findTagsBySlug(slugs) {
    if (slugs.length === 0) return [];
    const { data: tags, error } = await this.supabase.from('tags').select('id, name, slug, category, display_name').in('slug', slugs);
    if (error) {
      console.error('Error buscando tags:', error);
      return [];
    }
    return tags || [];
  }
  async getPropertyTags(propertyId) {
    try {
      console.log('🏷️ Obteniendo tags de la propiedad:', propertyId);
      const { data: contentTags, error } = await this.supabase.from('content_tags').select(`
          tag_id,
          weight,
          tags!inner(id, name, slug, category, display_name)
        `).eq('content_id', propertyId).eq('content_type', 'property').order('weight', {
        ascending: false
      });
      if (error) {
        console.error('❌ Error obteniendo tags de propiedad:', error);
        return [];
      }
      const tags = (contentTags || []).filter((ct)=>ct.tags).map((ct)=>({
          ...ct.tags,
          weight: ct.weight || 1
        }));
      console.log('✅ Tags de propiedad obtenidos:', {
        total: tags.length,
        byCategory: tags.reduce((acc, tag)=>{
          acc[tag.category] = (acc[tag.category] || 0) + 1;
          return acc;
        }, {}),
        topWeights: tags.slice(0, 5).map((t)=>`${t.category}:${t.name}(${t.weight})`)
      });
      return tags;
    } catch (error) {
      console.error('❌ Error en getPropertyTags:', error);
      return [];
    }
  }
}
