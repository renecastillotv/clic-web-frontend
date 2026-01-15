// src/data/mockDatabase.ts - VERSIÓN BALANCEADA
import type { Property, Article, Advisor, Video, Testimonial } from './types';

/**
 * 🗄️ BASE DE DATOS MOCK BALANCEADA
 * 
 * Datos más variados para testing de filtros
 */
class MockDatabase {
  
  // ===============================
  // 🏠 PROPIEDADES BALANCEADAS
  // ===============================
  
  private properties: Property[] = [
    // PUNTA CANA - 2 propiedades
    {
      slug: 'villa-punta-cana-golf',
      titulo: 'Villa en Punta Cana con vista al golf',
      precio: '$650,000',
      descripcion: 'Espectacular villa de lujo con vistas panorámicas al campo de golf.',
      imagen: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=800&fit=crop',
      imagenes: [
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&h=800&fit=crop'
      ],
      sector: 'Punta Cana',
      habitaciones: 4,
      banos: 4,
      metros: 400,
      terreno: 1200,
      tipo: 'Villa',
      amenidades: ['Piscina infinita', 'Vista al golf', 'Jacuzzi', 'Gimnasio'],
      caracteristicas: {
        'Año de construcción': '2022',
        'Niveles': '2',
        'Parqueos': '4',
        'Estado': 'Nueva'
      }
    },
    {
      slug: 'apartamento-bavaro-beach',
      titulo: 'Apartamento frente al mar en Bavaro',
      precio: '$280,000',
      descripcion: 'Moderno apartamento con vista al mar en primera línea de playa.',
      imagen: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop',
      sector: 'Bavaro, Punta Cana',
      habitaciones: 2,
      banos: 2,
      metros: 120,
      tipo: 'Apartamento',
      amenidades: ['Vista al mar', 'Piscina', 'Playa privada', 'Seguridad 24/7'],
      caracteristicas: {
        'Año de construcción': '2023',
        'Piso': '5to',
        'Parqueos': '1',
        'Estado': 'Nuevo'
      }
    },

    // DISTRITO NACIONAL - 3 propiedades
    {
      slug: 'apartamento-naco-torre-moderna',
      titulo: 'Apartamento moderno en Torre Naco',
      precio: '$185,000',
      descripcion: 'Excelente apartamento en una de las mejores torres de Naco.',
      imagen: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop',
      sector: 'Naco, Distrito Nacional',
      habitaciones: 3,
      banos: 2,
      metros: 145,
      tipo: 'Apartamento',
      amenidades: ['Gimnasio', 'Piscina', 'Terraza', 'Seguridad 24/7'],
      caracteristicas: {
        'Año de construcción': '2021',
        'Piso': '8vo',
        'Parqueos': '2',
        'Estado': 'Excelente'
      }
    },
    {
      slug: 'penthouse-bella-vista',
      titulo: 'Penthouse exclusivo en Bella Vista',
      precio: '$550,000',
      descripcion: 'Lujoso penthouse con vistas espectaculares de la ciudad.',
      imagen: 'https://images.unsplash.com/photo-1567684014761-b65e2e59b9eb?w=1200&h=800&fit=crop',
      sector: 'Bella Vista, Distrito Nacional',
      habitaciones: 4,
      banos: 3,
      metros: 300,
      tipo: 'Penthouse',
      amenidades: ['Terraza privada', 'Jacuzzi', 'Vista panoramica', 'Ascensor privado'],
      caracteristicas: {
        'Año de construcción': '2023',
        'Niveles': '2 (duplex)',
        'Parqueos': '3',
        'Estado': 'Nuevo'
      }
    },
    {
      slug: 'casa-los-cacicazgos',
      titulo: 'Casa moderna en Los Cacicazgos',
      precio: '$420,000',
      descripcion: 'Hermosa casa en una de las zonas mas exclusivas del DN.',
      imagen: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1200&h=800&fit=crop',
      sector: 'Los Cacicazgos, Distrito Nacional',
      habitaciones: 4,
      banos: 3,
      metros: 280,
      terreno: 500,
      tipo: 'Casa',
      amenidades: ['Jardin', 'Piscina', 'Gazebo', 'Cocina moderna'],
      caracteristicas: {
        'Año de construcción': '2020',
        'Niveles': '2',
        'Parqueos': '3',
        'Estado': 'Excelente'
      }
    },

    // SANTIAGO - 3 propiedades para mejor testing
    {
      slug: 'villa-santiago-centro',
      titulo: 'Villa familiar en Santiago Centro',
      precio: '$195,000',
      descripcion: 'Comoda villa familiar con excelente ubicacion.',
      imagen: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
      sector: 'Santiago Centro',
      habitaciones: 3,
      banos: 2,
      metros: 180,
      terreno: 300,
      tipo: 'Villa',
      amenidades: ['Jardin', 'Parqueo techado', 'Cerca de colegios'],
      caracteristicas: {
        'Año de construcción': '2019',
        'Niveles': '2',
        'Parqueos': '2',
        'Estado': 'Bueno'
      }
    },
    {
      slug: 'apartamento-gurabo-santiago',
      titulo: 'Apartamento en Gurabo, Santiago',
      precio: '$125,000',
      descripcion: 'Apartamento ideal para jovenes profesionales.',
      imagen: 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=1200&h=800&fit=crop',
      sector: 'Gurabo, Santiago',
      habitaciones: 2,
      banos: 1,
      metros: 85,
      tipo: 'Apartamento',
      amenidades: ['Piscina', 'Gimnasio', 'Area social'],
      caracteristicas: {
        'Año de construcción': '2018',
        'Piso': '3ro',
        'Parqueos': '1',
        'Estado': 'Bueno'
      }
    },
    {
      slug: 'casa-jardines-metropolitanos',
      titulo: 'Casa moderna en Jardines Metropolitanos',
      precio: '$210,000',
      descripcion: 'Hermosa casa en exclusiva urbanizacion de Santiago.',
      imagen: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop',
      sector: 'Jardines Metropolitanos, Santiago',
      habitaciones: 3,
      banos: 3,
      metros: 200,
      terreno: 350,
      tipo: 'Casa',
      amenidades: ['Jardin', 'Piscina', 'Seguridad 24/7', 'Club house'],
      caracteristicas: {
        'Año de construcción': '2021',
        'Niveles': '2',
        'Parqueos': '2',
        'Estado': 'Nueva'
      }
    },

    // LA ROMANA - 1 propiedad
    {
      slug: 'villa-casa-de-campo',
      titulo: 'Villa de lujo en Casa de Campo',
      precio: '$890,000',
      descripcion: 'Exclusiva villa en el resort mas prestigioso del Caribe.',
      imagen: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=800&fit=crop',
      sector: 'Casa de Campo, La Romana',
      habitaciones: 5,
      banos: 4,
      metros: 450,
      terreno: 800,
      tipo: 'Villa',
      amenidades: ['Campo de golf', 'Playa privada', 'Marina', 'Spa', 'Seguridad 24/7'],
      caracteristicas: {
        'Año de construcción': '2021',
        'Niveles': '2',
        'Parqueos': '4',
        'Estado': 'Nueva'
      }
    },

    // PUERTO PLATA - 1 propiedad
    {
      slug: 'casa-puerto-plata-centro',
      titulo: 'Casa colonial en Puerto Plata Centro',
      precio: '$165,000',
      descripcion: 'Encantadora casa colonial restaurada en el centro historico.',
      imagen: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop',
      sector: 'Centro Historico, Puerto Plata',
      habitaciones: 3,
      banos: 2,
      metros: 200,
      terreno: 250,
      tipo: 'Casa',
      amenidades: ['Arquitectura colonial', 'Patio central', 'Cerca del malecon'],
      caracteristicas: {
        'Año de construcción': '1920 (restaurada 2020)',
        'Niveles': '2',
        'Parqueos': '2',
        'Estado': 'Restaurada'
      }
    }
  ];

  // ===============================
  // 📄 ARTÍCULOS
  // ===============================
  
  private articles: Article[] = [
    {
      slug: 'tendencias-mercado-inmobiliario-rd-2025',
      title: 'Tendencias del Mercado Inmobiliario en RD 2025',
      excerpt: 'Rene Castillo analiza las proyecciones y oportunidades mas importantes para este año.',
      content: 'Contenido completo del articulo...',
      featuredImage: 'https://images.unsplash.com/photo-1560520653-9e0e4c89eb11?w=800&h=450&fit=crop',
      author: { name: 'Rene Castillo', avatar: 'https://i.pravatar.cc/150?img=1' },
      publishedAt: '2024-03-20',
      readTime: '12',
      category: 'Analisis de Mercado',
      views: '8.5K',
      tags: ['mercado', 'tendencias', '2025']
    },
    {
      slug: 'guia-comprar-extranjero-rd',
      title: 'Guia para Extranjeros que Compran en Republica Dominicana',
      excerpt: 'Todo lo que necesitas saber sobre documentacion, procesos y mejores practicas.',
      content: 'Contenido completo del articulo...',
      featuredImage: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&h=450&fit=crop',
      author: { name: 'Equipo CLIC', avatar: 'https://i.pravatar.cc/150?img=2' },
      publishedAt: '2024-03-18',
      readTime: '15',
      category: 'Guias de Compra',
      views: '12.3K',
      tags: ['extranjeros', 'documentos', 'proceso']
    }
  ];

  // ===============================
  // 👥 ASESORES
  // ===============================
  
  private advisors: Advisor[] = [
    {
      slug: 'maria-rodriguez',
      name: 'Maria Rodriguez',
      title: 'Directora de Ventas Premium',
      avatar: 'https://i.pravatar.cc/300?img=5',
      specialties: ['Propiedades de Lujo', 'Casa de Campo', 'Cap Cana'],
      areas: ['Santo Domingo', 'La Romana', 'Punta Cana'],
      languages: ['Español', 'Ingles', 'Frances'],
      experience: '12 años',
      totalSales: '$45M',
      propertiesSold: 180,
      avgDays: 28,
      rating: 4.9,
      reviewCount: 127,
      phone: '+1 809 555 0101',
      whatsapp: '18095550101',
      email: 'maria.rodriguez@clic.do',
      bio: 'Especialista en propiedades de lujo con mas de una decada de experiencia.',
      achievements: ['Top Seller 2023', 'Asesor del Año 2022']
    },
    {
      slug: 'carlos-santana',
      name: 'Carlos Santana',
      title: 'Especialista en Inversiones',
      avatar: 'https://i.pravatar.cc/300?img=8',
      specialties: ['Airbnb', 'Inversion Inmobiliaria', 'Analisis ROI'],
      areas: ['Bavaro', 'Uvero Alto', 'Samana'],
      languages: ['Español', 'Ingles'],
      experience: '8 años',
      totalSales: '$28M',
      propertiesSold: 145,
      avgDays: 32,
      rating: 4.8,
      reviewCount: 98,
      phone: '+1 809 555 0108',
      whatsapp: '18095550108',
      email: 'carlos.santana@clic.do',
      bio: 'Experto en inversiones inmobiliarias con enfoque en alquiler vacacional.',
      achievements: ['Especialista en Airbnb Certificado', 'Mejor ROI 2023']
    }
  ];

  // ===============================
  // 🎬 VIDEOS
  // ===============================
  
  private videos: Video[] = [
    {
      id: '1',
      title: 'La Casa de Luz Garcia en Cacicazgos - Tour Exclusivo',
      description: 'Visitamos la espectacular villa de la reconocida presentadora dominicana',
      thumbnail: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=450&fit=crop',
      duration: '18:45',
      views: '342K',
      category: 'casa-famosos',
      videoId: 'dQw4w9WgXcQ',
      videoSlug: 'la-casa-de-luz-garcia',
      featured: true
    },
    {
      id: '2',
      title: 'Como Invertir en Punta Cana - Guia 2024',
      description: 'Rene Castillo te explica las mejores oportunidades de inversion',
      thumbnail: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800&h=450&fit=crop',
      duration: '15:30',
      views: '89K',
      category: 'tips',
      videoId: 'dQw4w9WgXcQ2',
      videoSlug: 'como-invertir-punta-cana-2024'
    }
  ];

  // ===============================
  // 💬 TESTIMONIOS
  // ===============================
  
  private testimonials: Testimonial[] = [
    {
      id: '1',
      slug: 'carlos-mendoza-villa-cap-cana',
      category: 'compradores',
      author: {
        name: 'Carlos Mendoza',
        avatar: 'https://i.pravatar.cc/150?img=10',
        location: 'Santo Domingo',
        verified: true
      },
      rating: 5,
      text: 'Rene y su equipo me ayudaron a encontrar la villa perfecta en Cap Cana. Su experiencia en TV se nota en la atencion al detalle y el profesionalismo.',
      excerpt: 'Rene y su equipo me ayudaron a encontrar la villa perfecta en Cap Cana.',
      propertyType: 'Villa',
      location: 'Cap Cana',
      date: '2024-03-15'
    },
    {
      id: '2',
      slug: 'ana-martinez-apartamento-piantini',
      category: 'inversionistas',
      author: {
        name: 'Ana Martinez',
        avatar: 'https://i.pravatar.cc/150?img=6',
        location: 'Miami, FL',
        verified: true
      },
      rating: 5,
      text: 'Como extranjera, necesitaba mucha asesoria. CLIC me guio en todo el proceso y ahora tengo un apartamento que genera excelente ROI.',
      excerpt: 'CLIC me guio en todo el proceso y ahora tengo un apartamento que genera excelente ROI.',
      propertyType: 'Apartamento',
      location: 'Piantini',
      date: '2024-02-28'
    }
  ];

  // ===============================
  // 🔍 MÉTODOS DE CONSULTA
  // ===============================

  // Properties
  getAllProperties(): Property[] {
    return this.properties;
  }

  getPropertyBySlug(slug: string): Property | undefined {
    return this.properties.find(p => p.slug === slug);
  }

  propertyExists(slug: string): boolean {
    return this.properties.some(p => p.slug === slug);
  }

  getPropertiesByType(tipo: string): Property[] {
    return this.properties.filter(p => 
      p.tipo?.toLowerCase().includes(tipo.toLowerCase())
    );
  }

  getPropertiesByArea(area: string): Property[] {
    return this.properties.filter(p => 
      p.sector?.toLowerCase().includes(area.toLowerCase())
    );
  }

  // Articles
  getAllArticles(): Article[] {
    return this.articles;
  }

  getArticleBySlug(slug: string): Article | undefined {
    return this.articles.find(a => a.slug === slug);
  }

  getArticlesByCategory(category: string): Article[] {
    return this.articles.filter(a => 
      a.category?.toLowerCase().includes(category.toLowerCase()) ||
      a.tags?.some(tag => tag.toLowerCase().includes(category.toLowerCase()))
    );
  }

  // Advisors
  getAllAdvisors(): Advisor[] {
    return this.advisors;
  }

  getAdvisorBySlug(slug: string): Advisor | undefined {
    return this.advisors.find(a => a.slug === slug);
  }

  getAdvisorsByArea(area: string): Advisor[] {
    return this.advisors.filter(a => 
      a.areas?.some(advisorArea => 
        advisorArea.toLowerCase().includes(area.toLowerCase())
      )
    );
  }

  // Videos
  getAllVideos(): Video[] {
    return this.videos;
  }

  getVideosByCategory(category: string): Video[] {
    return this.videos.filter(v => 
      v.category?.toLowerCase().includes(category.toLowerCase())
    );
  }

  // Testimonials
  getAllTestimonials(): Testimonial[] {
    return this.testimonials;
  }

  getTestimonialsByCategory(category: string): Testimonial[] {
    return this.testimonials.filter(t => t.category === category);
  }
}

// ===============================
// 🚀 EXPORTAR INSTANCIA SINGLETON
// ===============================

export const mockDatabase = new MockDatabase();