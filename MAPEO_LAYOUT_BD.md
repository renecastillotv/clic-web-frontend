# Mapeo Layout-BD: Guía de API para Frontend

> **Documento de referencia para desarrollo de handlers de API**
> Este documento mapea cada layout del frontend con las tablas y campos de la base de datos Neon necesarios para construir los endpoints de API.

---

## Índice Rápido

| Layout | Tablas Principales | Handler Sugerido |
|--------|-------------------|------------------|
| [HomepageLayout](#1-homepagelayout) | propiedades, perfiles_asesor, testimonios, videos, articulos, faqs | `homepage.handler` |
| [PropertyListLayout](#2-propertylistlayout) | propiedades, ubicaciones, categorias_propiedades, amenidades | `properties.handler` |
| [SinglePropertyLayout](#3-singlepropertylayout) | propiedades, perfiles_asesor, amenidades, ubicaciones | `property-single.handler` |
| [ProjectLayout](#4-projectlayout) | propiedades (is_project=true), unidades_proyecto | `project.handler` |
| [AdvisorsLayout](#5-advisorslayout) | perfiles_asesor, usuarios | `advisors.handler` |
| [SingleAdvisorLayout](#6-singleadvisorlayout) | perfiles_asesor, usuarios, propiedades, testimonios | `advisor-single.handler` |
| [ArticlesMainLayout](#7-articlesmainlayout) | articulos, categorias_contenido | `articles.handler` |
| [ArticlesCategoryLayout](#8-articlescategorylayout) | articulos, categorias_contenido | `articles.handler` |
| [ArticlesSingleLayout](#9-articlessinglelayout) | articulos, usuarios, contenido_relaciones | `article-single.handler` |
| [VideosMainLayout](#10-videosmainlayout) | videos, categorias_contenido | `videos.handler` |
| [VideosCategoryLayout](#11-videoscategorylayout) | videos, categorias_contenido | `videos.handler` |
| [VideosSingleLayout](#12-videossinglelayout) | videos, usuarios, contenido_relaciones | `video-single.handler` |
| [TestimonialsMainLayout](#13-testimonialsmainlayout) | testimonios, categorias_contenido | `testimonials.handler` |
| [TestimonialsCategoryLayout](#14-testimonialscategorylayout) | testimonios, categorias_contenido | `testimonials.handler` |
| [TestimonialsSingleLayout](#15-testimonialssinglelayout) | testimonios, propiedades, perfiles_asesor | `testimonial-single.handler` |
| [FavoritesLayout](#16-favoriteslayout) | propiedades (IDs desde localStorage) | `favorites.handler` |
| [FAQsLayout](#17-faqslayout) | faqs, categorias_contenido | `faqs.handler` |

---

## Convenciones de Transformación

### snake_case (BD) → camelCase (Frontend)

```typescript
// Ejemplo de transformación automática
const transformar = (row: DBRow): FrontendObject => ({
  id: row.id,
  clientName: row.cliente_nombre,        // snake_case → camelCase
  clientAvatar: row.cliente_foto,
  publishedAt: row.fecha_publicacion,
  yearsExperience: row.experiencia_anos,
});
```

### Campos JSONB

Los campos JSONB en la BD se devuelven directamente al frontend. Ejemplos:
- `traducciones` → objeto con claves `es`, `en`, `fr`
- `especialidades` → array de strings
- `stats` → objeto con estadísticas

### Filtro Multi-tenant

**CRÍTICO**: Todas las queries DEBEN filtrar por `tenant_id`:
```sql
WHERE tenant_id = :tenantId AND activo = true
```

---

## 1. HomepageLayout

### Handler: `homepage.handler.ts`

**Endpoint:** `GET /api/homepage`

### Tablas y Campos Requeridos

#### 1.1 Propiedades Destacadas
```sql
-- Tabla: propiedades
SELECT
  id,
  titulo AS name,
  slug,
  CONCAT('/propiedad/', slug) AS url,
  precio,
  precio_venta,
  precio_alquiler,
  moneda,
  imagen_principal AS image,
  imagenes AS images,
  ciudad AS city,
  sector,
  tipo AS category,
  habitaciones AS bedrooms,
  banos AS bathrooms,
  m2_construccion AS area,
  estacionamientos AS parking_spots,
  destacada AS featured,
  is_project,
  codigo AS code
FROM propiedades
WHERE tenant_id = :tenantId
  AND publicada = true
  AND activo = true
  AND destacada = true
ORDER BY updated_at DESC
LIMIT 12;
```

**Transformación:**
```typescript
interface Property {
  id: string;
  name: string;                    // ← titulo
  slug: string;
  url: string;                     // ← CONCAT('/propiedad/', slug)
  price: string;                   // ← formatPrice(precio, moneda)
  priceValue: number;              // ← precio
  image: string;                   // ← imagen_principal
  images: string[];                // ← imagenes (JSONB)
  location: string;                // ← CONCAT(ciudad, ', ', sector)
  city: string;                    // ← ciudad
  sector: string;
  category: string;                // ← tipo
  bedrooms: number;                // ← habitaciones
  bathrooms: number;               // ← banos
  area: number;                    // ← m2_construccion
  parking_spots: number;           // ← estacionamientos
  featured: boolean;               // ← destacada
  is_project: boolean;
  code: string;                    // ← codigo
}
```

#### 1.2 Asesores Destacados
```sql
-- Tabla: perfiles_asesor + usuarios
SELECT
  pa.id,
  CONCAT(u.nombre, ' ', u.apellido) AS name,
  pa.foto_url AS avatar,
  pa.titulo_profesional AS position,
  pa.especialidades AS specialties,
  pa.idiomas AS languagesSpoken,
  CONCAT('/asesores/', pa.slug) AS url,
  pa.telefono_directo AS phone,
  pa.whatsapp,
  u.email,
  pa.stats,
  pa.destacado AS featured
FROM perfiles_asesor pa
JOIN usuarios u ON pa.usuario_id = u.id
WHERE pa.tenant_id = :tenantId
  AND pa.activo = true
  AND pa.visible_en_web = true
  AND pa.destacado = true
ORDER BY pa.orden ASC, pa.stats->>'propiedades_vendidas' DESC
LIMIT 8;
```

**Transformación:**
```typescript
interface Advisor {
  id: string;
  name: string;                    // ← CONCAT(u.nombre, ' ', u.apellido)
  avatar: string;                  // ← foto_url
  position: string;                // ← titulo_profesional
  specialties: string[];           // ← especialidades (JSONB)
  languagesSpoken: string[];       // ← idiomas (JSONB)
  url: string;
  phone: string;                   // ← telefono_directo
  whatsapp: string;
  email: string;
  stats: {
    totalSales: number;            // ← stats.propiedades_vendidas
    yearsExperience: number;       // ← experiencia_anos
    clientSatisfaction: number;    // ← stats.calificacion_promedio
    activeListings: number;        // ← stats.propiedades_activas
  };
  featured: boolean;               // ← destacado
}
```

#### 1.3 Testimonios
```sql
-- Tabla: testimonios
SELECT
  id,
  titulo AS title,
  SUBSTRING(contenido, 1, 200) AS excerpt,
  contenido AS content,
  cliente_nombre AS clientName,
  cliente_foto AS clientAvatar,
  cliente_ubicacion AS clientLocation,
  cliente_cargo AS clientProfession,
  rating,
  CONCAT('/testimonios/', slug) AS url,
  fecha AS publishedAt,
  destacado AS featured
FROM testimonios
WHERE tenant_id = :tenantId
  AND publicado = true
ORDER BY destacado DESC, fecha DESC
LIMIT 6;
```

**Transformación:**
```typescript
interface Testimonial {
  id: string;
  title: string;                   // ← titulo
  excerpt: string;                 // ← SUBSTRING(contenido, 1, 200)
  content: string;                 // ← contenido
  clientName: string;              // ← cliente_nombre
  clientAvatar: string;            // ← cliente_foto
  clientLocation: string;          // ← cliente_ubicacion
  clientProfession: string;        // ← cliente_cargo
  rating: number;                  // ← rating (1-5)
  url: string;
  publishedAt: string;             // ← fecha (ISO 8601)
  featured: boolean;               // ← destacado
}
```

#### 1.4 Videos Destacados
```sql
-- Tabla: videos
SELECT
  id,
  titulo AS title,
  thumbnail,
  duracion_segundos,
  vistas AS views,
  CONCAT('/videos/', slug) AS url,
  video_id AS videoId,
  traducciones
FROM videos
WHERE tenant_id = :tenantId
  AND publicado = true
  AND destacado = true
ORDER BY fecha_publicacion DESC
LIMIT 4;
```

**Transformación:**
```typescript
interface Video {
  id: string;
  title: string;                   // ← titulo (o traducciones[lang].titulo)
  thumbnail: string;
  duration: string;                // ← formatDuration(duracion_segundos)
  views: number;                   // ← vistas
  url: string;
  videoId: string;                 // ← video_id (YouTube ID)
}

// Helper
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

#### 1.5 Artículos Destacados
```sql
-- Tabla: articulos
SELECT
  id,
  titulo AS title,
  extracto AS excerpt,
  imagen_principal AS featuredImage,
  CONCAT('/articulos/', slug) AS url,
  fecha_publicacion AS publishedAt,
  vistas AS views,
  autor_nombre,
  autor_foto,
  traducciones
FROM articulos
WHERE tenant_id = :tenantId
  AND publicado = true
  AND destacado = true
ORDER BY fecha_publicacion DESC
LIMIT 4;
```

**Transformación:**
```typescript
interface Article {
  id: string;
  title: string;                   // ← titulo
  excerpt: string;                 // ← extracto
  featuredImage: string;           // ← imagen_principal
  url: string;
  publishedAt: string;             // ← fecha_publicacion (ISO 8601)
  readTime: string;                // ← calcular desde contenido
  views: number;                   // ← vistas
  author: {
    name: string;                  // ← autor_nombre
    avatar: string;                // ← autor_foto
  };
}
```

#### 1.6 FAQs
```sql
-- Tabla: faqs
SELECT
  id,
  pregunta AS question,
  respuesta AS answer,
  traducciones
FROM faqs
WHERE tenant_id = :tenantId
  AND publicado = true
  AND (contexto IS NULL OR contexto = 'homepage')
ORDER BY orden ASC
LIMIT 10;
```

**Transformación:**
```typescript
interface FAQ {
  id: string;
  question: string;                // ← pregunta (o traducciones[lang].pregunta)
  answer: string;                  // ← respuesta (HTML permitido)
}
```

#### 1.7 Search Tags (HotItems)
```sql
-- Ciudades populares
SELECT
  nombre AS label,
  slug AS value,
  (SELECT COUNT(*) FROM propiedades p
   WHERE p.ubicacion_id = u.id AND p.publicada = true) AS count,
  'city' AS type
FROM ubicaciones u
WHERE tipo = 'ciudad'
  AND activo = true
  AND mostrar_en_filtros = true
ORDER BY count DESC
LIMIT 10;

-- Sectores populares
SELECT
  nombre AS label,
  slug AS value,
  (SELECT COUNT(*) FROM propiedades p
   WHERE p.ubicacion_id = u.id AND p.publicada = true) AS count,
  'sector' AS type
FROM ubicaciones u
WHERE tipo = 'sector'
  AND activo = true
  AND mostrar_en_filtros = true
ORDER BY count DESC
LIMIT 10;
```

---

## 2. PropertyListLayout

### Handler: `properties.handler.ts`

**Endpoints:**
- `GET /api/properties?operation=sale&city=punta-cana&page=1`
- `GET /api/properties?operation=rent&type=apartment`

### Query Principal
```sql
SELECT
  p.id,
  p.titulo AS name,
  p.slug,
  CONCAT('/propiedad/', p.slug) AS url,
  p.codigo AS code,
  p.precio,
  p.precio_venta,
  p.precio_alquiler,
  p.moneda,
  p.imagen_principal AS main_image_optimized,
  p.imagenes AS images_unified,
  p.ciudad,
  p.sector,
  p.latitud AS lat,
  p.longitud AS lng,
  p.tipo AS category,
  p.habitaciones AS bedrooms,
  p.banos AS bathrooms,
  p.m2_construccion AS built_area,
  p.m2_terreno AS land_area,
  p.estacionamientos AS parking_spots,
  p.estado_propiedad AS property_status,
  p.destacada AS featured,
  p.is_project,
  p.is_furnished,
  p.amenidades,
  p.created_at
FROM propiedades p
WHERE p.tenant_id = :tenantId
  AND p.publicada = true
  AND p.activo = true
  -- Filtros dinámicos
  AND (:operation IS NULL OR p.operacion = :operation)
  AND (:city IS NULL OR p.ciudad ILIKE :city)
  AND (:sector IS NULL OR p.sector ILIKE :sector)
  AND (:type IS NULL OR p.tipo = :type)
  AND (:priceMin IS NULL OR p.precio >= :priceMin)
  AND (:priceMax IS NULL OR p.precio <= :priceMax)
  AND (:bedroomsMin IS NULL OR p.habitaciones >= :bedroomsMin)
ORDER BY
  CASE WHEN :sortBy = 'price-asc' THEN p.precio END ASC,
  CASE WHEN :sortBy = 'price-desc' THEN p.precio END DESC,
  CASE WHEN :sortBy = 'date-desc' THEN p.created_at END DESC,
  p.destacada DESC, p.updated_at DESC
LIMIT :perPage OFFSET :offset;
```

### Filtros Disponibles
```sql
-- Ciudades con conteo
SELECT DISTINCT
  ciudad AS value,
  ciudad AS label,
  COUNT(*) AS count
FROM propiedades
WHERE tenant_id = :tenantId AND publicada = true
GROUP BY ciudad;

-- Tipos de propiedad
SELECT
  slug AS value,
  nombre AS label,
  (SELECT COUNT(*) FROM propiedades p
   WHERE p.tipo = cp.slug AND p.publicada = true) AS count
FROM categorias_propiedades cp
WHERE activo = true;

-- Amenidades disponibles
SELECT
  codigo AS value,
  nombre AS label,
  icono AS icon
FROM amenidades
WHERE activo = true
ORDER BY orden;
```

### Transformación Pricing Unified
```typescript
interface PricingUnified {
  sale?: { amount: number; currency: string; formatted: string };
  rent?: { amount: number; currency: string; formatted: string };
  rent_furnished?: { amount: number; currency: string; formatted: string };
}

function buildPricingUnified(row: DBRow): PricingUnified {
  const pricing: PricingUnified = {};

  if (row.precio_venta) {
    pricing.sale = {
      amount: row.precio_venta,
      currency: row.moneda,
      formatted: formatPrice(row.precio_venta, row.moneda)
    };
  }

  if (row.precio_alquiler) {
    pricing.rent = {
      amount: row.precio_alquiler,
      currency: row.moneda,
      formatted: formatPrice(row.precio_alquiler, row.moneda) + '/mes'
    };
  }

  return pricing;
}
```

---

## 3. SinglePropertyLayout

### Handler: `property-single.handler.ts`

**Endpoint:** `GET /api/property/:slug`

### Query Principal - Propiedad
```sql
SELECT
  p.*,
  -- Ubicación estructurada
  u_sector.nombre AS sector_name,
  u_sector.slug AS sector_slug,
  u_ciudad.nombre AS city_name,
  u_ciudad.slug AS city_slug,
  u_provincia.nombre AS province_name,
  -- Tipo de propiedad
  cp.nombre AS property_type_name,
  cp.slug AS property_type_slug
FROM propiedades p
LEFT JOIN ubicaciones u_sector ON p.ubicacion_id = u_sector.id
LEFT JOIN ubicaciones u_ciudad ON u_sector.parent_id = u_ciudad.id
LEFT JOIN ubicaciones u_provincia ON u_ciudad.parent_id = u_provincia.id
LEFT JOIN categorias_propiedades cp ON p.tipo = cp.slug
WHERE p.tenant_id = :tenantId
  AND p.slug = :slug
  AND p.publicada = true
  AND p.activo = true;
```

### Query - Amenidades de la Propiedad
```sql
SELECT
  a.id,
  a.nombre AS name,
  a.icono AS icon,
  a.categoria AS category
FROM amenidades a
WHERE a.codigo = ANY(:amenidadesCodes)
  AND a.activo = true
ORDER BY a.categoria, a.orden;
```

> **Nota:** Los códigos de amenidades vienen del campo JSONB `amenidades` de la propiedad.

### Query - Agente/Asesor
```sql
SELECT
  pa.id,
  pa.slug,
  CONCAT(u.nombre, ' ', u.apellido) AS name,
  pa.foto_url AS avatar,
  pa.titulo_profesional AS position,
  pa.telefono_directo AS phone,
  pa.whatsapp,
  u.email,
  pa.biografia AS bio,
  pa.especialidades AS specialties,
  pa.idiomas AS languagesSpoken,
  pa.stats
FROM perfiles_asesor pa
JOIN usuarios u ON pa.usuario_id = u.id
WHERE pa.id = :perfilAsesorId
  AND pa.activo = true;
```

### Query - Propiedades Similares
```sql
SELECT
  id, titulo, slug, precio, moneda, imagen_principal,
  ciudad, tipo, habitaciones, banos, m2_construccion
FROM propiedades
WHERE tenant_id = :tenantId
  AND publicada = true
  AND activo = true
  AND id != :currentPropertyId
  AND (tipo = :currentType OR ciudad = :currentCity)
ORDER BY
  CASE WHEN tipo = :currentType AND ciudad = :currentCity THEN 1
       WHEN tipo = :currentType THEN 2
       WHEN ciudad = :currentCity THEN 3
       ELSE 4 END,
  ABS(precio - :currentPrice)
LIMIT 6;
```

### Transformación Completa
```typescript
interface PropertyDetail {
  id: string;
  slug: string;
  url: string;
  code: string;                    // ← codigo

  // Contenido
  name: string;                    // ← titulo
  private_name: string;            // ← nombre_privado
  description: string;             // ← descripcion (HTML)
  short_description: string;       // ← short_description

  // Imágenes
  main_image_optimized: string;    // ← imagen_principal
  images_unified: ImageInfo[];     // ← imagenes (JSONB transformado)
  virtual_tour_url: string;        // ← tour_virtual_url
  video_url: string;               // ← video_url

  // Ubicación
  address: string;                 // ← direccion
  sectors: { id, name, slug };     // ← JOIN ubicaciones
  cities: { id, name, slug };      // ← JOIN ubicaciones
  provinces: { id, name };         // ← JOIN ubicaciones
  coordinates: { lat, lng };       // ← latitud, longitud

  // Precios
  pricing_unified: PricingUnified;
  sale_price: number;              // ← precio_venta
  sale_currency: string;           // ← moneda
  rent_price: number;              // ← precio_alquiler
  rent_currency: string;           // ← moneda

  // Categoría
  property_types: { id, type, slug };
  property_status: string;         // ← estado_propiedad

  // Características
  bedrooms: number;                // ← habitaciones
  bathrooms: number;               // ← banos
  half_bathrooms: number;          // ← medios_banos
  built_area: number;              // ← m2_construccion
  land_area: number;               // ← m2_terreno
  parking_spots: number;           // ← estacionamientos
  floors: number;                  // ← pisos
  year_built: number;              // ← year_built

  // Amenidades
  property_amenities: PropertyAmenity[];

  // Features adicionales
  features: string[];              // ← caracteristicas (JSONB)

  // Flags
  featured: boolean;               // ← destacada
  is_project: boolean;
  is_furnished: boolean;

  // Fechas
  created_at: string;
  updated_at: string;

  // Stats
  views: number;                   // ← (contador externo o campo)
}
```

---

## 4. ProjectLayout

### Handler: `project.handler.ts`

**Endpoint:** `GET /api/project/:slug`

### Query Principal
```sql
SELECT
  p.*,
  -- Campos específicos de proyecto
  p.tipologias,
  p.planes_pago,
  p.etapas,
  p.beneficios,
  p.garantias
FROM propiedades p
WHERE p.tenant_id = :tenantId
  AND p.slug = :slug
  AND p.is_project = true
  AND p.publicada = true
  AND p.activo = true;
```

### Query - Unidades del Proyecto
```sql
SELECT
  id,
  codigo,
  tipologia_nombre AS name,
  habitaciones AS bedrooms,
  banos AS bathrooms,
  m2 AS built_area,
  precio AS sale_price_from,
  moneda,
  torre,
  piso,
  nivel,
  estado,
  orden
FROM unidades_proyecto
WHERE propiedad_id = :projectId
  AND tenant_id = :tenantId
ORDER BY orden, tipologia_nombre;
```

### Transformación Tipologías
```typescript
interface ProjectTypology {
  id: string;
  name: string;                    // ← tipologia_nombre
  bedrooms: number;                // ← habitaciones
  bathrooms: number;               // ← banos
  built_area: number;              // ← m2
  sale_price_from: number;         // ← MIN(precio) del grupo
  sale_price_to: number;           // ← MAX(precio) del grupo
  available_units: number;         // ← COUNT WHERE estado = 'disponible'
  total_units: number;             // ← COUNT total
  is_sold_out: boolean;            // ← available_units === 0
  floor_plan_image: string;        // ← del JSONB tipologias
}

// Agrupar unidades por tipología
function groupTypologies(unidades: DBRow[]): ProjectTypology[] {
  const groups = new Map<string, DBRow[]>();

  unidades.forEach(u => {
    const key = u.tipologia_nombre || 'default';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(u);
  });

  return Array.from(groups.entries()).map(([name, units]) => ({
    id: units[0].id,
    name,
    bedrooms: units[0].habitaciones,
    bathrooms: units[0].banos,
    built_area: units[0].m2,
    sale_price_from: Math.min(...units.map(u => u.precio)),
    sale_price_to: Math.max(...units.map(u => u.precio)),
    available_units: units.filter(u => u.estado === 'disponible').length,
    total_units: units.length,
    is_sold_out: units.every(u => u.estado !== 'disponible'),
    floor_plan_image: null
  }));
}
```

### Transformación Planes de Pago
```typescript
// El campo planes_pago es JSONB en propiedades
interface PaymentPlan {
  id: string;
  plan_name: string;
  description: string;
  reservation_amount: number;
  reservation_percentage: number;
  separation_percentage: number;
  construction_percentage: number;
  delivery_percentage: number;
  financing_available: boolean;
  notes: string;
}

// Se lee directamente del JSONB
const paymentPlans: PaymentPlan[] = property.planes_pago || [];
```

---

## 5. AdvisorsLayout

### Handler: `advisors.handler.ts`

**Endpoint:** `GET /api/advisors`

### Query Principal
```sql
SELECT
  pa.id,
  pa.slug,
  CONCAT(u.nombre, ' ', u.apellido) AS name,
  pa.foto_url AS avatar,
  pa.titulo_profesional AS position,
  CONCAT('/asesores/', pa.slug) AS url,
  pa.especialidades AS specialties,
  pa.idiomas AS languagesSpoken,
  pa.destacado AS featured,
  pa.experiencia_anos,
  pa.stats,
  pa.orden
FROM perfiles_asesor pa
JOIN usuarios u ON pa.usuario_id = u.id
WHERE pa.tenant_id = :tenantId
  AND pa.activo = true
  AND pa.visible_en_web = true
ORDER BY pa.destacado DESC, pa.orden ASC, pa.stats->>'propiedades_vendidas' DESC;
```

### Estadísticas del Equipo
```sql
SELECT
  COUNT(*) AS totalAdvisors,
  SUM(experiencia_anos) AS totalExperience,
  SUM((stats->>'propiedades_vendidas')::int) AS totalSales,
  AVG((stats->>'calificacion_promedio')::float) AS averageSatisfaction
FROM perfiles_asesor
WHERE tenant_id = :tenantId
  AND activo = true
  AND visible_en_web = true;
```

### Transformación
```typescript
interface AdvisorListItem {
  id: string;
  name: string;
  avatar: string;                  // ← foto_url
  position: string;                // ← titulo_profesional
  url: string;
  specialties: string[];           // ← especialidades (JSONB)
  languagesSpoken: string[];       // ← idiomas (JSONB)
  featured: boolean;               // ← destacado
  stats: {
    totalSales: number;            // ← stats.propiedades_vendidas
    yearsExperience: number;       // ← experiencia_anos
    clientSatisfaction: number;    // ← stats.calificacion_promedio
    activeListings: number;        // ← stats.propiedades_activas
  };
}
```

---

## 6. SingleAdvisorLayout

### Handler: `advisor-single.handler.ts`

**Endpoint:** `GET /api/advisor/:slug`

### Query - Perfil del Asesor
```sql
SELECT
  pa.*,
  u.nombre,
  u.apellido,
  u.email,
  CONCAT('/asesores/', pa.slug) AS url
FROM perfiles_asesor pa
JOIN usuarios u ON pa.usuario_id = u.id
WHERE pa.tenant_id = :tenantId
  AND pa.slug = :slug
  AND pa.activo = true
  AND pa.visible_en_web = true;
```

### Query - Propiedades del Asesor
```sql
SELECT
  id, titulo, slug, precio, moneda, imagen_principal,
  ciudad, tipo, habitaciones, banos, m2_construccion
FROM propiedades
WHERE perfil_asesor_id = :advisorId
  AND publicada = true
  AND activo = true
ORDER BY destacada DESC, updated_at DESC
LIMIT 12;
```

### Query - Testimonios del Asesor
```sql
SELECT
  id, titulo, contenido, cliente_nombre, cliente_foto,
  cliente_ubicacion, rating, fecha, slug
FROM testimonios
WHERE asesor_id = (SELECT usuario_id FROM perfiles_asesor WHERE id = :advisorId)
  AND publicado = true
ORDER BY fecha DESC
LIMIT 6;
```

### Transformación Completa
```typescript
interface AdvisorDetail {
  id: string;
  external_id: string;             // ← (si existe en usuarios)
  name: string;                    // ← CONCAT(u.nombre, ' ', u.apellido)
  slug: string;
  url: string;

  // Imágenes
  avatar: string;                  // ← foto_url
  cover_image: string;             // ← (del JSONB metadata si existe)

  // Info profesional
  position: string;                // ← titulo_profesional
  bio: string;                     // ← biografia
  short_bio: string;               // ← SUBSTRING(biografia, 1, 200)

  // Contacto
  phone: string;                   // ← telefono_directo
  whatsapp: string;
  email: string;                   // ← u.email

  // Arrays
  specialties: string[];           // ← especialidades (JSONB)
  languagesSpoken: string[];       // ← idiomas (JSONB)
  serviceAreas: string[];          // ← zonas (JSONB)
  certifications: string[];        // ← certificaciones (JSONB)

  // Redes sociales
  socialLinks: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };                               // ← redes_sociales (JSONB)

  // Estadísticas
  stats: {
    totalSales: number;            // ← stats.propiedades_vendidas
    yearsExperience: number;       // ← experiencia_anos
    clientSatisfaction: number;    // ← stats.calificacion_promedio
    activeListings: number;        // ← stats.propiedades_activas
    totalClients: number;          // ← stats.total_resenas
    averageResponseTime: string;   // ← stats.tiempo_respuesta_hrs + ' horas'
  };

  // Fechas
  joined_at: string;               // ← fecha_inicio
}
```

---

## 7-9. ArticlesLayout (Main, Category, Single)

### Handler: `articles.handler.ts`

### Query - Lista de Artículos
```sql
SELECT
  a.id,
  a.titulo AS title,
  a.extracto AS excerpt,
  a.imagen_principal AS featuredImage,
  CONCAT('/articulos/', c.slug, '/', a.slug) AS url,
  a.fecha_publicacion AS publishedAt,
  a.vistas AS views,
  a.autor_nombre,
  a.autor_foto,
  a.traducciones,
  c.nombre AS categoryName,
  c.slug AS categorySlug
FROM articulos a
LEFT JOIN categorias_contenido c ON a.categoria_id = c.id
WHERE a.tenant_id = :tenantId
  AND a.publicado = true
  AND (:categorySlug IS NULL OR c.slug = :categorySlug)
ORDER BY a.destacado DESC, a.fecha_publicacion DESC
LIMIT :limit OFFSET :offset;
```

### Query - Categorías de Artículos
```sql
SELECT
  id,
  nombre AS name,
  slug,
  descripcion AS description,
  icono AS icon,
  color,
  (SELECT COUNT(*) FROM articulos WHERE categoria_id = cc.id AND publicado = true) AS articleCount
FROM categorias_contenido cc
WHERE cc.tenant_id = :tenantId
  AND cc.tipo = 'articulo'
  AND cc.activa = true
ORDER BY cc.orden;
```

### Query - Artículo Single
```sql
SELECT
  a.*,
  c.nombre AS categoryName,
  c.slug AS categorySlug,
  u.nombre AS authorName,
  u.avatar_url AS authorAvatar
FROM articulos a
LEFT JOIN categorias_contenido c ON a.categoria_id = c.id
LEFT JOIN usuarios u ON a.autor_id = u.id
WHERE a.tenant_id = :tenantId
  AND a.slug = :slug
  AND a.publicado = true;
```

### Query - Artículos Relacionados
```sql
-- Via contenido_relaciones
SELECT
  a.id, a.titulo, a.slug, a.extracto, a.imagen_principal
FROM articulos a
JOIN contenido_relaciones cr ON cr.id_destino = a.id
WHERE cr.tipo_origen = 'articulo'
  AND cr.id_origen = :articleId
  AND cr.tipo_destino = 'articulo'
  AND cr.activa = true
ORDER BY cr.orden
LIMIT 4;

-- Fallback: misma categoría
SELECT
  id, titulo, slug, extracto, imagen_principal
FROM articulos
WHERE categoria_id = :categoryId
  AND id != :articleId
  AND publicado = true
ORDER BY fecha_publicacion DESC
LIMIT 4;
```

---

## 10-12. VideosLayout (Main, Category, Single)

### Handler: `videos.handler.ts`

### Query - Lista de Videos
```sql
SELECT
  v.id,
  v.titulo AS title,
  v.descripcion AS description,
  v.thumbnail,
  v.duracion_segundos,
  v.video_id AS videoId,
  v.video_url AS videoUrl,
  v.vistas AS views,
  CONCAT('/videos/', c.slug, '/', v.slug) AS url,
  v.fecha_publicacion AS publishedAt,
  v.traducciones,
  c.nombre AS categoryName,
  c.slug AS categorySlug
FROM videos v
LEFT JOIN categorias_contenido c ON v.categoria_id = c.id
WHERE v.tenant_id = :tenantId
  AND v.publicado = true
  AND (:categorySlug IS NULL OR c.slug = :categorySlug)
ORDER BY v.destacado DESC, v.fecha_publicacion DESC
LIMIT :limit OFFSET :offset;
```

### Query - Categorías de Videos
```sql
SELECT
  id,
  nombre AS name,
  slug,
  descripcion AS description,
  icono AS icon,
  (SELECT COUNT(*) FROM videos WHERE categoria_id = cc.id AND publicado = true) AS videoCount
FROM categorias_contenido cc
WHERE cc.tenant_id = :tenantId
  AND cc.tipo = 'video'
  AND cc.activa = true
ORDER BY cc.orden;
```

### Transformación Video
```typescript
interface Video {
  id: string;
  title: string;                   // ← titulo
  description: string;             // ← descripcion
  thumbnail: string;
  duration: string;                // ← formatDuration(duracion_segundos)
  videoId: string;                 // ← video_id (YouTube ID)
  videoUrl: string;                // ← video_url
  embedCode: string;               // ← embed_code o generar desde video_id
  views: number;                   // ← vistas
  url: string;
  publishedAt: string;             // ← fecha_publicacion
  category: {
    name: string;
    slug: string;
  };
}

// Generar embed si no existe
function generateEmbed(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}
```

---

## 13-15. TestimonialsLayout (Main, Category, Single)

### Handler: `testimonials.handler.ts`

### Query - Lista de Testimonios
```sql
SELECT
  t.id,
  t.titulo AS title,
  SUBSTRING(t.contenido, 1, 200) AS excerpt,
  t.cliente_nombre AS clientName,
  t.cliente_foto AS clientAvatar,
  t.cliente_ubicacion AS clientLocation,
  t.cliente_cargo AS clientProfession,
  t.cliente_empresa AS clientCompany,
  t.rating,
  CONCAT('/testimonios/', c.slug, '/', t.slug) AS url,
  t.fecha AS publishedAt,
  t.verificado AS verified,
  t.traducciones,
  c.nombre AS categoryName,
  c.slug AS categorySlug
FROM testimonios t
LEFT JOIN categorias_contenido c ON t.categoria_id = c.id
WHERE t.tenant_id = :tenantId
  AND t.publicado = true
  AND (:categorySlug IS NULL OR c.slug = :categorySlug)
ORDER BY t.destacado DESC, t.fecha DESC
LIMIT :limit OFFSET :offset;
```

### Query - Testimonio Single con Propiedad Relacionada
```sql
SELECT
  t.*,
  c.nombre AS categoryName,
  c.slug AS categorySlug,
  -- Propiedad relacionada
  p.titulo AS propertyName,
  p.slug AS propertySlug,
  p.imagen_principal AS propertyImage,
  -- Asesor relacionado
  CONCAT(u.nombre, ' ', u.apellido) AS advisorName,
  pa.slug AS advisorSlug,
  pa.foto_url AS advisorAvatar
FROM testimonios t
LEFT JOIN categorias_contenido c ON t.categoria_id = c.id
LEFT JOIN propiedades p ON t.propiedad_id = p.id
LEFT JOIN usuarios u ON t.asesor_id = u.id
LEFT JOIN perfiles_asesor pa ON pa.usuario_id = u.id
WHERE t.tenant_id = :tenantId
  AND t.slug = :slug
  AND t.publicado = true;
```

---

## 16. FavoritesLayout

### Handler: `favorites.handler.ts`

**Endpoint:** `POST /api/favorites` (recibe IDs desde localStorage)

### Query
```sql
SELECT
  id, titulo, slug, precio, moneda, imagen_principal,
  ciudad, sector, tipo, habitaciones, banos, m2_construccion,
  estacionamientos, destacada, is_project
FROM propiedades
WHERE id = ANY(:propertyIds)
  AND tenant_id = :tenantId
  AND publicada = true
  AND activo = true;
```

> **Nota:** El frontend envía los IDs almacenados en localStorage. El backend solo valida que existan y estén publicadas.

---

## 17. FAQsLayout

### Handler: `faqs.handler.ts`

**Endpoint:** `GET /api/faqs?context=general`

### Query
```sql
SELECT
  f.id,
  f.pregunta AS question,
  f.respuesta AS answer,
  f.traducciones,
  c.nombre AS categoryName,
  c.slug AS categorySlug
FROM faqs f
LEFT JOIN categorias_contenido c ON f.categoria_id = c.id
WHERE f.tenant_id = :tenantId
  AND f.publicado = true
  AND (:context IS NULL OR f.contexto = :context)
ORDER BY f.orden ASC;
```

### Contextos Disponibles
- `homepage` - FAQs para la página principal
- `property` - FAQs sobre propiedades
- `advisor` - FAQs sobre asesores
- `general` - FAQs generales
- `null` - Todas las FAQs

---

## Apéndice A: Tabla de Referencia Rápida

### Transformaciones de Campos Comunes

| Campo BD (snake_case) | Campo Frontend (camelCase) |
|-----------------------|---------------------------|
| `titulo` | `title` / `name` |
| `descripcion` | `description` |
| `imagen_principal` | `mainImage` / `featuredImage` |
| `fecha_publicacion` | `publishedAt` |
| `cliente_nombre` | `clientName` |
| `cliente_foto` | `clientAvatar` |
| `titulo_profesional` | `position` |
| `experiencia_anos` | `yearsExperience` |
| `propiedades_vendidas` | `totalSales` |
| `calificacion_promedio` | `clientSatisfaction` |
| `m2_construccion` | `builtArea` |
| `m2_terreno` | `landArea` |
| `habitaciones` | `bedrooms` |
| `banos` | `bathrooms` |
| `estacionamientos` | `parkingSpots` |
| `precio_venta` | `salePrice` |
| `precio_alquiler` | `rentPrice` |

### Campos JSONB Importantes

| Tabla | Campo | Contenido |
|-------|-------|-----------|
| `propiedades` | `amenidades` | Array de códigos de amenidades |
| `propiedades` | `imagenes` | Array de URLs de imágenes |
| `propiedades` | `tipologias` | Array de tipologías (proyectos) |
| `propiedades` | `planes_pago` | Array de planes de pago |
| `propiedades` | `traducciones` | { es: {...}, en: {...}, fr: {...} } |
| `perfiles_asesor` | `especialidades` | Array de strings |
| `perfiles_asesor` | `idiomas` | Array de códigos de idioma |
| `perfiles_asesor` | `stats` | Objeto con estadísticas |
| `perfiles_asesor` | `redes_sociales` | { linkedin, instagram, ... } |
| `ubicaciones` | `imagenes` | Array de URLs |
| `ubicaciones` | `stats` | Estadísticas de la ubicación |

---

## Apéndice B: Helpers Recomendados

```typescript
// formatPrice.ts
export function formatPrice(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount);
}

// formatDuration.ts
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// calculateReadTime.ts
export function calculateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const words = content.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min`;
}

// getTranslation.ts
export function getTranslation<T>(
  traducciones: Record<string, T>,
  field: keyof T,
  lang: string,
  fallback: string
): string {
  return traducciones?.[lang]?.[field] || fallback;
}

// snakeToCamel.ts
export function snakeToCamel(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key in obj) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}
```

---

## Apéndice C: Índices Recomendados para Performance

```sql
-- Propiedades más buscadas
CREATE INDEX idx_propiedades_busqueda ON propiedades(tenant_id, publicada, activo, operacion, tipo);
CREATE INDEX idx_propiedades_ubicacion ON propiedades(tenant_id, ciudad, sector);
CREATE INDEX idx_propiedades_precio ON propiedades(tenant_id, precio) WHERE publicada = true;

-- Perfiles de asesor
CREATE INDEX idx_perfiles_web ON perfiles_asesor(tenant_id, activo, visible_en_web, destacado);

-- Contenido publicado
CREATE INDEX idx_articulos_pub ON articulos(tenant_id, publicado, fecha_publicacion DESC);
CREATE INDEX idx_videos_pub ON videos(tenant_id, publicado, fecha_publicacion DESC);
CREATE INDEX idx_testimonios_pub ON testimonios(tenant_id, publicado, fecha DESC);
CREATE INDEX idx_faqs_pub ON faqs(tenant_id, publicado, contexto, orden);
```

---

> **Documento generado para el proyecto CLIC Inmobiliaria**
> Versión: 1.0
> Última actualización: Enero 2026
