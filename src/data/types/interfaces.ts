// src/data/types/interfaces.ts
// =====================================================
// INTERFACES COMPARTIDAS
// =====================================================

// =====================================================
// PROPERTY INTERFACES
// =====================================================

export interface PropertyData {
  id: string | number;
  name?: string;
  title?: string;
  description?: string;
  price?: string;
  slug_url?: string;
  main_image_url?: string;
  gallery_images_url?: string;
  bedrooms?: number;
  bathrooms?: number;
  built_area?: number;
  parking_spots?: number;
  code?: string;
  property_status?: string;
  is_project?: boolean;
  sectors?: { name?: string; coordinates?: string | null };
  cities?: { 
    name?: string; 
    coordinates?: string | null;
    provinces?: { 
      name?: string; 
      coordinates?: string | null 
    } 
  };
  property_categories?: { name?: string };
  pricing_unified?: any;
  images_unified?: any[];
  property_images?: any[];
  project_detail_id?: string;
  agent_id?: string;
  property_amenities?: any[];
  location?: any;
}

export interface ProcessedProperty {
  id: string | number;
  slug: string;
  titulo: string;
  precio: string;
  imagen: string;
  imagenes: string[];
  sector: string;
  habitaciones: number;
  banos: number;
  metros: number;
  tipo: string;
  url: string;
  code: string;
  isFormattedByProvider: boolean;
  is_project: boolean;
  parking_spots: number;
  coordinates?: { lat: number; lng: number } | null;
  hasCoordinates?: boolean;
  locationData?: any;
}

// =====================================================
// LOCATION INTERFACES
// =====================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface ProcessedLocation {
  coordinates: Coordinates | null;
  hasExactCoordinates: boolean;
  showExactLocation: boolean;
  coordinatesSource: string;
  address: string;
  sector: string | null;
  city: string | null;
  province: string | null;
  mapConfig: {
    zoom: number;
    showMarker: boolean;
    showAreaCircle: boolean;
    circleRadius: number;
  };
  debug: {
    processingSource: string;
    postgisParsingUsed: boolean;
    coordinatesFoundIn: string;
    hadPropertyData?: boolean;
    hadApiLocation?: boolean;
    [key: string]: any;
  };
  googlePlaces?: any;
}

// =====================================================
// AGENT INTERFACES
// =====================================================

export interface AgentData {
  id?: string | number;
  name?: string;
  phone?: string;
  email?: string;
  position?: string;
  profile_photo_url?: string;
  image?: string;
  rating?: number;
  external_id?: string;
  code?: string;
  years_experience?: number;
  specialty_description?: string;
  languages?: string | string[];
  biography?: string;
  slug?: string;
  social?: {
    facebook?: string | null;
    instagram?: string | null;
    twitter?: string | null;
    linkedin?: string | null;
    youtube?: string | null;
  };
  active?: boolean;
  show_on_website?: boolean;
  team_id?: string;
  user_type?: string;
  agent_type?: string;
}

export interface ProcessedAgent {
  name: string;
  phone: string;
  email: string;
  position: string;
  whatsapp: string;
  image: string;
  profile_photo_url: string;
  rating: number;
  code: string;
  years_experience: number;
  specialty_description: string;
  languages: string[];
  biography: string;
  slug?: string;
  social: {
    facebook: string | null;
    instagram: string | null;
    twitter: string | null;
    linkedin: string | null;
    youtube: string | null;
  };
  active?: boolean;
  show_on_website?: boolean;
  team_id?: string;
  user_type?: string;
  agent_type?: string;
}

// =====================================================
// CONTENT INTERFACES
// =====================================================

export interface ProcessedFAQ {
  question: string;
  answer: string;
  source: string;
  priority: number;
  isSpecific: boolean;
  isTagRelated: boolean;
}

export interface ProcessedFAQs {
  faqs: ProcessedFAQ[];
  hasSpecificFaqs: boolean;
  hasTagRelatedFaqs: boolean;
  totalCount: number;
  sources: string[];
}

export interface ProcessedVideo {
  id: string;
  title: string;
  description: string;
  duration?: string;
  thumbnail: string;
  url: string;
  embedUrl: string;
  source: string;
  priority: number;
  isSpecific: boolean;
  isTagRelated: boolean;
  platform: string;
  isValid: boolean;
}

export interface ProcessedVideos {
  mainVideo: ProcessedVideo;
  additionalVideos: ProcessedVideo[];
  allVideos: ProcessedVideo[];
  hasSpecificVideos: boolean;
  hasTagRelatedVideos: boolean;
  totalCount: number;
  sources: string[];
}

// =====================================================
// BREADCRUMB INTERFACES
// =====================================================

export interface Breadcrumb {
  name: string;
  slug?: string;
  url: string;
  category?: string;
  is_active?: boolean;
  position?: number;
  tag_id?: string;
  description?: string;
  icon?: string;
  current?: boolean;
  is_current_page?: boolean;
}

// =====================================================
// SIMILAR PROPERTIES INTERFACE
// =====================================================

export interface SimilarProperty {
  id: string | number;
  title: string;
  price: string;
  bedrooms?: number;
  bathrooms?: number;
  area?: number;
  image: string;
  location: string;
  type?: string;
  url: string;
  is_project?: boolean;
  parking_spots?: number;
  coordinates?: Coordinates | null;
}

// =====================================================
// API RESPONSE INTERFACES
// =====================================================

export interface APIResponse {
  type: 'single-property' | 'single-property-project' | 'property-list' | 'error';
  available?: boolean;
  property?: PropertyData;
  location?: any;
  searchResults?: {
    properties: PropertyData[];
    tags: any[];
    pagination: any;
  };
  projectDetails?: any;
  agent?: AgentData;
  referralAgent?: AgentData;
  agentProperties?: any[];
  agentPropertiesInfo?: any;
  relatedContent?: {
    articles: any[];
    videos: any[];
    testimonials: any[];
    faqs: any[];
    seo_content?: any[];
    content_source?: string;
    hierarchy_info?: {
      specific_count: number;
      tag_related_count: number;
      default_count: number;
    };
  };
  breadcrumbs?: Breadcrumb[];
  similarProperties?: SimilarProperty[];
  similarPropertiesDebug?: {
    total_found: number;
    tags_used: number;
    search_method: string;
  };
  seo?: any;
  meta?: {
    contentHierarchy?: any;
    contentSource?: string;
    tagRelatedContentUsed?: boolean;
    [key: string]: any;
  };
  content?: any; // Para backward compatibility
}

// =====================================================
// PAGINATION INTERFACE
// =====================================================

export interface PaginationData {
  currentPage: number;
  totalCount: number;
  itemsPerPage: number;
  totalPages: number;
  hasMore: boolean;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// =====================================================
// SEO INTERFACE
// =====================================================

export interface SEOData {
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  og?: {
    title?: string;
    description?: string;
    image?: string;
    type?: string;
  };
  structuredData?: any;
}