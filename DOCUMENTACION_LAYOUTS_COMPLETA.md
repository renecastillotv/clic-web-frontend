# Documentación Completa de Layouts - Frontend Astro CLIC Inmobiliaria

> **Documento de referencia para desarrollo de API**
> Este documento contiene TODA la información necesaria para que un desarrollador senior construya los endpoints de API sin necesidad de revisar los archivos de layout.

---

## Índice de Layouts

| # | Layout | PageType | Ruta |
|---|--------|----------|------|
| 1 | [HomepageLayout](#1-homepagelayoutastro) | `homepage` | `/` |
| 2 | [PropertyListLayout](#2-propertylistlayoutastro) | `property-list` | `/comprar`, `/alquilar`, etc. |
| 3 | [SinglePropertyLayout](#3-singlepropertylayoutastro) | `property-single` | `/propiedad/{slug}` |
| 4 | [ProjectLayout](#4-projectlayoutastro) | `project` | `/proyecto/{slug}` |
| 5 | [AdvisorsLayout](#5-advisorslayoutastro) | `advisors-list` | `/asesores` |
| 6 | [SingleAdvisorLayout](#6-singleadvisorlayoutastro) | `advisor-single` | `/asesores/{slug}` |
| 7 | [ArticlesMainLayout](#7-articlesmainlayoutastro) | `articles-main` | `/articulos` |
| 8 | [ArticlesCategoryLayout](#8-articlescategorylayoutastro) | `articles-category` | `/articulos/{categoria}` |
| 9 | [ArticlesSingleLayout](#9-articlessinglelayoutastro) | `articles-single` | `/articulos/{categoria}/{slug}` |
| 10 | [VideosMainLayout](#10-videosmainlayoutastro) | `videos-main` | `/videos` |
| 11 | [VideosCategoryLayout](#11-videoscategorylayoutastro) | `videos-category` | `/videos/{categoria}` |
| 12 | [VideosSingleLayout](#12-videossinglelayoutastro) | `videos-single` | `/videos/{categoria}/{slug}` |
| 13 | [FavoritesLayout](#13-favoriteslayoutastro) | `favorites` | `/favoritos` |
| 14 | [SharedFavoritesLayout](#14-sharedfavoriteslayoutastro) | `shared-favorites` | `/favoritos/compartir` |
| 15 | [ContactLayout](#15-contactlayoutastro) | `contact` | `/contacto` |
| 16 | [SellLayout](#16-selllayoutastro) | `sell` | `/vender` |
| 17 | [LegalLayout](#17-legallayoutastro) | `legal` | `/terminos`, `/privacidad` |
| 18 | [LocationsLayout](#18-locationslayoutastro) | `locations` | `/ubicaciones` |
| 19 | [PropertyTypesLayout](#19-propertytypeslayoutastro) | `property-types` | `/tipos-de-propiedad` |
| 20 | [CuratedListingsLayout](#20-curatedlistingslayoutastro) | `curated-listings` | `/colecciones` |
| 21 | [CuratedListingsSingleLayout](#21-curatedlistingssinglelayoutastro) | `curated-listing-single` | `/colecciones/{slug}` |
| 22 | [VacationRentalsLayout](#22-vacationrentalslayoutastro) | `vacation-rentals-owners` | `/alquiler-vacacional` |
| 23 | [VacationRentalsMainLayout](#23-vacationrentalsmainlayoutastro) | `vacation-rentals-main` | `/alquiler-vacacional/buscar` |
| 24 | [VacationRentalsDynamicLayout](#24-vacationrentalsdynamiclayoutastro) | `vacation-rentals-dynamic` | `/alquiler-vacacional/{...}` |
| 25 | [TestimonialsMainLayout](#25-testimonialsmainlayoutastro) | `testimonials-main` | `/testimonios` |
| 26 | [TestimonialsCategoryLayout](#26-testimonialscategorylayoutastro) | `testimonials-category` | `/testimonios/{categoria}` |
| 27 | [TestimonialsSingleLayout](#27-testimonialssinglelayoutastro) | `testimonials-single` | `/testimonios/{categoria}/{slug}` |

---

## Convenciones Generales

### Formato de Datos
- **snake_case**: Campos que vienen directamente de la base de datos
- **camelCase**: Campos procesados/transformados por el backend
- **Arrays vacíos**: Siempre devolver `[]`, nunca `null`
- **Objetos vacíos**: Siempre devolver `{}`, nunca `null`

### Idiomas Soportados
```typescript
type Language = 'es' | 'en' | 'fr';
```

### Estructura Base de Respuesta
```typescript
interface BaseResponse {
  language: string;           // 'es' | 'en' | 'fr'
  globalConfig?: object;      // Configuración global del tenant
  trackingString?: string;    // String para analytics
  hotItems?: HotItems;        // Items para búsqueda rápida
  country?: object;           // Información del país
  seo: SEOData;              // Datos SEO (siempre requerido)
}
```

### Estructura SEO Estándar
```typescript
interface SEOData {
  title: string;                      // Título de la página
  description: string;                // Meta description
  h1?: string;                        // Título principal
  h2?: string;                        // Subtítulo
  canonical_url: string;              // URL canónica
  ogImage: string;                    // Imagen para Open Graph
  keywords?: string;                  // Meta keywords
  hreflang: Record<string, string>;   // URLs por idioma
  breadcrumbs: Breadcrumb[];          // Migas de pan
  structured_data?: object;           // JSON-LD Schema.org
  open_graph?: OpenGraphData;         // Datos OG específicos
  twitter_card?: TwitterCardData;     // Datos Twitter Card
}

interface Breadcrumb {
  name: string;
  url: string;
}

interface OpenGraphData {
  title: string;
  description: string;
  image: string;
  url: string;
  type: string;                       // 'website', 'article', 'product', etc.
}

interface TwitterCardData {
  card: string;                       // 'summary_large_image'
  title: string;
  description: string;
  image: string;
}
```

---

## 1. HomepageLayout.astro

**Archivo:** `src/layouts/HomepageLayout.astro`
**PageType:** `homepage`
**Ruta:** `/`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Buscador principal con autocomplete y video background |
| 2 | **Search Tags** | Pills de búsqueda rápida por ubicación/tipo |
| 3 | **Property Carousel** | Carrusel de propiedades destacadas |
| 4 | **Testimonials Grid** | Grid de testimonios de clientes |
| 5 | **Advisors Section** | Asesores destacados |
| 6 | **Content Mix** | Videos y artículos combinados |
| 7 | **Founder Story** | Historia del fundador |
| 8 | **FAQ Section** | Preguntas frecuentes con acordeón |

### Datos Requeridos

```typescript
interface HomepageData extends BaseResponse {
  // SECCIONES (array ordenado)
  sections?: Section[];

  // ITEMS PARA BÚSQUEDA RÁPIDA
  hotItems: {
    cities: HotItem[];
    sectors: HotItem[];
    properties: HotItem[];
    agents: HotItem[];
    projects: HotItem[];
    custom: HotItem[];
  };

  // TAGS DE BÚSQUEDA (para pills del hero)
  searchTags: {
    tags: {
      provincia: SearchTag[];
      ciudad: SearchTag[];
      sector: SearchTag[];
      tipo: SearchTag[];
    };
    locationHierarchy?: LocationHierarchy;
    preselected?: object;
    currencies?: string[];
  };

  // PROPIEDADES DESTACADAS
  featuredProperties: Property[];

  // TESTIMONIOS
  testimonials: Testimonial[];

  // ASESORES DESTACADOS
  featuredAdvisors: Advisor[];

  // VIDEOS DESTACADOS
  featuredVideos: Video[];

  // ARTÍCULOS DESTACADOS
  featuredArticles: Article[];

  // FAQS
  faqs: FAQ[];

  // CONFIGURACIÓN DEL PAÍS
  countryConfig?: CountryConfig;
}

interface Section {
  type: 'hero' | 'property-carousel' | 'testimonials' | 'advisors' | 'content-mix' | 'founder-story' | 'faq';
  title?: string;
  subtitle?: string;
  data?: any;
  order: number;
}

interface HotItem {
  label: string;
  value: string;
  count?: number;
  type: 'city' | 'sector' | 'property' | 'agent' | 'project' | 'custom';
  url?: string;
}

interface SearchTag {
  label: string;
  value: string;
  slug: string;
  count?: number;
}

interface Property {
  id: string;
  name: string;
  slug: string;
  url: string;
  price: string;                      // Formateado: "USD $250,000"
  priceValue?: number;                // Valor numérico para ordenamiento
  image: string;
  images?: string[];
  location: string;
  city?: string;
  sector?: string;
  category?: string;                  // "Apartamento", "Villa", etc.
  bedrooms: number;
  bathrooms: number;
  area: number;                       // metros cuadrados
  parking_spots?: number;
  featured?: boolean;
  is_project?: boolean;
  code?: string;                      // Código interno
}

interface Testimonial {
  id: string;
  title: string;
  excerpt: string;
  content?: string;
  clientName: string;
  clientAvatar: string;
  clientLocation?: string;
  clientProfession?: string;
  rating: number;                     // 1-5
  url: string;
  publishedAt: string;                // ISO 8601
  featured?: boolean;
}

interface Advisor {
  id: string;
  name: string;
  avatar: string;
  position: string;
  specialties: string[];
  languagesSpoken: string[];
  url: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  stats?: {
    totalSales: number;
    yearsExperience: number;
    clientSatisfaction: number;       // Porcentaje o rating
    activeListings: number;
  };
  featured?: boolean;
}

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;                   // "10:30"
  views: number;
  url: string;
  videoId?: string;                   // YouTube ID
  author?: {
    name: string;
    avatar: string;
  };
}

interface Article {
  id: string;
  title: string;
  excerpt: string;
  featuredImage: string;
  url: string;
  publishedAt: string;
  readTime: string;                   // "5 min"
  views: number;
  author?: {
    name: string;
    avatar: string;
  };
  category?: string;
}

interface FAQ {
  id?: string;
  question: string;
  answer: string;                     // Puede contener HTML
}
```

### Valores por Defecto

| Campo | Valor Default |
|-------|---------------|
| `property.image` | Placeholder Unsplash |
| `testimonial.rating` | `5` |
| `advisor.avatar` | `/images/team/clic-experts.jpg` |
| `video.duration` | `'0:00'` |
| `article.readTime` | `'5 min'` |

---

## 2. PropertyListLayout.astro

**Archivo:** `src/layouts/PropertyListLayout.astro`
**PageType:** `property-list`
**Ruta:** `/comprar`, `/alquilar`, `/comprar/{ciudad}`, `/comprar/{ciudad}/{sector}`, etc.

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Header con título, descripción y stats |
| 2 | **Breadcrumbs** | Navegación jerárquica |
| 3 | **Filters Bar** | Filtros de búsqueda (precio, habitaciones, etc.) |
| 4 | **Sort Dropdown** | Ordenar por precio, fecha, relevancia |
| 5 | **Properties Grid** | Grid de tarjetas de propiedades |
| 6 | **Pagination** | Paginación server-side |
| 7 | **Map View** | Vista de mapa (toggle) |
| 8 | **Empty State** | Estado cuando no hay resultados |
| 9 | **Related Content** | Artículos/videos relacionados |

### Datos Requeridos

```typescript
interface PropertyListData extends BaseResponse {
  // CONFIGURACIÓN DE LA VISTA
  listType: 'sale' | 'rent' | 'rent-furnished' | 'rent-temporary' | 'projects';

  // FILTROS APLICADOS
  filters: {
    city?: string;
    sector?: string;
    propertyType?: string;
    priceMin?: number;
    priceMax?: number;
    bedroomsMin?: number;
    bedroomsMax?: number;
    bathroomsMin?: number;
    bathroomsMax?: number;
    areaMin?: number;
    areaMax?: number;
    amenities?: string[];
    features?: string[];
  };

  // PROPIEDADES
  properties: PropertyListItem[];

  // PAGINACIÓN
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  // ESTADÍSTICAS DE LA BÚSQUEDA
  stats: {
    totalProperties: number;
    averagePrice?: number;
    priceRange?: {
      min: number;
      max: number;
    };
  };

  // FILTROS DISPONIBLES (para UI)
  availableFilters: {
    cities: FilterOption[];
    sectors: FilterOption[];
    propertyTypes: FilterOption[];
    priceRanges: PriceRange[];
    amenities: FilterOption[];
  };

  // ORDENAMIENTO ACTUAL
  sortBy: 'relevance' | 'price-asc' | 'price-desc' | 'date-desc' | 'date-asc';

  // CONTENIDO RELACIONADO
  relatedContent?: {
    articles?: Article[];
    videos?: Video[];
  };

  // INFORMACIÓN DE UBICACIÓN (si aplica)
  locationInfo?: {
    name: string;
    description?: string;
    heroImage?: string;
    marketInsights?: MarketInsights;
  };
}

interface PropertyListItem {
  id: string;
  name: string;
  slug: string;
  url: string;
  code?: string;

  // PRECIOS (estructura unificada)
  pricing_unified: {
    sale?: PriceInfo;
    sale_furnished?: PriceInfo;
    rent?: PriceInfo;
    rent_furnished?: PriceInfo;
    rent_temporary?: PriceInfo;
  };

  // PRECIO PRINCIPAL (el más relevante para la vista)
  mainPrice: string;                  // Formateado: "USD $250,000"
  mainPriceValue: number;             // Para ordenamiento

  // IMÁGENES
  main_image_optimized: string;
  images_unified?: string[];

  // UBICACIÓN
  location: string;                   // "Punta Cana, La Altagracia"
  city: string;
  sector?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };

  // CATEGORÍA
  category: string;                   // "Apartamento", "Villa", etc.

  // CARACTERÍSTICAS
  bedrooms: number;
  bathrooms: number;
  built_area: number;
  land_area?: number;
  parking_spots: number;

  // ESTADO
  property_status?: string;           // "Disponible", "En negociación", etc.

  // FLAGS
  featured: boolean;
  is_project: boolean;
  is_new?: boolean;
  has_virtual_tour?: boolean;

  // AMENIDADES (simplificado para lista)
  amenityIcons?: string[];            // ["pool", "gym", "security"]
}

interface PriceInfo {
  amount: number;
  currency: string;
  formatted: string;                  // "USD $250,000"
}

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

interface PriceRange {
  min: number;
  max: number;
  label: string;
}

interface MarketInsights {
  averagePrice: number;
  pricePerSqm: number;
  daysOnMarket: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage?: number;
}
```

---

## 3. SinglePropertyLayout.astro

**Archivo:** `src/layouts/SinglePropertyLayout.astro`
**PageType:** `property-single`
**Ruta:** `/propiedad/{slug}`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Gallery** | Galería de imágenes con lightbox |
| 2 | **Breadcrumbs** | Navegación |
| 3 | **Property Header** | Título, precio, ubicación |
| 4 | **Quick Facts** | Características principales (hab, baños, m²) |
| 5 | **Price Section** | Precios disponibles (venta, alquiler, etc.) |
| 6 | **Description** | Descripción completa con HTML |
| 7 | **Amenities Grid** | Grid de amenidades con iconos |
| 8 | **Location Map** | Mapa interactivo |
| 9 | **Agent Card** | Tarjeta del agente con contacto |
| 10 | **Contact Form** | Formulario de consulta |
| 11 | **Similar Properties** | Propiedades similares |
| 12 | **Related Content** | Videos, artículos, FAQs |
| 13 | **Schema.org** | JSON-LD RealEstateListing |

### Datos Requeridos

```typescript
interface SinglePropertyData extends BaseResponse {
  property: PropertyDetail;

  // AGENTE/ASESOR
  agent: AgentInfo;

  // CONTENIDO RELACIONADO
  relatedContent: {
    similarProperties?: Property[];
    videos?: Video[];
    articles?: Article[];
    faqs?: FAQ[];
    testimonials?: Testimonial[];
  };

  // INFORMACIÓN DEL DOMINIO (para URLs absolutas)
  domainInfo?: {
    realDomain: string;
  };
}

interface PropertyDetail {
  // IDENTIFICACIÓN
  id: string;
  slug: string;
  url: string;
  code: string;                       // Código interno: "CLIC-1234"

  // CONTENIDO
  name: string;
  private_name?: string;              // Nombre interno
  description: string;                // HTML permitido
  short_description?: string;

  // IMÁGENES
  main_image_optimized: string;
  images_unified: ImageInfo[];
  virtual_tour_url?: string;
  video_url?: string;

  // UBICACIÓN
  address?: string;
  sectors: {
    id: string;
    name: string;
    slug: string;
  };
  cities: {
    id: string;
    name: string;
    slug: string;
  };
  provinces?: {
    id: string;
    name: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };

  // PRECIOS
  pricing_unified: {
    sale?: PriceDetail;
    sale_furnished?: PriceDetail;
    rent?: PriceDetail;
    rent_furnished?: PriceDetail;
    rent_temporary?: PriceDetail;
  };

  // Para retrocompatibilidad
  sale_price?: number;
  sale_currency?: string;
  rent_price?: number;
  rent_currency?: string;

  // CATEGORÍA Y TIPO
  property_types: {
    id: string;
    type: string;                     // "Apartamento", "Villa", "Penthouse"
    slug: string;
  };
  property_status: string;            // "Disponible", "Vendido", etc.

  // CARACTERÍSTICAS PRINCIPALES
  bedrooms: number;
  bathrooms: number;
  half_bathrooms?: number;
  built_area: number;
  land_area?: number;
  parking_spots: number;
  floors?: number;
  year_built?: number;

  // AMENIDADES
  property_amenities: PropertyAmenity[];

  // FEATURES ADICIONALES
  features?: string[];
  highlights?: string[];

  // FLAGS
  featured: boolean;
  is_project: boolean;
  is_furnished?: boolean;
  accepts_pets?: boolean;
  has_pool?: boolean;
  has_security?: boolean;

  // FECHAS
  created_at: string;
  updated_at: string;
  published_at?: string;

  // ESTADÍSTICAS
  views?: number;
  favorites_count?: number;
}

interface ImageInfo {
  url: string;
  alt?: string;
  caption?: string;
  order?: number;
}

interface PriceDetail {
  amount: number;
  currency: string;
  formatted: string;
  pricePerSqm?: number;
  maintenanceFee?: number;
}

interface PropertyAmenity {
  amenities: {
    id: string;
    name: string;
    icon: string;                     // Nombre de icono FA: "fa-swimming-pool"
    category?: string;
  };
}

interface AgentInfo {
  id: string;
  external_id?: string;
  name: string;
  avatar: string;
  position: string;
  phone: string;
  whatsapp: string;
  email: string;
  url?: string;
  bio?: string;
  specialties?: string[];
  languagesSpoken?: string[];
  stats?: {
    totalSales: number;
    yearsExperience: number;
    rating: number;
  };
}
```

---

## 4. ProjectLayout.astro

**Archivo:** `src/layouts/ProjectLayout.astro`
**PageType:** `project`
**Ruta:** `/proyecto/{slug}`

> **Nota:** Este layout es standalone (no usa Layout.astro base)

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Gallery** | Galería de imágenes del proyecto |
| 2 | **Project Header** | Nombre, estado, ubicación |
| 3 | **Quick Stats** | Unidades totales, completado, entrega |
| 4 | **Description** | Descripción del proyecto |
| 5 | **Typologies** | Tabla de tipologías (tipos de unidades) |
| 6 | **Payment Plans** | Planes de pago disponibles |
| 7 | **Benefits** | Beneficios del proyecto |
| 8 | **Amenities** | Amenidades del proyecto |
| 9 | **Location Map** | Ubicación en mapa |
| 10 | **Agent Card** | Información del agente |
| 11 | **FAQs** | Preguntas frecuentes |
| 12 | **Schema.org** | JSON-LD RealEstateProject |

### Datos Requeridos

```typescript
interface ProjectData extends BaseResponse {
  property: ProjectProperty;
  projectDetails: ProjectDetails;
  agent: AgentInfo;
  relatedContent: {
    faqs?: FAQ[];
  };
}

interface ProjectProperty {
  // IDENTIFICACIÓN
  id: string;
  slug: string;
  url: string;
  code: string;

  // CONTENIDO
  name: string;
  description: string;                // HTML permitido

  // IMÁGENES
  main_image_optimized: string;
  images_unified: ImageInfo[];
  floor_plans?: ImageInfo[];

  // UBICACIÓN
  sectors: {
    name: string;
    slug: string;
  };
  cities: {
    name: string;
    slug: string;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };

  // CARACTERÍSTICAS
  bedrooms: number;                   // Rango mínimo
  bathrooms: number;                  // Rango mínimo
  built_area: number;                 // Área desde
  parking_spots: number;

  // PRECIO
  sale_price: number;                 // Precio desde
  sale_currency: string;
  pricing_unified?: object;

  // AMENIDADES
  property_amenities: PropertyAmenity[];
}

interface ProjectDetails {
  // INFORMACIÓN DEL PROYECTO
  total_units: number;
  available_units?: number;
  sold_units?: number;

  // FECHAS
  estimated_completion_date?: string; // "2025-12-01"
  construction_start_date?: string;

  // ESTADO
  construction_status: string;        // "En construcción", "Pre-venta", "Entregado"
  sales_status: string;               // "Disponible", "Últimas unidades"
  completion_percentage?: number;     // 0-100

  // TIPOLOGÍAS
  project_typologies: ProjectTypology[];

  // PLANES DE PAGO
  project_payment_plans: PaymentPlan[];

  // BENEFICIOS
  project_benefits: ProjectBenefit[];
}

interface ProjectTypology {
  id: string;
  name: string;                       // "Tipo A", "2 Habitaciones"
  bedrooms: number;
  bathrooms: number;
  built_area: number;
  sale_price_from: number;
  sale_price_to?: number;
  available_units: number;
  total_units?: number;
  is_sold_out: boolean;
  floor_plan_image?: string;
}

interface PaymentPlan {
  id: string;
  plan_name: string;                  // "Plan Estándar", "Plan Flex"
  description?: string;
  reservation_amount: number;         // Monto de reserva
  reservation_percentage?: number;
  separation_percentage: number;      // % de separación
  construction_percentage: number;    // % durante construcción
  delivery_percentage: number;        // % a la entrega
  financing_available?: boolean;
  notes?: string;
}

interface ProjectBenefit {
  id: string;
  project_benefits_catalog: {
    id: string;
    name: string;
    description: string;
    icon?: string;
  };
  custom_description?: string;
}
```

---

## 5. AdvisorsLayout.astro

**Archivo:** `src/layouts/AdvisorsLayout.astro`
**PageType:** `advisors-list`
**Ruta:** `/asesores`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Header con estadísticas del equipo |
| 2 | **Featured Advisors** | Grid de asesores destacados (cards premium) |
| 3 | **Search Box** | Buscador de asesores |
| 4 | **Team Grid** | Grid de todos los asesores |
| 5 | **Team Properties** | Carrusel de propiedades del equipo |

### Datos Requeridos

```typescript
interface AdvisorsListData extends BaseResponse {
  // ASESORES
  advisors: AdvisorListItem[];

  // ASESORES DESTACADOS (explícitos)
  featuredAdvisors?: AdvisorListItem[];

  // ESTADÍSTICAS DEL EQUIPO
  stats?: {
    totalAdvisors: number;
    totalExperience: number;          // Años combinados
    totalSales: number;
    averageSatisfaction: number;      // Rating promedio
  };

  // PROPIEDADES DEL EQUIPO
  teamProperties?: Property[];
}

interface AdvisorListItem {
  id: string;
  name: string;
  avatar: string;                     // URL o null
  position: string;
  url: string;

  specialties: string[];              // ["Lujo", "Inversión", "Proyectos"]
  languagesSpoken: string[];          // ["Español", "English", "Français"]

  featured?: boolean;

  stats?: {
    totalSales: number;
    yearsExperience: number;
    clientSatisfaction: number;       // Rating 1-5 o porcentaje
    activeListings: number;
  };
}
```

### Lógica de Destacados

Si `featuredAdvisors` no viene explícito, se infieren por:
- `featured === true`
- `stats.totalSales > 10`
- `stats.yearsExperience > 3`

---

## 6. SingleAdvisorLayout.astro

**Archivo:** `src/layouts/SingleAdvisorLayout.astro`
**PageType:** `advisor-single`
**Ruta:** `/asesores/{slug}`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Profile Header** | Foto grande, nombre, posición |
| 2 | **Contact Buttons** | WhatsApp, Email, Llamar |
| 3 | **Stats Grid** | Estadísticas del asesor |
| 4 | **Bio Section** | Biografía completa |
| 5 | **Specialties** | Chips de especialidades |
| 6 | **Languages** | Idiomas que habla |
| 7 | **Properties Grid** | Propiedades activas del asesor |
| 8 | **Testimonials** | Testimonios de clientes |
| 9 | **Contact Form** | Formulario de contacto directo |
| 10 | **Schema.org** | JSON-LD RealEstateAgent |

### Datos Requeridos

```typescript
interface SingleAdvisorData extends BaseResponse {
  advisor: AdvisorDetail;

  // PROPIEDADES DEL ASESOR
  properties: Property[];

  // TESTIMONIOS
  testimonials?: Testimonial[];

  // OTROS ASESORES (sugeridos)
  otherAdvisors?: AdvisorListItem[];
}

interface AdvisorDetail {
  id: string;
  external_id?: string;
  name: string;
  slug: string;
  url: string;

  // IMÁGENES
  avatar: string;
  cover_image?: string;

  // INFORMACIÓN PROFESIONAL
  position: string;
  bio: string;                        // HTML permitido
  short_bio?: string;

  // CONTACTO
  phone: string;
  whatsapp: string;
  email: string;

  // ESPECIALIDADES
  specialties: string[];

  // IDIOMAS
  languagesSpoken: string[];

  // ÁREAS DE COBERTURA
  serviceAreas?: string[];            // ["Punta Cana", "Santo Domingo"]

  // REDES SOCIALES
  socialLinks?: {
    linkedin?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };

  // ESTADÍSTICAS
  stats: {
    totalSales: number;
    yearsExperience: number;
    clientSatisfaction: number;
    activeListings: number;
    totalClients?: number;
    averageResponseTime?: string;     // "2 horas"
  };

  // CERTIFICACIONES
  certifications?: string[];

  // FECHAS
  joined_at?: string;
}
```

---

## 7. ArticlesMainLayout.astro

**Archivo:** `src/layouts/ArticlesMainLayout.astro`
**PageType:** `articles-main`
**Ruta:** `/articulos`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Header con título y estadísticas |
| 2 | **Breadcrumbs** | Navegación |
| 3 | **Categories Pills** | Botones de categorías con iconos |
| 4 | **Featured Article** | Artículo destacado grande |
| 5 | **Articles Grid** | Grid de artículos recientes |
| 6 | **Newsletter CTA** | Suscripción al newsletter |

### Datos Requeridos

```typescript
interface ArticlesMainData extends BaseResponse {
  // ARTÍCULOS
  featuredArticles: Article[];        // Artículos destacados
  recentArticles: Article[];          // Todos los artículos

  // CATEGORÍAS
  categories: ArticleCategory[];

  // ESTADÍSTICAS
  stats?: {
    totalArticles: number;
    totalCategories: number;
    totalViews: number;
  };
}

interface Article {
  id: string;
  slug: string;
  url: string;

  title: string;
  subtitle?: string;
  excerpt: string;

  featuredImage: string;              // o featured_image (snake_case)

  publishedAt: string;                // ISO 8601
  updatedAt?: string;

  readTime: string;                   // "5 min"
  readTimeMinutes?: number;

  views: number;

  featured: boolean;

  author: {
    name: string;
    avatar: string;
    position?: string;
  };

  category?: {
    id: string;
    name: string;
    slug: string;
  };

  tags?: string[];
}

interface ArticleCategory {
  id: string;
  name: string;
  slug: string;
  url: string;
  articleCount: number;
  description?: string;
  icon?: string;                      // Nombre de icono FA
  featured?: boolean;
}
```

### Mapeo de Iconos por Categoría

```javascript
{
  'guias-de-compra': 'fa-book',
  'inversion': 'fa-chart-line',
  'analisis-de-mercado': 'fa-chart-bar',
  'tips': 'fa-lightbulb',
  'comparativas': 'fa-balance-scale',
  'ubicacion': 'fa-map-marker-alt'
}
// Default: 'fa-newspaper'
```

---

## 8. ArticlesCategoryLayout.astro

**Archivo:** `src/layouts/ArticlesCategoryLayout.astro`
**PageType:** `articles-category`
**Ruta:** `/articulos/{categoria}`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Header con icono de categoría |
| 2 | **Breadcrumbs** | Navegación |
| 3 | **Stats** | Contador de artículos |
| 4 | **Search Box** | Buscador de artículos |
| 5 | **Sort Dropdown** | Ordenar por fecha/vistas |
| 6 | **Articles Grid** | Grid de artículos |
| 7 | **Pagination** | Paginación client-side (12 por página) |
| 8 | **Empty State** | Estado vacío |

### Datos Requeridos

```typescript
interface ArticlesCategoryData extends BaseResponse {
  // CATEGORÍA
  category?: {
    id: string;
    name: string;
    slug: string;
    description: string;
    url?: string;
  };

  // Alternativas si no viene category:
  categorySlug?: string;
  title?: string;
  description?: string;
  slug?: string;

  // ARTÍCULOS
  articles: Article[];
}
```

### Data Attributes para JS

Cada tarjeta tiene atributos para ordenamiento:
```html
<article
  data-published="{article.publishedAt}"
  data-views="{article.views}"
  data-article-title="{article.title.toLowerCase()}"
>
```

---

## 9. ArticlesSingleLayout.astro

**Archivo:** `src/layouts/ArticlesSingleLayout.astro`
**PageType:** `articles-single`
**Ruta:** `/articulos/{categoria}/{slug}`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Título, meta, tags |
| 2 | **Breadcrumbs** | Navegación |
| 3 | **Article Meta** | Autor, fecha, lectura, vistas |
| 4 | **Featured Image** | Imagen destacada flotante |
| 5 | **Article Content** | Contenido con HTML |
| 6 | **Share Buttons** | Facebook, Twitter, LinkedIn |
| 7 | **Related Properties** | Grid de propiedades (hasta 8) |
| 8 | **Related Articles** | Grid de artículos (hasta 6) |
| 9 | **Related Videos** | Grid de videos (hasta 4) |
| 10 | **Author Bio** | Información del autor con contacto |
| 11 | **Schema.org** | JSON-LD BlogPosting |

### Datos Requeridos

```typescript
interface ArticlesSingleData extends BaseResponse {
  // ARTÍCULO PRINCIPAL
  article: ArticleDetail;

  // CATEGORÍA
  category?: {
    id: string;
    name: string;
    slug: string;
  };

  // ARTÍCULOS RELACIONADOS
  relatedArticles?: Article[];

  // CONTENIDO CRUZADO
  crossContent?: {
    properties?: Property[];          // Máx 8
    videos?: Video[];                 // Máx 4
    articles?: Article[];             // Máx 6
  };

  // INFORMACIÓN DEL DOMINIO
  domainInfo?: {
    realDomain: string;
  };
}

interface ArticleDetail {
  id: string;
  slug: string;
  url: string;

  title: string;
  subtitle?: string;
  excerpt: string;
  content: string;                    // HTML completo

  featuredImage: string;

  publishedAt: string;
  updatedAt?: string;

  readTime: string;
  readTimeMinutes?: number;

  views: number;
  featured: boolean;

  category: string;
  categorySlug: string;

  tags: Tag[];

  author: {
    name: string;
    avatar: string;
    position: string;
    bio?: string;                     // HTML permitido
    phone?: string;
    whatsapp?: string;
    email?: string;
  };
}

interface Tag {
  id?: string;
  name: string;
  slug?: string;
}
```

---

## 10. VideosMainLayout.astro

**Archivo:** `src/layouts/VideosMainLayout.astro`
**PageType:** `videos-main`
**Ruta:** `/videos`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Header oscuro con gradiente |
| 2 | **Breadcrumbs** | Navegación |
| 3 | **Stats Bar** | Total Videos, Total Vistas, Total Categorías |
| 4 | **Categories Pills** | Botones de categorías con iconos |
| 5 | **Hero Video** | Video destacado principal |
| 6 | **Videos Grid** | Grid de hasta 11 videos |
| 7 | **CTA Section** | Suscribirse a YouTube |

### Datos Requeridos

```typescript
interface VideosMainData extends BaseResponse {
  // VIDEOS
  featuredVideos: Video[];            // Videos destacados (featured=true)
  recentVideos: Video[];              // Todos los videos

  // CATEGORÍAS
  categories: VideoCategory[];

  // ESTADÍSTICAS
  stats?: {
    totalVideos: number;
    totalCategories: number;
    totalViews: number;
  };
}

interface Video {
  id: string;
  title: string;
  description: string;                // Puede tener HTML
  thumbnail: string;
  slug: string;
  videoSlug?: string;                 // Slug con categoría
  duration: string;                   // "10:30"
  publishedAt: string;
  views: number;
  featured: boolean;
  url: string;

  author: {
    name: string;
    avatar: string;
    slug?: string;
    position: string;
  };

  category?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface VideoCategory {
  id: string;
  name: string;
  slug: string;
  url: string;
  videoCount: number;
  featured: boolean;
}
```

### Mapeo de Iconos por Categoría

```javascript
{
  'lanzamientos': 'fa-rocket',
  'consejos': 'fa-lightbulb',
  'diseno-y-decoracion': 'fa-palette',
  'la-casa-de-los-famosos': 'fa-star',
  'entrevistas': 'fa-microphone',
  'recorridos': 'fa-video'
}
// Default: 'fa-play-circle'
```

---

## 11. VideosCategoryLayout.astro

**Archivo:** `src/layouts/VideosCategoryLayout.astro`
**PageType:** `videos-category`
**Ruta:** `/videos/{categoria}`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Header con icono de categoría |
| 2 | **Breadcrumbs** | Navegación |
| 3 | **Stats** | Contador de videos |
| 4 | **Search Box** | Buscador de videos |
| 5 | **Sort Dropdown** | Más recientes, Más vistos, Más antiguos |
| 6 | **Videos Grid** | Grid de videos |
| 7 | **Pagination** | Paginación client-side (12 por página) |
| 8 | **Empty State** | Estado vacío |

### Datos Requeridos

```typescript
interface VideosCategoryData extends BaseResponse {
  // CATEGORÍA
  category?: {
    slug: string;
    name: string;
    description: string;
    id?: string;
    url?: string;
  };

  // Alternativas
  categorySlug?: string;
  title?: string;
  description?: string;
  slug?: string;

  // VIDEOS
  videos: Video[];
}
```

### Data Attributes

```html
<article
  data-published="{video.publishedAt}"
  data-views="{video.views}"
  data-video-title="{video.title.toLowerCase()}"
>
```

---

## 12. VideosSingleLayout.astro

**Archivo:** `src/layouts/VideosSingleLayout.astro`
**PageType:** `videos-single`
**Ruta:** `/videos/{categoria}/{slug}`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Título, metadata |
| 2 | **Breadcrumbs** | Navegación |
| 3 | **Video Meta** | Avatar, fecha, duración, vistas |
| 4 | **Video Player** | iframe de YouTube |
| 5 | **Description** | Descripción con HTML |
| 6 | **Share Buttons** | Facebook, Twitter, LinkedIn |
| 7 | **Related Properties** | Grid hasta 8 propiedades |
| 8 | **Related Articles** | Grid hasta 6 artículos |
| 9 | **Related Videos** | Grid hasta 4 videos |
| 10 | **Testimonials** | Grid hasta 6 testimonios |
| 11 | **Author Bio** | Sección del autor |
| 12 | **Schema.org** | JSON-LD VideoObject |

### Datos Requeridos

```typescript
interface VideosSingleData extends BaseResponse {
  // VIDEO PRINCIPAL
  video: VideoDetail;

  // CATEGORÍA
  category?: {
    id: string;
    name: string;
    slug: string;
  };

  // CONTENIDO CRUZADO
  crossContent?: {
    videos?: RelatedVideo[];          // Máx 4
    articles?: RelatedArticle[];      // Máx 6
    properties?: RelatedProperty[];   // Máx 8
    testimonials?: RelatedTestimonial[]; // Máx 6
  };

  // Alternativas a crossContent:
  relatedVideos?: RelatedVideo[];
  relatedArticles?: RelatedArticle[];
  relatedProperties?: RelatedProperty[];
  relatedTestimonials?: RelatedTestimonial[];

  // DOMINIO
  domainInfo?: {
    realDomain: string;
  };
}

interface VideoDetail {
  id: string;
  title: string;
  subtitle?: string;
  description: string;                // HTML permitido
  thumbnail: string;
  slug: string;
  videoSlug?: string;

  // ⚠️ CRÍTICO: ID de YouTube para embed
  videoId: string;
  platform?: string;                  // 'youtube' (default)

  duration: string;
  publishedAt: string;
  views: number;
  featured: boolean;
  url: string;

  author: {
    name: string;
    avatar: string;
    slug?: string;
    position: string;
    bio?: string;                     // HTML permitido
    whatsapp?: string;
    email?: string;
    phone?: string;
  };
}

interface RelatedTestimonial {
  id: string;
  title: string;
  excerpt: string;
  clientName: string;
  clientAvatar: string;
  clientLocation: string;
  rating: number;                     // 1-5
  url: string;
  publishedAt: string;
}
```

### YouTube Embed

```html
<iframe
  src="https://www.youtube.com/embed/{videoId}"
  title="{title}"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  allowfullscreen
></iframe>
```

**⚠️ CRÍTICO:** Si `videoId` está vacío, el player no mostrará nada.

---

## 13. FavoritesLayout.astro

**Archivo:** `src/layouts/FavoritesLayout.astro`
**PageType:** `favorites`
**Ruta:** `/favoritos`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Header con info del usuario |
| 2 | **Device Info** | Device ID, Email, Contador |
| 3 | **Share Button** | Compartir lista |
| 4 | **Email Modal** | Modal para asignar email |
| 5 | **Loading State** | Estado de carga |
| 6 | **No Favorites State** | Estado vacío |
| 7 | **Sort Dropdown** | Ordenar favoritos |
| 8 | **Properties Grid** | Grid de propiedades favoritas |
| 9 | **CTA Section** | Explorar más propiedades |

### Datos Requeridos

```typescript
interface FavoritesData extends BaseResponse {
  // SEO básico (el contenido se carga client-side)
  seo: {
    title: string;
    description: string;
    ogImage: string;
    hreflang: Record<string, string>;
  };
}
```

> **Nota:** Los favoritos se cargan dinámicamente via `SimpleFavoritesManager` (client-side).

---

## 14. SharedFavoritesLayout.astro

**Archivo:** `src/layouts/SharedFavoritesLayout.astro`
**PageType:** `shared-favorites`
**Ruta:** `/favoritos/compartir?id={deviceId}`

### Datos Requeridos

```typescript
interface SharedFavoritesData extends BaseResponse {
  // ID del propietario de la lista
  ownerId: string;

  // Propiedades compartidas
  properties: Property[];

  // Info del propietario (si tiene email)
  ownerInfo?: {
    email?: string;                   // Parcialmente oculto
  };

  seo: SEOData;
}
```

---

## 15. ContactLayout.astro

**Archivo:** `src/layouts/ContactLayout.astro`
**PageType:** `contact`
**Ruta:** `/contacto`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Header con título |
| 2 | **Contact Info Cards** | Teléfono, Email, WhatsApp, Dirección |
| 3 | **Business Hours** | Horarios de atención |
| 4 | **Google Map** | Mapa interactivo |
| 5 | **Contact Form** | Formulario completo |
| 6 | **Team Members** | Grid de miembros del equipo |

### Datos Requeridos

```typescript
interface ContactData extends BaseResponse {
  // INFORMACIÓN DE CONTACTO
  contactInfo: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    city: string;
    coordinates: {
      lat: number;
      lng: number;
    };
    hours: {
      weekdays: string;               // "9:00 AM - 6:00 PM"
      saturday: string;
      sunday: string;
    };
  };

  // SERVICIOS DISPONIBLES (para dropdown del formulario)
  services: ServiceOption[];

  // EQUIPO
  team?: TeamMember[];
}

interface ServiceOption {
  value: string;
  label: string;
}

interface TeamMember {
  name: string;
  title: string;
  phone?: string;
  email?: string;
  specialties: string[];
  avatar: string;
}
```

### Campos del Formulario

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nombre` | text | Sí | Nombre completo |
| `telefono` | tel | Sí | Teléfono de contacto |
| `email` | email | Sí | Correo electrónico |
| `servicio` | select | Sí | Servicio de interés |
| `mensaje` | textarea | Sí | Mensaje |
| `contacto_preferido` | radio | Sí | WhatsApp/Email/Llamada |

---

## 16. SellLayout.astro

**Archivo:** `src/layouts/SellLayout.astro`
**PageType:** `sell`
**Ruta:** `/vender`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Header con CTA |
| 2 | **Market Highlights** | Estadísticas del mercado |
| 3 | **Services Grid** | Servicios que ofrecemos |
| 4 | **Process Timeline** | Pasos del proceso de venta |
| 5 | **Top Agents** | Mejores agentes |
| 6 | **Success Stories** | Casos de éxito |
| 7 | **Testimonials** | Testimonios de vendedores |
| 8 | **Guarantees** | Garantías ofrecidas |
| 9 | **Contact Form** | Formulario de contacto |
| 10 | **FAQs** | Preguntas frecuentes |

### Datos Requeridos

```typescript
interface SellData extends BaseResponse {
  // ESTADÍSTICAS DEL MERCADO
  marketHighlights: {
    totalVolume: string;              // "US$500M+"
    averagePrice: string;             // "US$350,000"
    daysOnMarket: number;             // Días promedio
    topCategory: string;              // "Apartamentos"
    topLocation: string;              // "Punta Cana"
    yearTrend: string;                // "+15%"
    projectsShare: string;            // "35%"
  };

  // SERVICIOS
  services: SellService[];

  // PROCESO DE VENTA
  process: ProcessStep[];

  // MEJORES AGENTES
  topAgents: TopAgent[];

  // CASOS DE ÉXITO
  successStories: SuccessStory[];

  // TESTIMONIOS
  testimonials: Testimonial[];

  // GARANTÍAS
  guarantees: Guarantee[];

  // CONTACTO
  contactInfo: {
    phone: string;
    whatsapp: string;
    email: string;
  };

  // FAQs
  faqs?: FAQ[];
}

interface SellService {
  title: string;
  description: string;
  icon: string;                       // Nombre de icono FA
  features: string[];
  included: boolean;
}

interface ProcessStep {
  step: number;
  title: string;
  description?: string;
  duration: string;                   // "1-2 días"
  cost: string;                       // "Gratis", "Comisión estándar"
}

interface TopAgent {
  name: string;
  avatar: string;
  position: string;
  totalSales: number;
  totalVolume: string;                // "US$15M+"
  url: string;
}

interface SuccessStory {
  propertyName: string;
  location: string;
  price: string;
  soldDate: string;
  daysOnMarket?: number;
  image?: string;
}

interface Guarantee {
  title: string;
  description: string;
  icon: string;
}
```

---

## 17. LegalLayout.astro

**Archivo:** `src/layouts/LegalLayout.astro`
**PageType:** `legal`
**Ruta:** `/terminos`, `/privacidad`

### Datos Requeridos

```typescript
interface LegalData extends BaseResponse {
  // TIPO DE PÁGINA LEGAL
  legalType: 'terms' | 'privacy';

  // CONTENIDO
  content: {
    sections: LegalSection[];
  };

  // METADATA
  lastUpdated: string;                // "2025-01-01"
  jurisdiction: string;               // "República Dominicana"
}

interface LegalSection {
  title: string;
  content: string;                    // HTML permitido
}
```

---

## 18. LocationsLayout.astro

**Archivo:** `src/layouts/LocationsLayout.astro`
**PageType:** `locations`
**Ruta:** `/ubicaciones`

### Componentes Visuales

| # | Componente | Descripción |
|---|------------|-------------|
| 1 | **Hero Section** | Header con estadísticas |
| 2 | **Stats Bar** | Total ciudades, sectores, propiedades |
| 3 | **Cities Grid** | Grid de ciudades con imágenes |
| 4 | **Featured by Sector** | Propiedades por sector |

### Datos Requeridos

```typescript
interface LocationsData extends BaseResponse {
  // UBICACIONES
  locations: {
    countries: Country[];
    cities: City[];
    sectors: Sector[];
    enrichedCities: EnrichedCity[];   // Ciudades con datos SEO
  };

  // ESTADÍSTICAS
  stats: {
    totalCities: number;
    totalSectors: number;
    totalProperties: number;
  };

  // PROPIEDADES POR SECTOR
  featuredBySector: Record<string, Property[]>;
}

interface City {
  id: string;
  name: string;
  slug: string;
  count: number;                      // Propiedades en esta ciudad
  url: string;
}

interface EnrichedCity extends City {
  seo_description?: string;
  hero_image?: string;
  hasEnrichedData: boolean;
  market_insights?: MarketInsights;
}

interface Sector {
  id: string;
  name: string;
  slug: string;
  count: number;
  city_id: string;
  url: string;
}
```

---

## 19. PropertyTypesLayout.astro

**Archivo:** `src/layouts/PropertyTypesLayout.astro`
**PageType:** `property-types`
**Ruta:** `/tipos-de-propiedad`

### Datos Requeridos

```typescript
interface PropertyTypesData extends BaseResponse {
  // TIPOS DE PROPIEDAD
  propertyTypes: PropertyTypeInfo[];

  // TIPOS ENRIQUECIDOS (con datos SEO)
  enrichedTypes: PropertyTypeInfo[];
  remainingTypes: PropertyTypeInfo[];

  // PROPIEDADES POR TIPO
  featuredByType: Record<string, Property[]>;
}

interface PropertyTypeInfo {
  id: string;
  type: string;                       // "Apartamento", "Villa"
  slug: string;
  count: number;
  url: string;

  // Datos enriquecidos (opcionales)
  icon?: string;                      // Nombre de icono FA
  description?: string;
  seo_description?: string;
  hero_image?: string;
  hasEnrichedData: boolean;
  color?: string;                     // Color de la tarjeta
}
```

---

## 20. CuratedListingsLayout.astro

**Archivo:** `src/layouts/CuratedListingsLayout.astro`
**PageType:** `curated-listings`
**Ruta:** `/colecciones`

### Datos Requeridos

```typescript
interface CuratedListingsData extends BaseResponse {
  // TODAS LAS COLECCIONES
  allListings: CuratedListing[];

  // ESTADÍSTICAS
  stats: {
    totalListings: number;
    totalProperties: number;
  };
}

interface CuratedListing {
  id: string;
  title: string;
  description: string;
  slug: string;
  url: string;
  icon: string;                       // Emoji o nombre FA
  color?: string;
  priority: number;
  propertyCount?: number;
}
```

### Mapeo Emoji a FontAwesome

```javascript
{
  '🏖️': 'fa-umbrella-beach',
  '🌴': 'fa-tree',
  '💎': 'fa-gem',
  '🏢': 'fa-building',
  '🏡': 'fa-home',
  '🎯': 'fa-bullseye',
  '⭐': 'fa-star',
  '🔥': 'fa-fire',
  '💰': 'fa-coins',
  '🌊': 'fa-water'
}
// Default: 'fa-bookmark'
```

---

## 21. CuratedListingsSingleLayout.astro

**Archivo:** `src/layouts/CuratedListingsSingleLayout.astro`
**PageType:** `curated-listing-single`
**Ruta:** `/colecciones/{slug}`

### Datos Requeridos

```typescript
interface CuratedListingSingleData extends BaseResponse {
  // COLECCIÓN
  listing: {
    id: string;
    title: string;
    subtitle?: string;
    description: string;
    slug: string;

    // Estadísticas específicas (si aplica)
    stats?: {
      avgRoi?: string;                // "8-12%"
      occupancyRate?: string;         // "75%"
      avgNightly?: string;            // "$150"
    };
  };

  // PROPIEDADES
  properties: Property[];

  // PAGINACIÓN
  pagination: {
    total: number;
    page: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  // OTRAS COLECCIONES
  availableCuratedListings: AvailableListing[];

  // CONTENIDO RELACIONADO
  relatedArticles?: Article[];
  relatedVideos?: Video[];
  relatedSeoContent?: SeoContent[];
  relatedFaqs?: FAQ[];
}

interface AvailableListing {
  name: string;
  url: string;
  description?: string;
  isActive: boolean;                  // Si es la actual
}

interface SeoContent {
  title: string;
  content: string;                    // HTML
}
```

---

## 22. VacationRentalsLayout.astro

**Archivo:** `src/layouts/VacationRentalsLayout.astro`
**PageType:** `vacation-rentals-owners`
**Ruta:** `/alquiler-vacacional`

> **Nota:** Este layout es para propietarios que quieren ofrecer su propiedad en alquiler vacacional.

### Datos Requeridos

```typescript
interface VacationRentalsOwnersData extends BaseResponse {
  // PLANES DE MEMBRESÍA
  memberships: Membership[];

  // ESTADÍSTICAS
  stats: StatItem[];

  // CASOS DE ÉXITO
  casosExito: CasoExito[];

  // COMPARATIVA CON COMPETENCIA
  comparison: ComparisonItem[];

  // PROPIEDADES EXITOSAS
  propiedadesExitosas: PropiedadExitosa[];

  // FAQs
  faqs: FAQ[];
}

interface Membership {
  id: string;
  name: string;                       // "Básico", "Premium", "Elite"
  price: string;                      // "$99/mes"
  period: string;                     // "mensual", "anual"
  description: string;
  features: string[];
  popular: boolean;                   // Destacar como más popular
  savings?: string;                   // "Ahorra 20%"
}

interface StatItem {
  number: string;                     // "500+"
  label: string;                      // "Propiedades gestionadas"
}

interface CasoExito {
  owner: string;
  property: string;
  beforeIncome: string;               // "$1,500/mes"
  afterIncome: string;                // "$4,500/mes"
  increase: string;                   // "+200%"
  plan: string;                       // "Premium"
  testimonial: string;
  avatar?: string;
}

interface ComparisonItem {
  feature: string;
  clic: boolean | string;
  airbnb: boolean | string;
  booking: boolean | string;
  vrbo: boolean | string;
}

interface PropiedadExitosa {
  slug: string;
  titulo: string;
  precio: string;                     // "$250/noche"
  imagen: string;
  sector: string;
  habitaciones: number;
  banos: number;
  ocupacion: string;                  // "85%"
  tipo: string;
  plan: string;                       // "Elite"
  destacado: boolean;
}
```

---

## 23. VacationRentalsMainLayout.astro

**Archivo:** `src/layouts/VacationRentalsMainLayout.astro`
**PageType:** `vacation-rentals-main`
**Ruta:** `/alquiler-vacacional/buscar`

> **Nota:** Este layout es para huéspedes buscando alquileres vacacionales.

### Datos Requeridos

```typescript
interface VacationRentalsMainData extends BaseResponse {
  // PROPIEDADES
  properties: VacationProperty[];

  // PARÁMETROS DE BÚSQUEDA
  searchParams?: {
    destino?: string;
    tipo?: string;
    presupuesto?: string;
    huespedes?: number;
    fechaInicio?: string;
    fechaFin?: string;
  };

  // FLAGS
  isSearchPage: boolean;

  // TOTAL
  totalProperties: number;

  // ESTADÍSTICAS
  stats?: StatItem[];

  // FAQs
  rentalFAQs?: FAQ[];

  // TESTIMONIOS
  rentalTestimonials?: Testimonial[];
}

interface VacationProperty {
  id: string;
  slug: string;
  url: string;

  titulo: string;
  descripcion?: string;

  precio: string;                     // "$150/noche"
  precioNumerico?: number;

  imagen: string;
  imagenes?: string[];

  destino: string;                    // "Punta Cana"
  sector?: string;

  habitaciones: number;
  banos: number;
  capacidad: number;                  // Huéspedes máximos

  tipo: string;                       // "Villa", "Apartamento"

  rating?: number;                    // 1-5
  reviews?: number;                   // Cantidad de reseñas

  destacado: boolean;
  nuevo?: boolean;
  descuento?: string;                 // "-20%"

  amenidades?: string[];
}
```

---

## 24. VacationRentalsDynamicLayout.astro

**Archivo:** `src/layouts/VacationRentalsDynamicLayout.astro`
**PageType:** `vacation-rentals-dynamic`
**Ruta:** `/alquiler-vacacional/{...path}`

### Datos Requeridos

```typescript
interface VacationRentalsDynamicData extends BaseResponse {
  // TIPO DE PÁGINA
  type: 'rental-list' | 'rental-property';

  // SEGMENTOS DE URL
  segments: string[];

  // PARÁMETROS DE BÚSQUEDA
  searchParams?: object;

  // PARA rental-list:
  listings?: VacationProperty[];
  totalProperties?: number;

  // PARA rental-property:
  property?: VacationPropertyDetail;
}

interface VacationPropertyDetail extends VacationProperty {
  descripcion: string;                // Descripción completa

  // Precios adicionales
  precioSemanal?: string;
  precioMensual?: string;

  // Más imágenes
  imagenes: string[];

  // Metros cuadrados
  metros?: number;

  // Amenidades detalladas
  amenidades: AmenidadInfo[];

  // Reglas de la casa
  reglas?: string[];

  // Políticas
  politicaCancelacion?: string;
  checkIn?: string;
  checkOut?: string;

  // Propietario/Host
  host?: {
    name: string;
    avatar: string;
    responseRate?: string;
    responseTime?: string;
  };

  // Ubicación
  coordenadas?: {
    lat: number;
    lng: number;
  };

  // Reseñas
  resenas?: Resena[];

  // Calendario de disponibilidad
  disponibilidad?: {
    fechasOcupadas: string[];
    preciosPorTemporada?: object;
  };
}

interface AmenidadInfo {
  nombre: string;
  icono: string;
  categoria: string;                  // "General", "Cocina", "Exterior"
}

interface Resena {
  id: string;
  autor: string;
  avatar?: string;
  rating: number;
  comentario: string;
  fecha: string;
}
```

---

## 25. TestimonialsMainLayout.astro

**Archivo:** `src/layouts/TestimonialsMainLayout.astro`
**PageType:** `testimonials-main`
**Ruta:** `/testimonios`

### Datos Requeridos

```typescript
interface TestimonialsMainData extends BaseResponse {
  // TESTIMONIOS
  featuredTestimonials: Testimonial[];
  recentTestimonials: Testimonial[];

  // CATEGORÍAS
  categories: TestimonialCategory[];

  // ESTADÍSTICAS
  stats?: {
    totalTestimonials: number;
    averageRating: number;
    totalCategories: number;
  };
}

interface TestimonialCategory {
  id: string;
  name: string;
  slug: string;
  url: string;
  testimonialCount: number;
  featured?: boolean;
}
```

---

## 26. TestimonialsCategoryLayout.astro

**Archivo:** `src/layouts/TestimonialsCategoryLayout.astro`
**PageType:** `testimonials-category`
**Ruta:** `/testimonios/{categoria}`

### Datos Requeridos

```typescript
interface TestimonialsCategoryData extends BaseResponse {
  category: {
    id: string;
    name: string;
    slug: string;
    description?: string;
  };

  testimonials: Testimonial[];
}
```

---

## 27. TestimonialsSingleLayout.astro

**Archivo:** `src/layouts/TestimonialsSingleLayout.astro`
**PageType:** `testimonials-single`
**Ruta:** `/testimonios/{categoria}/{slug}`

### Datos Requeridos

```typescript
interface TestimonialsSingleData extends BaseResponse {
  testimonial: TestimonialDetail;

  category?: {
    id: string;
    name: string;
    slug: string;
  };

  relatedTestimonials?: Testimonial[];

  crossContent?: {
    properties?: Property[];
    videos?: Video[];
    articles?: Article[];
  };
}

interface TestimonialDetail {
  id: string;
  slug: string;
  url: string;

  title: string;
  excerpt: string;
  content: string;                    // HTML completo

  // Cliente
  clientName: string;
  clientAvatar: string;
  clientLocation: string;
  clientProfession?: string;

  // Rating
  rating: number;                     // 1-5

  // Metadata
  publishedAt: string;
  featured: boolean;

  // Propiedad relacionada (si aplica)
  relatedProperty?: {
    name: string;
    url: string;
    image: string;
  };

  // Agente relacionado (si aplica)
  relatedAgent?: {
    name: string;
    url: string;
    avatar: string;
  };
}
```

---

## Valores por Defecto Globales

| Campo | Valor Default |
|-------|---------------|
| `property.image` | `https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop` |
| `video.thumbnail` | Placeholder Unsplash inmobiliario |
| `video.duration` | `'0:00'` |
| `video.views` | `0` |
| `article.readTime` | `'5 min'` |
| `article.views` | `0` |
| `testimonial.rating` | `5` |
| `author.name` | `'Equipo CLIC'` |
| `author.avatar` | `/images/team/clic-experts.jpg` |
| `author.position` | `'Especialista Inmobiliario'` |
| `author.email` | `'info@clicinmobiliaria.com'` |
| `author.phone` | `'+18094872542'` |

---

## Rutas por Idioma

| Español | English | Français |
|---------|---------|----------|
| `/` | `/en/` | `/fr/` |
| `/comprar` | `/en/buy` | `/fr/acheter` |
| `/alquilar` | `/en/rent` | `/fr/louer` |
| `/propiedad/{slug}` | `/en/property/{slug}` | `/fr/propriete/{slug}` |
| `/proyecto/{slug}` | `/en/project/{slug}` | `/fr/projet/{slug}` |
| `/asesores` | `/en/advisors` | `/fr/conseillers` |
| `/asesores/{slug}` | `/en/advisors/{slug}` | `/fr/conseillers/{slug}` |
| `/articulos` | `/en/articles` | `/fr/articles` |
| `/videos` | `/en/videos` | `/fr/videos` |
| `/testimonios` | `/en/testimonials` | `/fr/temoignages` |
| `/favoritos` | `/en/favorites` | `/fr/favoris` |
| `/contacto` | `/en/contact` | `/fr/contact` |
| `/vender` | `/en/sell` | `/fr/vendre` |
| `/ubicaciones` | `/en/locations` | `/fr/emplacements` |
| `/colecciones` | `/en/collections` | `/fr/collections` |

---

## Resumen de Endpoints API Necesarios

| # | Endpoint | Método | PageType |
|---|----------|--------|----------|
| 1 | `/{lang}/` | GET | `homepage` |
| 2 | `/{lang}/comprar` | GET | `property-list` |
| 3 | `/{lang}/propiedad/{slug}` | GET | `property-single` |
| 4 | `/{lang}/proyecto/{slug}` | GET | `project` |
| 5 | `/{lang}/asesores` | GET | `advisors-list` |
| 6 | `/{lang}/asesores/{slug}` | GET | `advisor-single` |
| 7 | `/{lang}/articulos` | GET | `articles-main` |
| 8 | `/{lang}/articulos/{cat}` | GET | `articles-category` |
| 9 | `/{lang}/articulos/{cat}/{slug}` | GET | `articles-single` |
| 10 | `/{lang}/videos` | GET | `videos-main` |
| 11 | `/{lang}/videos/{cat}` | GET | `videos-category` |
| 12 | `/{lang}/videos/{cat}/{slug}` | GET | `videos-single` |
| 13 | `/{lang}/testimonios` | GET | `testimonials-main` |
| 14 | `/{lang}/testimonios/{cat}` | GET | `testimonials-category` |
| 15 | `/{lang}/testimonios/{cat}/{slug}` | GET | `testimonials-single` |
| 16 | `/{lang}/favoritos` | GET | `favorites` |
| 17 | `/{lang}/favoritos/compartir` | GET | `shared-favorites` |
| 18 | `/{lang}/contacto` | GET | `contact` |
| 19 | `/{lang}/vender` | GET | `sell` |
| 20 | `/{lang}/terminos` | GET | `legal` (terms) |
| 21 | `/{lang}/privacidad` | GET | `legal` (privacy) |
| 22 | `/{lang}/ubicaciones` | GET | `locations` |
| 23 | `/{lang}/tipos-de-propiedad` | GET | `property-types` |
| 24 | `/{lang}/colecciones` | GET | `curated-listings` |
| 25 | `/{lang}/colecciones/{slug}` | GET | `curated-listing-single` |
| 26 | `/{lang}/alquiler-vacacional` | GET | `vacation-rentals-owners` |
| 27 | `/{lang}/alquiler-vacacional/buscar` | GET | `vacation-rentals-main` |
| 28 | `/{lang}/alquiler-vacacional/{...}` | GET | `vacation-rentals-dynamic` |

---

*Documento generado: 2026-01-14*
*Versión: 1.0*
*Base URL API: `https://clic-api-neon.vercel.app`*
