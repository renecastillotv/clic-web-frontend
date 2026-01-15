// contact-handler.ts
import { getUIText } from './ui-texts.ts';
// ============================================================================
// CONTACT HANDLER - PÁGINA DE CONTACTO
// ============================================================================
export async function handleContact(params) {
  const { supabase, language, trackingString, baseData } = params;
  console.log('📞 Handling contact page');
  // Obtener información adicional de contacto si es necesaria
  const { data: officeInfo } = await supabase.from('office_locations').select(`
      id, name, address, phone, email, whatsapp, coordinates,
      office_hours, services, manager_name, manager_photo,
      social_links, parking_info, public_transport
    `).eq('active', true).order('is_main_office', {
    ascending: false
  });
  // Obtener asesores disponibles para contacto
  const { data: contactAdvisors } = await supabase.from('users').select(`
      id, first_name, last_name, profile_photo_url, slug, position,
      phone, email, whatsapp, specialties, languages_spoken
    `).eq('role', 'agent').eq('active', true).eq('available_for_contact', true).order('featured', {
    ascending: false
  }).limit(6);
  // Procesar oficinas
  const processedOffices = (officeInfo || []).map((office)=>({
      id: office.id,
      name: office.name,
      address: office.address,
      phone: office.phone,
      email: office.email,
      whatsapp: office.whatsapp,
      coordinates: office.coordinates,
      officeHours: office.office_hours || {
        monday_friday: '8:00 AM - 6:00 PM',
        saturday: '9:00 AM - 3:00 PM',
        sunday: 'Closed'
      },
      services: office.services || [],
      manager: office.manager_name ? {
        name: office.manager_name,
        photo: office.manager_photo
      } : null,
      socialLinks: office.social_links || {},
      parkingInfo: office.parking_info,
      publicTransport: office.public_transport
    }));
  // Procesar asesores
  const processedAdvisors = (contactAdvisors || []).map((advisor)=>{
    const fullName = `${advisor.first_name || ''} ${advisor.last_name || ''}`.trim();
    return {
      id: advisor.id,
      name: fullName,
      avatar: advisor.profile_photo_url || '/images/team/default-advisor.jpg',
      position: advisor.position || getUIText('REAL_ESTATE_ADVISOR', language),
      phone: advisor.phone,
      email: advisor.email,
      whatsapp: advisor.whatsapp,
      specialties: advisor.specialties || [],
      languagesSpoken: advisor.languages_spoken || [
        'Spanish'
      ],
      slug: advisor.slug,
      url: buildAdvisorContactUrl(advisor.slug, language, trackingString)
    };
  });
  // Información de contacto principal desde baseData
  const mainContact = baseData.globalConfig?.contact || {};
  const socialLinks = baseData.globalConfig?.social || {};
  // Opciones de contacto
  const contactMethods = [
    {
      type: 'phone',
      label: language === 'en' ? 'Call Us' : language === 'fr' ? 'Appelez-nous' : 'Llámanos',
      value: mainContact.phone || '+1 (829) 123-4567',
      icon: 'phone',
      action: `tel:${mainContact.phone?.replace(/[^\d+]/g, '') || '+18291234567'}`,
      available: '24/7'
    },
    {
      type: 'whatsapp',
      label: 'WhatsApp',
      value: mainContact.whatsapp || mainContact.phone || '+1 (829) 123-4567',
      icon: 'message-circle',
      action: `https://wa.me/${mainContact.whatsapp?.replace(/[^\d]/g, '') || '18291234567'}`,
      available: language === 'en' ? 'Instant' : language === 'fr' ? 'Instantané' : 'Instantáneo'
    },
    {
      type: 'email',
      label: language === 'en' ? 'Email Us' : language === 'fr' ? 'Écrivez-nous' : 'Escríbenos',
      value: mainContact.email || 'info@clicinmobiliaria.com',
      icon: 'mail',
      action: `mailto:${mainContact.email || 'info@clicinmobiliaria.com'}`,
      available: language === 'en' ? '24-48h response' : language === 'fr' ? 'Réponse 24-48h' : 'Respuesta 24-48h'
    },
    {
      type: 'visit',
      label: language === 'en' ? 'Visit Office' : language === 'fr' ? 'Visiter Bureau' : 'Visitar Oficina',
      value: processedOffices[0]?.address || 'Santo Domingo, DR',
      icon: 'map-pin',
      action: processedOffices[0]?.coordinates ? `https://maps.google.com/?q=${processedOffices[0].coordinates.lat},${processedOffices[0].coordinates.lng}` : null,
      available: language === 'en' ? 'By appointment' : language === 'fr' ? 'Sur rendez-vous' : 'Con cita previa'
    }
  ];
  // Servicios de consultoría
  const consultationServices = [
    {
      title: language === 'en' ? 'Property Valuation' : language === 'fr' ? 'Évaluation Immobilière' : 'Avalúo de Propiedades',
      description: language === 'en' ? 'Get accurate market value assessment for your property' : language === 'fr' ? 'Obtenez une évaluation précise de la valeur marchande de votre propriété' : 'Obtén una evaluación precisa del valor de mercado de tu propiedad',
      icon: 'calculator',
      price: language === 'en' ? 'Free consultation' : language === 'fr' ? 'Consultation gratuite' : 'Consulta gratuita'
    },
    {
      title: language === 'en' ? 'Investment Analysis' : language === 'fr' ? 'Analyse d\'Investissement' : 'Análisis de Inversión',
      description: language === 'en' ? 'Professional analysis of investment opportunities and ROI projections' : language === 'fr' ? 'Analyse professionnelle des opportunités d\'investissement et projections ROI' : 'Análisis profesional de oportunidades de inversión y proyecciones de ROI',
      icon: 'trending-up',
      price: 'USD $200'
    },
    {
      title: language === 'en' ? 'Legal Assistance' : language === 'fr' ? 'Assistance Juridique' : 'Asistencia Legal',
      description: language === 'en' ? 'Complete legal support for property transactions and documentation' : language === 'fr' ? 'Support juridique complet pour transactions immobilières et documentation' : 'Soporte legal completo para transacciones inmobiliarias y documentación',
      icon: 'file-text',
      price: language === 'en' ? 'Included in service' : language === 'fr' ? 'Inclus dans le service' : 'Incluido en servicio'
    },
    {
      title: language === 'en' ? 'Market Research' : language === 'fr' ? 'Étude de Marché' : 'Estudio de Mercado',
      description: language === 'en' ? 'Detailed market analysis and trends for informed decision making' : language === 'fr' ? 'Analyse de marché détaillée et tendances pour prise de décision éclairée' : 'Análisis detallado de mercado y tendencias para toma de decisiones informadas',
      icon: 'bar-chart',
      price: 'USD $150'
    }
  ];
  const seo = {
    title: language === 'en' ? 'Contact CLIC Inmobiliaria | Real Estate Experts in Dominican Republic' : language === 'fr' ? 'Contacter CLIC Inmobiliaria | Experts Immobiliers République Dominicaine' : 'Contactar CLIC Inmobiliaria | Expertos Inmobiliarios República Dominicana',
    description: language === 'en' ? 'Contact our real estate experts for personalized property consultation. Phone, WhatsApp, email or visit our office in Dominican Republic. Professional service guaranteed.' : language === 'fr' ? 'Contactez nos experts immobiliers pour consultation immobilière personnalisée. Téléphone, WhatsApp, email ou visitez notre bureau en République Dominicaine. Service professionnel garanti.' : 'Contacta a nuestros expertos inmobiliarios para consulta personalizada de propiedades. Teléfono, WhatsApp, email o visita nuestra oficina en República Dominicana. Servicio profesional garantizado.',
    h1: language === 'en' ? 'Contact Our Real Estate Experts' : language === 'fr' ? 'Contactez Nos Experts Immobiliers' : 'Contacta a Nuestros Expertos Inmobiliarios',
    h2: language === 'en' ? 'Ready to help you with your property needs in Dominican Republic' : language === 'fr' ? 'Prêts à vous aider avec vos besoins immobiliers en République Dominicaine' : 'Listos para ayudarte con tus necesidades inmobiliarias en República Dominicana',
    canonical_url: language === 'es' ? '/contacto' : `/${language}/contact`,
    breadcrumbs: [
      {
        name: getUIText('HOME', language),
        url: language === 'es' ? '/' : `/${language}/`
      },
      {
        name: language === 'en' ? 'Contact' : language === 'fr' ? 'Contact' : 'Contacto',
        url: language === 'es' ? '/contacto' : `/${language}/contact`
      }
    ]
  };
  return {
    type: 'contact',
    pageType: 'contact',
    seo,
    contactInfo: {
      main: mainContact,
      methods: contactMethods,
      offices: processedOffices,
      socialLinks
    },
    team: {
      advisors: processedAdvisors,
      totalAdvisors: processedAdvisors.length
    },
    services: consultationServices,
    businessInfo: {
      companyName: 'CLIC Inmobiliaria',
      founded: baseData.globalConfig?.company?.founded || '2015',
      license: baseData.globalConfig?.company?.license || 'REG-2015-001',
      languages: [
        'Spanish',
        'English',
        'French'
      ],
      serviceAreas: [
        'Santo Domingo',
        'Punta Cana',
        'La Romana',
        'Puerto Plata',
        'Santiago'
      ]
    },
    faqs: [
      {
        question: language === 'en' ? 'How can I schedule a property viewing?' : language === 'fr' ? 'Comment puis-je programmer une visite de propriété?' : '¿Cómo puedo programar una visita de propiedad?',
        answer: language === 'en' ? 'You can schedule a viewing by calling us, sending a WhatsApp message, or filling out our contact form. We typically respond within 2 hours.' : language === 'fr' ? 'Vous pouvez programmer une visite en nous appelant, envoyant un message WhatsApp, ou remplissant notre formulaire de contact. Nous répondons généralement dans les 2 heures.' : 'Puedes programar una visita llamándonos, enviando un mensaje de WhatsApp, o llenando nuestro formulario de contacto. Típicamente respondemos en 2 horas.'
      },
      {
        question: language === 'en' ? 'Do you offer virtual property tours?' : language === 'fr' ? 'Offrez-vous des visites virtuelles de propriétés?' : '¿Ofrecen tours virtuales de propiedades?',
        answer: language === 'en' ? 'Yes, we offer virtual tours via video call for all our properties. This is especially useful for international clients.' : language === 'fr' ? 'Oui, nous offrons des visites virtuelles par appel vidéo pour toutes nos propriétés. C\'est particulièrement utile pour les clients internationaux.' : 'Sí, ofrecemos tours virtuales por videollamada para todas nuestras propiedades. Esto es especialmente útil para clientes internacionales.'
      },
      {
        question: language === 'en' ? 'What languages do your agents speak?' : language === 'fr' ? 'Quelles langues parlent vos agents?' : '¿Qué idiomas hablan sus agentes?',
        answer: language === 'en' ? 'Our team speaks Spanish, English, and French fluently. We can assist you in your preferred language.' : language === 'fr' ? 'Notre équipe parle couramment espagnol, anglais et français. Nous pouvons vous assister dans votre langue préférée.' : 'Nuestro equipo habla español, inglés y francés con fluidez. Podemos asistirte en tu idioma preferido.'
      },
      {
        question: language === 'en' ? 'Is there a fee for consultation?' : language === 'fr' ? 'Y a-t-il des frais pour la consultation?' : '¿Hay una tarifa por la consulta?',
        answer: language === 'en' ? 'Initial consultation and property search are completely free. We only charge commission upon successful transaction.' : language === 'fr' ? 'La consultation initiale et la recherche de propriété sont complètement gratuites. Nous ne facturons une commission qu\'après une transaction réussie.' : 'La consulta inicial y búsqueda de propiedades son completamente gratuitas. Solo cobramos comisión después de una transacción exitosa.'
      }
    ]
  };
}
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function buildAdvisorContactUrl(advisorSlug, language, trackingString) {
  if (!advisorSlug) return null;
  const basePath = language === 'es' ? 'asesores' : language === 'en' ? 'advisors' : 'conseillers';
  let url = `${basePath}/${advisorSlug}`;
  if (language === 'en') url = `en/${url}`;
  if (language === 'fr') url = `fr/${url}`;
  return `/${url}${trackingString}`;
}
