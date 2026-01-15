// legal-handler.ts
import { getUIText } from './ui-texts.ts';

// ============================================================================
// LEGAL HANDLER - TÉRMINOS Y CONDICIONES / POLÍTICAS DE PRIVACIDAD
// ============================================================================

export async function handleLegal(params: any) {
  const { supabase, language, trackingString, baseData, legalType } = params;

  console.log(`📄 Handling legal page: ${legalType}`);

  // 1. Intentar obtener contenido legal de la base de datos
  const { data: legalContent, error } = await supabase
    .from('legal_content')
    .select('*')
    .eq('type', legalType)
    .eq('language', language)
    .eq('country_code', baseData.country?.code || 'DO')
    .single();

  // 2. Contenido por defecto si no existe en BD
  const defaultContent: Record<string, any> = {
    es: {
      terms: {
        title: 'Términos y Condiciones | CLIC',
        description: 'Lee nuestros términos y condiciones de uso del sitio web y servicios',
        h1: 'Términos y Condiciones',
        h2: 'Condiciones de uso del sitio web y servicios de CLIC Inmobiliaria',
        sections: [
          {
            title: '1. Aceptación de los Términos',
            content: 'Al acceder y utilizar este sitio web de CLIC Inmobiliaria, usted acepta estar sujeto a estos términos y condiciones de uso, todas las leyes y regulaciones aplicables en la República Dominicana, y acepta que es responsable del cumplimiento de todas las leyes locales aplicables. Si no está de acuerdo con alguno de estos términos, se le prohíbe usar o acceder a este sitio.'
          },
          {
            title: '2. Uso del Sitio',
            content: 'Este sitio web y su contenido son para su información general y uso personal. Está sujeto a cambios sin previo aviso. El uso de cualquier información o material en este sitio web es enteramente bajo su propio riesgo, por lo cual no seremos responsables.'
          },
          {
            title: '3. Propiedad Intelectual',
            content: 'Este sitio web contiene material que es propiedad de CLIC Inmobiliaria o está bajo licencia. Este material incluye, pero no se limita a, el diseño, la apariencia, los gráficos, las fotografías y el contenido textual. La reproducción está prohibida excepto de acuerdo con el aviso de derechos de autor.'
          },
          {
            title: '4. Listados de Propiedades',
            content: 'Toda la información sobre las propiedades listadas en este sitio se proporciona de buena fe y se considera precisa en el momento de la publicación. Sin embargo, CLIC Inmobiliaria no garantiza la exactitud, integridad o actualidad de dicha información. Los precios, disponibilidad y características están sujetos a cambios sin previo aviso.'
          },
          {
            title: '5. Limitación de Responsabilidad',
            content: 'CLIC Inmobiliaria no será responsable de ningún daño directo, indirecto, incidental, especial o consecuente que resulte del uso o la imposibilidad de usar este sitio web o los servicios ofrecidos, incluso si hemos sido informados de la posibilidad de tales daños.'
          },
          {
            title: '6. Enlaces a Terceros',
            content: 'Este sitio web puede contener enlaces a otros sitios web de interés. Sin embargo, una vez que haya utilizado estos enlaces para salir de nuestro sitio, debe tener en cuenta que no tenemos control sobre ese otro sitio web. Por lo tanto, no podemos ser responsables de la protección y privacidad de cualquier información que usted proporcione mientras visita dichos sitios.'
          },
          {
            title: '7. Modificaciones',
            content: 'CLIC Inmobiliaria se reserva el derecho de revisar estos términos y condiciones en cualquier momento sin previo aviso. Al usar este sitio web, usted acepta estar sujeto a la versión actual de estos términos y condiciones de uso.'
          },
          {
            title: '8. Jurisdicción',
            content: 'Estos términos y condiciones se rigen por las leyes de la República Dominicana. Cualquier disputa relacionada con estos términos estará sujeta a la jurisdicción exclusiva de los tribunales dominicanos.'
          }
        ]
      },
      privacy: {
        title: 'Política de Privacidad | CLIC',
        description: 'Conoce cómo CLIC Inmobiliaria protege y maneja tu información personal',
        h1: 'Política de Privacidad',
        h2: 'Cómo manejamos y protegemos tu información personal',
        sections: [
          {
            title: '1. Recopilación de Información',
            content: 'CLIC Inmobiliaria recopila información que usted nos proporciona directamente cuando crea una cuenta, completa un formulario de contacto, solicita información sobre una propiedad, se suscribe a nuestro boletín o utiliza cualquiera de nuestros servicios. Esta información puede incluir: nombre completo, correo electrónico, número de teléfono, dirección, preferencias de búsqueda de propiedades y cualquier otra información que voluntariamente nos proporcione.'
          },
          {
            title: '2. Uso de la Información',
            content: 'Utilizamos la información que recopilamos para proporcionar y mantener nuestros servicios de intermediación inmobiliaria, procesar transacciones y enviar información relacionada, enviarle comunicaciones de marketing (si ha dado su consentimiento), responder a sus comentarios y preguntas, mejorar nuestro sitio web y servicios, y detectar y prevenir problemas técnicos o de seguridad.'
          },
          {
            title: '3. Compartir Información',
            content: 'No vendemos, comercializamos ni transferimos su información personal a terceros sin su consentimiento explícito, excepto en casos limitados: con proveedores de servicios de confianza bajo acuerdos de confidencialidad, cuando sea legalmente requerido, o en caso de fusión o adquisición de la empresa.'
          },
          {
            title: '4. Cookies y Tecnologías',
            content: 'Utilizamos cookies y tecnologías similares para recopilar información sobre su actividad en nuestro sitio. Las cookies nos ayudan a recordar sus preferencias, entender cómo usa nuestro sitio y mejorar su experiencia. Puede configurar su navegador para rechazar cookies, pero esto puede afectar la funcionalidad del sitio.'
          },
          {
            title: '5. Protección de Datos',
            content: 'Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger su información personal contra el acceso no autorizado, alteración, divulgación o destrucción. Esto incluye el uso de cifrado SSL, firewalls, controles de acceso y otras medidas de seguridad estándar de la industria.'
          },
          {
            title: '6. Sus Derechos',
            content: 'Usted tiene derecho a acceder, corregir, actualizar o eliminar su información personal en cualquier momento. También puede oponerse al procesamiento de sus datos, solicitar la limitación del procesamiento o solicitar la portabilidad de sus datos. Para ejercer estos derechos, contáctenos a través de la información proporcionada al final de esta política.'
          },
          {
            title: '7. Retención de Datos',
            content: 'Conservamos su información personal solo durante el tiempo necesario para los fines establecidos en esta política de privacidad y para cumplir con nuestras obligaciones legales. Los períodos de retención pueden variar dependiendo del tipo de información y el propósito para el cual se recopiló.'
          },
          {
            title: '8. Cambios a esta Política',
            content: 'Podemos actualizar esta política de privacidad de vez en cuando para reflejar cambios en nuestras prácticas o por otras razones operativas, legales o regulatorias. Le notificaremos sobre cualquier cambio material publicando la nueva política en nuestro sitio web y actualizando la fecha de última actualización.'
          },
          {
            title: '9. Contacto',
            content: `Si tiene preguntas sobre esta política de privacidad, contáctenos: Email: privacidad@clic.do, Teléfono: ${baseData.globalConfig?.contact?.phone || '+1 (829) 514-8080'}, Dirección: Santo Domingo, República Dominicana`
          }
        ]
      }
    },
    en: {
      terms: {
        title: 'Terms and Conditions | CLIC',
        description: 'Read our terms and conditions for using the website and services',
        h1: 'Terms and Conditions',
        h2: 'Terms of use for CLIC Real Estate website and services',
        sections: [
          {
            title: '1. Acceptance of Terms',
            content: 'By accessing and using this CLIC Real Estate website, you agree to be bound by these terms and conditions of use, all applicable laws and regulations in the Dominican Republic, and agree that you are responsible for compliance with any applicable local laws.'
          },
          {
            title: '2. Use of Site',
            content: 'This website and its content are for your general information and personal use. It is subject to change without notice. The use of any information or materials on this website is entirely at your own risk, for which we shall not be liable.'
          },
          {
            title: '3. Intellectual Property',
            content: 'This website contains material which is owned by or licensed to CLIC Real Estate. This material includes, but is not limited to, the design, layout, look, appearance, graphics, photographs and textual content.'
          },
          {
            title: '4. Property Listings',
            content: 'All information about properties listed on this site is provided in good faith and is believed to be accurate at the time of publication. However, CLIC Real Estate does not guarantee the accuracy, completeness or timeliness of such information.'
          }
        ]
      },
      privacy: {
        title: 'Privacy Policy | CLIC',
        description: 'Learn how CLIC Real Estate protects and handles your personal information',
        h1: 'Privacy Policy',
        h2: 'How we handle and protect your personal information',
        sections: [
          {
            title: '1. Information Collection',
            content: 'CLIC Real Estate collects information that you provide directly to us when you create an account, complete a contact form, request property information, subscribe to our newsletter, or use any of our services.'
          },
          {
            title: '2. Use of Information',
            content: 'We use the information we collect to provide and maintain our real estate services, process transactions, send marketing communications (with consent), respond to your inquiries, and improve our website and services.'
          },
          {
            title: '3. Information Sharing',
            content: 'We do not sell, trade or transfer your personal information to third parties without your explicit consent, except with trusted service providers, when legally required, or in case of merger or acquisition.'
          },
          {
            title: '4. Cookies',
            content: 'We use cookies and similar technologies to improve your experience. You can set your browser to reject cookies, but this may affect site functionality.'
          }
        ]
      }
    },
    fr: {
      terms: {
        title: 'Termes et Conditions | CLIC',
        description: 'Lisez nos termes et conditions d\'utilisation',
        h1: 'Termes et Conditions',
        h2: 'Conditions d\'utilisation du site web CLIC Immobilier',
        sections: [
          {
            title: '1. Acceptation des Termes',
            content: 'En accédant et en utilisant ce site web de CLIC Immobilier, vous acceptez d\'être lié par ces termes et conditions.'
          }
        ]
      },
      privacy: {
        title: 'Politique de Confidentialité | CLIC',
        description: 'Découvrez comment CLIC Immobilier protège vos informations',
        h1: 'Politique de Confidentialité',
        h2: 'Comment nous gérons vos informations personnelles',
        sections: [
          {
            title: '1. Collecte d\'Informations',
            content: 'CLIC Immobilier collecte les informations que vous nous fournissez.'
          }
        ]
      }
    }
  };

  // 3. Usar contenido de BD o contenido por defecto
  const contentData = defaultContent[language]?.[legalType] || defaultContent.es[legalType];
  const sections = legalContent?.sections || contentData.sections;
  const lastUpdated = legalContent?.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0];
  const jurisdiction = legalContent?.jurisdiction || baseData.country?.name || 'República Dominicana';

  // 4. Construir canonical URL
  const canonicalBase = language === 'es' ? '' : `/${language}`;
  let canonicalPath = '';
  if (legalType === 'terms') {
    canonicalPath = language === 'es' ? '/terminos-y-condiciones' :
                    language === 'en' ? '/terms-and-conditions' : '/termes-et-conditions';
  } else {
    canonicalPath = language === 'es' ? '/politicas-de-privacidad' :
                    language === 'en' ? '/privacy-policy' : '/politique-de-confidentialite';
  }

  // 5. Breadcrumbs
  const breadcrumbs = [
    { name: language === 'es' ? 'Inicio' : language === 'en' ? 'Home' : 'Accueil', url: '/' },
    { name: contentData.h1, url: canonicalBase + canonicalPath }
  ];

  // 6. Retornar datos
  return {
    ...baseData,
    pageType: legalType === 'terms' ? 'legal-terms' : 'legal-privacy',
    legalType,
    seo: {
      title: contentData.title,
      description: contentData.description,
      h1: contentData.h1,
      h2: contentData.h2,
      canonical_url: canonicalBase + canonicalPath,
      robots: 'noindex, follow',
      breadcrumbs,
      open_graph: {
        title: contentData.title,
        description: contentData.description,
        type: 'website'
      }
    },
    content: {
      sections
    },
    lastUpdated,
    jurisdiction,
    trackingString: `${trackingString}&page=legal-${legalType}`
  };
}
