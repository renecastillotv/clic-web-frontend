// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Estas variables deberían estar en variables de entorno
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos TypeScript para las tablas
export interface Property {
  id: number;
  slug: string;
  title: string;
  description: string;
  price: number;
  price_currency: string;
  property_type_id: number;
  location_id: number;
  address: string;
  bedrooms: number;
  bathrooms: number;
  half_bathrooms: number;
  parking_spaces: number;
  area_construction: number;
  area_total: number;
  status: 'disponible' | 'reservado' | 'vendido' | 'alquilado' | 'inactivo';
  transaction_type: 'venta' | 'alquiler' | 'venta_alquiler';
  meta_title?: string;
  meta_description?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  
  // Relaciones
  property_type?: PropertyType;
  location?: Location;
  featured_image?: string;
  images?: PropertyImage[];
  amenities?: Amenity[];
  advisors?: Advisor[];
}

export interface PropertyType {
  id: number;
  name: string;
  slug: string;
}

export interface Location {
  id: number;
  name: string;
  slug: string;
  parent_id?: number;
  type: 'pais' | 'provincia' | 'municipio' | 'sector';
  lat?: number;
  lng?: number;
}

export interface PropertyImage {
  id: number;
  property_id: number;
  url: string;
  alt_text?: string;
  caption?: string;
  is_featured: boolean;
  display_order: number;
}

export interface Amenity {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  category?: string;
}

export interface Advisor {
  id: number;
  slug: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  bio?: string;
  photo_url?: string;
  specialties?: string[];
  languages?: string[];
  active: boolean;
}

export interface Article {
  id: number;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  author_id?: number;
  category?: string;
  tags?: string[];
  featured_image?: string;
  meta_title?: string;
  meta_description?: string;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
  published_at?: string;
  
  // Relaciones
  author?: Advisor;
}

// Funciones de consulta
export async function getPropertyBySlug(slug: string) {
  const { data, error } = await supabase
    .from('properties')
    .select(`
      *,
      property_type:property_types(*),
      location:locations(*),
      images:property_images(*),
      amenities:property_amenities(amenity:amenities(*)),
      advisors:property_advisors(advisor:advisors(*))
    `)
    .eq('slug', slug)
    .eq('status', 'disponible')
    .single();
    
  if (error) {
    console.error('Error fetching property:', error);
    return null;
  }
  
  return data as Property;
}

export async function getPropertiesByFilters(filters: {
  transaction_type?: string;
  property_type?: string;
  location?: string;
  min_price?: number;
  max_price?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  limit?: number;
  offset?: number;
}) {
  let query = supabase
    .from('active_properties')
    .select('*', { count: 'exact' });
    
  // Aplicar filtros
  if (filters.transaction_type) {
    query = query.eq('transaction_type', filters.transaction_type);
  }
  
  if (filters.property_type) {
    query = query.eq('property_type_slug', filters.property_type);
  }
  
  if (filters.location) {
    query = query.eq('location_slug', filters.location);
  }
  
  if (filters.min_price) {
    query = query.gte('price', filters.min_price);
  }
  
  if (filters.max_price) {
    query = query.lte('price', filters.max_price);
  }
  
  if (filters.bedrooms) {
    query = query.eq('bedrooms', filters.bedrooms);
  }
  
  if (filters.bathrooms) {
    query = query.gte('bathrooms', filters.bathrooms);
  }
  
  // Paginación
  const limit = filters.limit || 12;
  const offset = filters.offset || 0;
  
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
    
  const { data, error, count } = await query;
  
  if (error) {
    console.error('Error fetching properties:', error);
    return { properties: [], total: 0 };
  }
  
  return { properties: data || [], total: count || 0 };
}

export async function getArticleBySlug(slug: string) {
  const { data, error } = await supabase
    .from('articles')
    .select(`
      *,
      author:advisors(*)
    `)
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
    
  if (error) {
    console.error('Error fetching article:', error);
    return null;
  }
  
  return data as Article;
}

export async function getAdvisorBySlug(slug: string) {
  const { data, error } = await supabase
    .from('advisors')
    .select('*')
    .eq('slug', slug)
    .eq('active', true)
    .single();
    
  if (error) {
    console.error('Error fetching advisor:', error);
    return null;
  }
  
  return data as Advisor;
}

// Función para parsear la URL y determinar el tipo de página
export async function getPageDataFromURL(segments: string[]) {
  const path = segments.join('/');
  
  // Patrones de URL
  if (path.startsWith('propiedad/')) {
    // Detalle de propiedad
    const slug = segments[1];
    const property = await getPropertyBySlug(slug);
    
    if (!property) return { type: '404' };
    
    return {
      type: 'property',
      property,
      meta: {
        title: property.meta_title || property.title,
        description: property.meta_description || property.description,
      }
    };
  }
  
  if (path.startsWith('articulos/') && segments.length > 1) {
    // Artículo del blog
    const slug = segments[segments.length - 1];
    const article = await getArticleBySlug(slug);
    
    if (!article) return { type: '404' };
    
    return {
      type: 'article',
      article,
      meta: {
        title: article.meta_title || article.title,
        description: article.meta_description || article.excerpt,
      }
    };
  }
  
  if (path.startsWith('asesores/') && segments.length === 2) {
    // Perfil de asesor
    const slug = segments[1];
    const advisor = await getAdvisorBySlug(slug);
    
    if (!advisor) return { type: '404' };
    
    return {
      type: 'advisor',
      advisor,
      meta: {
        title: `${advisor.first_name} ${advisor.last_name} - Asesor Inmobiliario`,
        description: advisor.bio || `Conoce a ${advisor.first_name} ${advisor.last_name}, asesor inmobiliario en CLIC.`,
      }
    };
  }
  
  // Listados de propiedades (comprar/alquilar)
  if (path.startsWith('comprar') || path.startsWith('alquilar')) {
    const filters: any = {
      transaction_type: path.startsWith('comprar') ? 'venta' : 'alquiler'
    };
    
    // Parsear segmentos adicionales
    if (segments.length > 1) {
      // Posible tipo de propiedad
      if (segments[1]) {
        filters.property_type = segments[1];
      }
      
      // Posible ubicación
      if (segments[2]) {
        filters.location = segments[2];
      }
      
      // Parsear filtros adicionales del URL
      // Ejemplo: /comprar/apartamento/naco/3-habitaciones/2-parqueos
      segments.slice(3).forEach(segment => {
        if (segment.includes('-habitaciones')) {
          filters.bedrooms = parseInt(segment);
        }
        if (segment.includes('-banos')) {
          filters.bathrooms = parseInt(segment);
        }
      });
    }
    
    const { properties, total } = await getPropertiesByFilters(filters);
    
    // Generar título dinámico
    let title = filters.transaction_type === 'venta' ? 'Propiedades en venta' : 'Propiedades en alquiler';
    if (filters.property_type) {
      title = `${filters.property_type}s ${filters.transaction_type === 'venta' ? 'en venta' : 'en alquiler'}`;
    }
    if (filters.location) {
      title += ` en ${filters.location}`;
    }
    
    return {
      type: 'property-list',
      listings: properties,
      total,
      filters,
      meta: {
        title: title.charAt(0).toUpperCase() + title.slice(1),
        description: `Encuentra ${title.toLowerCase()} en CLIC Inmobiliaria. ${total} propiedades disponibles.`
      }
    };
  }
  
  // Página no encontrada
  return { type: '404' };
}