// ================================================================
// Favorites Management Edge Function
// ================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// Generar un public_id único de 8 caracteres
function generatePublicId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

Deno.serve(async (req) => {
  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  console.log('📋 Favorites request:', req.method, req.url);

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse URL and get device_id
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);

    console.log('🔍 Full URL:', req.url);
    console.log('🔍 Path parts:', pathParts);

    // Expected format: /favorites/{device_id} or /favorites/{device_id}/add, etc.
    // pathParts = ['favorites', 'DEV-xxx', 'add']
    const deviceId = pathParts.length >= 2 ? pathParts[1] : null;
    const action = pathParts.length >= 3 ? pathParts[2] : null;

    console.log('📱 Device ID:', deviceId, 'Action:', action);

    if (!deviceId) {
      return new Response(
        JSON.stringify({ error: 'Device ID required', pathParts, url: req.url }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ===== GET: Obtener favoritos del dispositivo =====
    if (req.method === 'GET') {
      // ===== DETAILS: Obtener favoritos con detalles de propiedades =====
      if (action === 'details') {
        console.log('📊 Getting favorites with property details');

        // Buscar lista de favoritos
        const { data: favoritesList, error: fetchError } = await supabase
          .from('device_favorites')
          .select('*')
          .eq('device_id', deviceId)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching favorites:', fetchError);
          throw fetchError;
        }

        if (!favoritesList || !favoritesList.properties || favoritesList.properties.length === 0) {
          return new Response(
            JSON.stringify({ properties: [] }),
            { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }

        // Obtener detalles de las propiedades
        const { data: properties, error: propertiesError } = await supabase
          .from('properties')
          .select(`
            id,
            code,
            name,
            private_name,
            description,
            bedrooms,
            bathrooms,
            parking_spots,
            built_area,
            land_area,
            sale_price,
            sale_currency,
            rental_price,
            rental_currency,
            main_image_url,
            gallery_images_url,
            slug_url,
            property_status,
            availability,
            sectors!properties_sector_id_fkey(name),
            cities!properties_city_id_fkey(name),
            property_categories!properties_category_id_fkey(name)
          `)
          .in('id', favoritesList.properties)
          .eq('availability', 1);

        if (propertiesError) {
          console.error('Error fetching properties:', propertiesError);
          throw propertiesError;
        }

        // Procesar propiedades al formato esperado por FavoritesLayout
        const processedProperties = (properties || []).map((property) => {
          // Formatear precio
          let precio = 'Precio a consultar';
          if (property.sale_price && property.sale_currency) {
            const symbol = property.sale_currency === 'USD' ? 'USD$' : property.sale_currency === 'DOP' ? 'DOP$' : `${property.sale_currency}$`;
            precio = `${symbol}${new Intl.NumberFormat('es-DO').format(property.sale_price)}`;
          } else if (property.rental_price && property.rental_currency) {
            const symbol = property.rental_currency === 'USD' ? 'USD$' : property.rental_currency === 'DOP' ? 'DOP$' : `${property.rental_currency}$`;
            precio = `${symbol}${new Intl.NumberFormat('es-DO').format(property.rental_price)}/mes`;
          }

          // Obtener imagen principal
          let imagen = property.main_image_url;
          if (!imagen && property.gallery_images_url) {
            try {
              const images = JSON.parse(property.gallery_images_url);
              if (Array.isArray(images) && images.length > 0) {
                const firstImage = images[0];
                imagen = typeof firstImage === 'string' ? firstImage : (firstImage?.url || null);
              }
            } catch (e) {
              imagen = property.gallery_images_url;
            }
          }

          return {
            id: property.id,
            code: property.code,
            titulo: property.name || property.private_name || 'Propiedad sin nombre',
            name: property.name,
            private_name: property.private_name,
            sector: property.sectors?.name || property.cities?.name || 'Ubicación no especificada',
            precio: precio,
            imagen: imagen,
            url: `/${property.slug_url}`,
            slug: property.slug_url,
            bedrooms: property.bedrooms || 0,
            bathrooms: property.bathrooms || 0,
            parking_spots: property.parking_spots || 0,
            area: property.built_area || property.land_area || 0,
            property_type: property.property_categories?.name || 'Propiedad',
            property_status: property.property_status || 'Disponible'
          };
        });

        return new Response(
          JSON.stringify({ properties: processedProperties }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      // ===== REACTIONS: Obtener todas las reacciones de la lista =====
      if (action === 'reactions') {
        console.log('📊 Getting reactions for list');

        const { data: reactions, error: reactionsError } = await supabase
          .from('favorite_reactions')
          .select('*')
          .eq('list_id', deviceId)
          .order('created_at', { ascending: false });

        if (reactionsError) {
          console.error('Error fetching reactions:', reactionsError);
          throw reactionsError;
        }

        // Organizar reacciones por propiedad
        const reactionsByProperty: any = {};

        (reactions || []).forEach((reaction: any) => {
          const propId = reaction.property_id;
          if (!reactionsByProperty[propId]) {
            reactionsByProperty[propId] = {
              likes: [],
              dislikes: [],
              comments: []
            };
          }

          if (reaction.reaction_type === 'like') {
            reactionsByProperty[propId].likes.push(reaction);
          } else if (reaction.reaction_type === 'dislike') {
            reactionsByProperty[propId].dislikes.push(reaction);
          } else if (reaction.reaction_type === 'comment') {
            reactionsByProperty[propId].comments.push(reaction);
          }
        });

        return new Response(
          JSON.stringify({ reactions: reactionsByProperty }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      // ===== GET DEFAULT: Solo IDs de favoritos =====
      // Buscar o crear lista de favoritos para este dispositivo
      let { data: favoritesList, error: fetchError } = await supabase
        .from('device_favorites')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching favorites:', fetchError);
        throw fetchError;
      }

      // Si no existe, crear una nueva lista
      if (!favoritesList) {
        console.log('📝 Creating new favorites list for device:', deviceId);

        const { data: newList, error: insertError } = await supabase
          .from('device_favorites')
          .insert({
            device_id: deviceId,
            properties: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating favorites list:', insertError);
          throw insertError;
        }

        favoritesList = newList;
      } else {
        // Actualizar updated_at
        await supabase
          .from('device_favorites')
          .update({ updated_at: new Date().toISOString() })
          .eq('device_id', deviceId);
      }

      return new Response(
        JSON.stringify({
          deviceId: favoritesList.device_id,
          properties: favoritesList.properties || [],
          email: favoritesList.email,
          count: (favoritesList.properties || []).length,
          updatedAt: favoritesList.updated_at
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // ===== POST: Agregar/Remover favoritos =====
    if (req.method === 'POST') {
      const body = await req.json();

      // Buscar lista existente
      let { data: favoritesList, error: fetchError } = await supabase
        .from('device_favorites')
        .select('*')
        .eq('device_id', deviceId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error fetching favorites:', fetchError);
        throw fetchError;
      }

      // Si no existe, crear
      if (!favoritesList) {
        const { data: newList, error: insertError } = await supabase
          .from('device_favorites')
          .insert({
            device_id: deviceId,
            properties: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating favorites list:', insertError);
          throw insertError;
        }

        favoritesList = newList;
      }

      let properties = favoritesList.properties || [];

      // ===== ADD: Agregar propiedad =====
      if (action === 'add' && body.propertyId) {
        if (!properties.includes(body.propertyId)) {
          properties.push(body.propertyId);
          console.log('➕ Adding property:', body.propertyId);
        }
      }

      // ===== REMOVE: Remover propiedad =====
      else if (action === 'remove' && body.propertyId) {
        properties = properties.filter(id => id !== body.propertyId);
        console.log('➖ Removing property:', body.propertyId);
      }

      // ===== EMAIL: Actualizar email =====
      else if (action === 'email' && body.email) {
        console.log('📧 Updating email:', body.email);

        const { data: updated, error: updateError } = await supabase
          .from('device_favorites')
          .update({
            email: body.email,
            updated_at: new Date().toISOString()
          })
          .eq('device_id', deviceId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating email:', updateError);
          throw updateError;
        }

        return new Response(
          JSON.stringify({
            deviceId: updated.device_id,
            properties: updated.properties || [],
            email: updated.email,
            count: (updated.properties || []).length
          }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      // ===== JOIN: Registrar visitante =====
      else if (action === 'join') {
        console.log('👋 Registering visitor');

        const { visitorAlias, visitorDeviceId } = body;

        if (!visitorAlias || !visitorDeviceId) {
          return new Response(
            JSON.stringify({ error: 'Missing visitor information' }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }

        // Insertar o actualizar visitante
        const { data: visitor, error: visitorError } = await supabase
          .from('favorite_visitors')
          .upsert({
            list_id: deviceId,
            visitor_device_id: visitorDeviceId,
            visitor_alias: visitorAlias,
            last_seen: new Date().toISOString()
          }, {
            onConflict: 'list_id,visitor_device_id'
          })
          .select()
          .single();

        if (visitorError) {
          console.error('Error registering visitor:', visitorError);
          throw visitorError;
        }

        return new Response(
          JSON.stringify({
            success: true,
            visitor: {
              deviceId: visitor.visitor_device_id,
              alias: visitor.visitor_alias
            }
          }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      // ===== REACT: Agregar reacción (like, dislike, comment) =====
      else if (action === 'react') {
        console.log('👍 Adding reaction');

        const { propertyId, reactionType, visitorDeviceId, commentText } = body;

        if (!propertyId || !reactionType || !visitorDeviceId) {
          return new Response(
            JSON.stringify({ error: 'Missing required fields' }),
            { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
          );
        }

        // Obtener alias del visitante
        const { data: visitor } = await supabase
          .from('favorite_visitors')
          .select('visitor_alias')
          .eq('list_id', deviceId)
          .eq('visitor_device_id', visitorDeviceId)
          .maybeSingle();

        const visitorAlias = visitor?.visitor_alias || 'Visitante';

        // Insertar reacción
        const reactionData: any = {
          list_id: deviceId,
          property_id: propertyId,
          visitor_device_id: visitorDeviceId,
          visitor_alias: visitorAlias,
          reaction_type: reactionType,
          created_at: new Date().toISOString()
        };

        if (reactionType === 'comment' && commentText) {
          reactionData.comment_text = commentText;
        }

        // Si es like o dislike, primero verificar si ya existe y eliminarla
        if (reactionType === 'like' || reactionType === 'dislike') {
          await supabase
            .from('favorite_reactions')
            .delete()
            .eq('list_id', deviceId)
            .eq('property_id', propertyId)
            .eq('visitor_device_id', visitorDeviceId)
            .in('reaction_type', ['like', 'dislike']);
        }

        const { error: insertError } = await supabase
          .from('favorite_reactions')
          .insert(reactionData);

        if (insertError) {
          console.error('Error inserting reaction:', insertError);
          throw insertError;
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Reaction saved' }),
          { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
        );
      }

      // Actualizar la lista
      const { data: updated, error: updateError } = await supabase
        .from('device_favorites')
        .update({
          properties,
          updated_at: new Date().toISOString()
        })
        .eq('device_id', deviceId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating favorites:', updateError);
        throw updateError;
      }

      return new Response(
        JSON.stringify({
          deviceId: updated.device_id,
          properties: updated.properties || [],
          email: updated.email,
          count: (updated.properties || []).length
        }),
        { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // Método no permitido
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Error in favorites function:', error);

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
