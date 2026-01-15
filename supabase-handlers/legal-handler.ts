// supabase/functions/content-backend/handlers/legal-handler.ts
// Handler para /terminos-y-condiciones y /politicas-de-privacidad

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

interface LegalResponse {
  pageType: string;
  language: string;
  legalType: 'terms' | 'privacy';
  seo: any;
  content: {
    sections: Array<{
      title: string;
      content: string;
    }>;
  };
  lastUpdated: string;
  jurisdiction: string;
  globalConfig: any;
  country: any;
  trackingString: string;
}

export async function handleLegalPage(
  legalType: 'terms' | 'privacy',
  language: string,
  supabaseClient: any,
  country: any,
  globalConfig: any
): Promise<LegalResponse> {

  // 1. Intentar obtener contenido legal de la base de datos
  const { data: legalContent, error } = await supabaseClient
    .from('legal_content')
    .select('*')
    .eq('type', legalType)
    .eq('language', language)
    .eq('country_code', country?.code || 'DO')
    .single();

  // 2. Traducciones y contenido por defecto
  const translations: Record<string, any> = {
    es: {
      terms: {
        title: 'Términos y Condiciones | CLIC',
        description: 'Lee nuestros términos y condiciones de uso del sitio web y servicios',
        h1: 'Términos y Condiciones',
        h2: 'Condiciones de uso del sitio web y servicios de CLIC Inmobiliaria',
        defaultSections: [
          {
            title: '1. Aceptación de los Términos',
            content: `Al acceder y utilizar este sitio web de CLIC Inmobiliaria, usted acepta estar sujeto a estos términos y condiciones de uso, todas las leyes y regulaciones aplicables en la República Dominicana, y acepta que es responsable del cumplimiento de todas las leyes locales aplicables. Si no está de acuerdo con alguno de estos términos, se le prohíbe usar o acceder a este sitio.`
          },
          {
            title: '2. Uso del Sitio',
            content: `Este sitio web y su contenido son para su información general y uso personal. Está sujeto a cambios sin previo aviso. El uso de cualquier información o material en este sitio web es enteramente bajo su propio riesgo, por lo cual no seremos responsables. Será su propia responsabilidad asegurarse de que cualquier producto, servicio o información disponible a través de este sitio web cumpla con sus requisitos específicos.`
          },
          {
            title: '3. Propiedad Intelectual',
            content: `Este sitio web contiene material que es propiedad de CLIC Inmobiliaria o está bajo licencia. Este material incluye, pero no se limita a, el diseño, la apariencia, los gráficos, las fotografías y el contenido textual. La reproducción está prohibida excepto de acuerdo con el aviso de derechos de autor, que forma parte de estos términos y condiciones.`
          },
          {
            title: '4. Listados de Propiedades',
            content: `Toda la información sobre las propiedades listadas en este sitio se proporciona de buena fe y se considera precisa en el momento de la publicación. Sin embargo, CLIC Inmobiliaria no garantiza la exactitud, integridad o actualidad de dicha información. Los precios, disponibilidad y características de las propiedades están sujetos a cambios sin previo aviso.`
          },
          {
            title: '5. Limitación de Responsabilidad',
            content: `CLIC Inmobiliaria no será responsable de ningún daño directo, indirecto, incidental, especial o consecuente que resulte del uso o la imposibilidad de usar este sitio web o los servicios ofrecidos, incluso si hemos sido informados de la posibilidad de tales daños.`
          },
          {
            title: '6. Enlaces a Terceros',
            content: `Este sitio web puede contener enlaces a otros sitios web de interés. Sin embargo, una vez que haya utilizado estos enlaces para salir de nuestro sitio, debe tener en cuenta que no tenemos control sobre ese otro sitio web y no podemos ser responsables de la protección y privacidad de cualquier información que usted proporcione mientras visita dichos sitios.`
          },
          {
            title: '7. Modificaciones',
            content: `CLIC Inmobiliaria se reserva el derecho de revisar estos términos y condiciones en cualquier momento sin previo aviso. Al usar este sitio web, usted acepta estar sujeto a la versión actual de estos términos y condiciones de uso.`
          },
          {
            title: '8. Jurisdicción',
            content: `Estos términos y condiciones se rigen por las leyes de la República Dominicana. Cualquier disputa relacionada con estos términos estará sujeta a la jurisdicción exclusiva de los tribunales dominicanos.`
          }
        ]
      },
      privacy: {
        title: 'Política de Privacidad | CLIC',
        description: 'Conoce cómo CLIC Inmobiliaria protege y maneja tu información personal',
        h1: 'Política de Privacidad',
        h2: 'Cómo manejamos y protegemos tu información personal',
        defaultSections: [
          {
            title: '1. Recopilación de Información',
            content: `CLIC Inmobiliaria recopila información que usted nos proporciona directamente cuando crea una cuenta, completa un formulario de contacto, solicita información sobre una propiedad, se suscribe a nuestro boletín o utiliza cualquiera de nuestros servicios. Esta información puede incluir: nombre completo, correo electrónico, número de teléfono, dirección, preferencias de búsqueda de propiedades y cualquier otra información que voluntariamente nos proporcione.`
          },
          {
            title: '2. Uso de la Información',
            content: `Utilizamos la información que recopilamos para los siguientes propósitos: proporcionar y mantener nuestros servicios, procesar transacciones y enviar información relacionada, enviarle comunicaciones de marketing si ha dado su consentimiento, responder a sus comentarios, preguntas y solicitudes, mejorar nuestro sitio web y servicios, detectar, prevenir y abordar problemas técnicos o de seguridad.`
          },
          {
            title: '3. Compartir Información',
            content: `No vendemos, comercializamos ni transferimos su información personal a terceros sin su consentimiento, excepto en los siguientes casos: con proveedores de servicios que nos ayudan a operar nuestro negocio, cuando sea requerido por ley o para proteger nuestros derechos, en el caso de una fusión, adquisición o venta de activos.`
          },
          {
            title: '4. Cookies y Tecnologías Similares',
            content: `Utilizamos cookies y tecnologías similares para recopilar información sobre su actividad en nuestro sitio. Las cookies nos ayudan a recordar sus preferencias, entender cómo usa nuestro sitio y mejorar su experiencia. Puede configurar su navegador para rechazar cookies, pero esto puede afectar la funcionalidad del sitio.`
          },
          {
            title: '5. Protección de Datos',
            content: `Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger su información personal contra el acceso no autorizado, alteración, divulgación o destrucción. Esto incluye el uso de cifrado SSL, firewalls, controles de acceso y otras medidas de seguridad estándar de la industria.`
          },
          {
            title: '6. Sus Derechos',
            content: `Usted tiene derecho a acceder, corregir, actualizar o eliminar su información personal en cualquier momento. También puede oponerse al procesamiento de sus datos, solicitar la limitación del procesamiento o solicitar la portabilidad de sus datos. Para ejercer estos derechos, contáctenos a través de la información proporcionada al final de esta política.`
          },
          {
            title: '7. Retención de Datos',
            content: `Conservamos su información personal solo durante el tiempo necesario para los fines establecidos en esta política de privacidad y para cumplir con nuestras obligaciones legales. Los períodos de retención pueden variar dependiendo del tipo de información y el propósito para el cual se recopiló.`
          },
          {
            title: '8. Cambios a esta Política',
            content: `Podemos actualizar esta política de privacidad de vez en cuando para reflejar cambios en nuestras prácticas o por otras razones operativas, legales o regulatorias. Le notificaremos sobre cualquier cambio material publicando la nueva política en nuestro sitio web y actualizando la fecha de "última actualización".`
          },
          {
            title: '9. Contacto',
            content: `Si tiene preguntas o inquietudes sobre esta política de privacidad o nuestras prácticas de manejo de datos, contáctenos a: Email: privacidad@clic.do, Teléfono: +1 (829) 514-8080, Dirección: Santo Domingo, República Dominicana`
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
        defaultSections: [
          {
            title: '1. Acceptance of Terms',
            content: `By accessing and using this CLIC Real Estate website, you agree to be bound by these terms and conditions of use, all applicable laws and regulations in the Dominican Republic, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site.`
          },
          {
            title: '2. Use of Site',
            content: `This website and its content are for your general information and personal use. It is subject to change without notice. The use of any information or materials on this website is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services or information available through this website meet your specific requirements.`
          },
          {
            title: '3. Intellectual Property',
            content: `This website contains material which is owned by or licensed to CLIC Real Estate. This material includes, but is not limited to, the design, layout, look, appearance, graphics, photographs and textual content. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions.`
          },
          {
            title: '4. Property Listings',
            content: `All information about properties listed on this site is provided in good faith and is believed to be accurate at the time of publication. However, CLIC Real Estate does not guarantee the accuracy, completeness or timeliness of such information. Prices, availability and features of properties are subject to change without notice.`
          },
          {
            title: '5. Limitation of Liability',
            content: `CLIC Real Estate will not be liable for any direct, indirect, incidental, special or consequential damages resulting from the use or inability to use this website or the services offered, even if we have been advised of the possibility of such damages.`
          },
          {
            title: '6. Third Party Links',
            content: `This website may contain links to other websites of interest. However, once you have used these links to leave our site, you should note that we do not have any control over that other website and cannot be responsible for the protection and privacy of any information which you provide whilst visiting such sites.`
          },
          {
            title: '7. Modifications',
            content: `CLIC Real Estate reserves the right to revise these terms and conditions at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms and conditions of use.`
          },
          {
            title: '8. Jurisdiction',
            content: `These terms and conditions are governed by the laws of the Dominican Republic. Any dispute relating to these terms shall be subject to the exclusive jurisdiction of the Dominican courts.`
          }
        ]
      },
      privacy: {
        title: 'Privacy Policy | CLIC',
        description: 'Learn how CLIC Real Estate protects and handles your personal information',
        h1: 'Privacy Policy',
        h2: 'How we handle and protect your personal information',
        defaultSections: [
          {
            title: '1. Information Collection',
            content: `CLIC Real Estate collects information that you provide directly to us when you create an account, complete a contact form, request property information, subscribe to our newsletter, or use any of our services. This information may include: full name, email address, phone number, address, property search preferences, and any other information you voluntarily provide.`
          },
          {
            title: '2. Use of Information',
            content: `We use the information we collect for the following purposes: to provide and maintain our services, process transactions and send related information, send you marketing communications if you have consented, respond to your comments, questions and requests, improve our website and services, detect, prevent and address technical or security issues.`
          },
          {
            title: '3. Information Sharing',
            content: `We do not sell, trade or transfer your personal information to third parties without your consent, except in the following cases: with service providers who help us operate our business, when required by law or to protect our rights, in the event of a merger, acquisition or asset sale.`
          },
          {
            title: '4. Cookies and Similar Technologies',
            content: `We use cookies and similar technologies to collect information about your activity on our site. Cookies help us remember your preferences, understand how you use our site and improve your experience. You can set your browser to reject cookies, but this may affect site functionality.`
          },
          {
            title: '5. Data Protection',
            content: `We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure or destruction. This includes the use of SSL encryption, firewalls, access controls and other industry-standard security measures.`
          },
          {
            title: '6. Your Rights',
            content: `You have the right to access, correct, update or delete your personal information at any time. You may also object to the processing of your data, request restriction of processing or request data portability. To exercise these rights, contact us through the information provided at the end of this policy.`
          },
          {
            title: '7. Data Retention',
            content: `We retain your personal information only for as long as necessary for the purposes set out in this privacy policy and to comply with our legal obligations. Retention periods may vary depending on the type of information and the purpose for which it was collected.`
          },
          {
            title: '8. Changes to This Policy',
            content: `We may update this privacy policy from time to time to reflect changes in our practices or for other operational, legal or regulatory reasons. We will notify you of any material changes by posting the new policy on our website and updating the "last updated" date.`
          },
          {
            title: '9. Contact',
            content: `If you have questions or concerns about this privacy policy or our data handling practices, contact us at: Email: privacy@clic.do, Phone: +1 (829) 514-8080, Address: Santo Domingo, Dominican Republic`
          }
        ]
      }
    },
    fr: {
      terms: {
        title: 'Termes et Conditions | CLIC',
        description: 'Lisez nos termes et conditions d\'utilisation du site web et des services',
        h1: 'Termes et Conditions',
        h2: 'Conditions d\'utilisation du site web et des services de CLIC Immobilier',
        defaultSections: [
          {
            title: '1. Acceptation des Termes',
            content: `En accédant et en utilisant ce site web de CLIC Immobilier, vous acceptez d'être lié par ces termes et conditions d'utilisation, toutes les lois et réglementations applicables en République Dominicaine, et acceptez que vous êtes responsable du respect de toutes les lois locales applicables.`
          }
          // ... más secciones en francés
        ]
      },
      privacy: {
        title: 'Politique de Confidentialité | CLIC',
        description: 'Découvrez comment CLIC Immobilier protège et gère vos informations personnelles',
        h1: 'Politique de Confidentialité',
        h2: 'Comment nous gérons et protégeons vos informations personnelles',
        defaultSections: [
          {
            title: '1. Collecte d\'Informations',
            content: `CLIC Immobilier collecte les informations que vous nous fournissez directement lorsque vous créez un compte, remplissez un formulaire de contact, demandez des informations sur une propriété, vous abonnez à notre newsletter ou utilisez l'un de nos services.`
          }
          // ... más secciones en francés
        ]
      }
    }
  };

  const t = translations[language]?.[legalType] || translations.es[legalType];

  // 3. Usar contenido de BD si existe, sino usar contenido por defecto
  const sections = legalContent?.sections || t.defaultSections;
  const lastUpdated = legalContent?.updated_at?.split('T')[0] || new Date().toISOString().split('T')[0];
  const jurisdiction = legalContent?.jurisdiction || country?.name || 'República Dominicana';

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
    { name: t.h1, url: canonicalBase + canonicalPath }
  ];

  return {
    pageType: legalType === 'terms' ? 'legal-terms' : 'legal-privacy',
    language,
    legalType,
    seo: {
      title: t.title,
      description: t.description,
      h1: t.h1,
      h2: t.h2,
      canonical_url: canonicalBase + canonicalPath,
      robots: 'noindex, follow',
      breadcrumbs,
      open_graph: {
        title: t.title,
        description: t.description,
        type: 'website'
      }
    },
    content: {
      sections
    },
    lastUpdated,
    jurisdiction,
    globalConfig,
    country,
    trackingString: `legal=${legalType}-${language}`
  };
}
