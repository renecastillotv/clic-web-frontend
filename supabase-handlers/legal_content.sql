-- =========================================
-- Tabla para contenido legal personalizado
-- =========================================

-- Crear tabla
CREATE TABLE IF NOT EXISTS legal_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('terms', 'privacy')),
  language VARCHAR(2) NOT NULL CHECK (language IN ('es', 'en', 'fr')),
  country_code VARCHAR(2) NOT NULL DEFAULT 'DO',
  sections JSONB NOT NULL,
  jurisdiction VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, language, country_code)
);

-- Comentarios
COMMENT ON TABLE legal_content IS 'Contenido legal personalizado por país e idioma';
COMMENT ON COLUMN legal_content.type IS 'Tipo de contenido: terms o privacy';
COMMENT ON COLUMN legal_content.language IS 'Código ISO del idioma: es, en, fr';
COMMENT ON COLUMN legal_content.country_code IS 'Código ISO del país: DO, US, etc.';
COMMENT ON COLUMN legal_content.sections IS 'Array de objetos {title, content}';

-- Índices
CREATE INDEX IF NOT EXISTS idx_legal_content_lookup
  ON legal_content(type, language, country_code);

CREATE INDEX IF NOT EXISTS idx_legal_content_updated
  ON legal_content(updated_at DESC);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_legal_content_updated_at ON legal_content;
CREATE TRIGGER update_legal_content_updated_at
  BEFORE UPDATE ON legal_content
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- Datos de ejemplo - Términos y Condiciones
-- =========================================

-- Español
INSERT INTO legal_content (type, language, country_code, sections, jurisdiction)
VALUES (
  'terms',
  'es',
  'DO',
  '[
    {
      "title": "1. Aceptación de los Términos",
      "content": "Al acceder y utilizar este sitio web de CLIC Inmobiliaria, usted acepta estar sujeto a estos términos y condiciones de uso, todas las leyes y regulaciones aplicables en la República Dominicana, y acepta que es responsable del cumplimiento de todas las leyes locales aplicables. Si no está de acuerdo con alguno de estos términos, se le prohíbe usar o acceder a este sitio. Los materiales contenidos en este sitio web están protegidos por las leyes de derechos de autor y marcas registradas aplicables."
    },
    {
      "title": "2. Uso del Sitio",
      "content": "Este sitio web y su contenido son para su información general y uso personal. Está sujeto a cambios sin previo aviso. El uso de cualquier información o material en este sitio web es enteramente bajo su propio riesgo, por lo cual no seremos responsables. Será su propia responsabilidad asegurarse de que cualquier producto, servicio o información disponible a través de este sitio web cumpla con sus requisitos específicos. CLIC Inmobiliaria se reserva el derecho de modificar o discontinuar el servicio en cualquier momento sin previo aviso."
    },
    {
      "title": "3. Propiedad Intelectual",
      "content": "Este sitio web contiene material que es propiedad de CLIC Inmobiliaria o está bajo licencia. Este material incluye, pero no se limita a, el diseño, la apariencia, los gráficos, las fotografías y el contenido textual. La reproducción está prohibida excepto de acuerdo con el aviso de derechos de autor, que forma parte de estos términos y condiciones. Todas las marcas comerciales reproducidas en este sitio web que no son propiedad de, u otorgadas bajo licencia por el operador, se reconocen en el sitio web."
    },
    {
      "title": "4. Listados de Propiedades",
      "content": "Toda la información sobre las propiedades listadas en este sitio se proporciona de buena fe y se considera precisa en el momento de la publicación. Sin embargo, CLIC Inmobiliaria no garantiza la exactitud, integridad o actualidad de dicha información. Los precios, disponibilidad y características de las propiedades están sujetos a cambios sin previo aviso. Las fotografías y descripciones son solo para fines ilustrativos. Se recomienda a los potenciales compradores que verifiquen toda la información directamente con nuestros asesores antes de tomar cualquier decisión de compra."
    },
    {
      "title": "5. Limitación de Responsabilidad",
      "content": "CLIC Inmobiliaria no será responsable de ningún daño directo, indirecto, incidental, especial o consecuente que resulte del uso o la imposibilidad de usar este sitio web o los servicios ofrecidos, incluso si hemos sido informados de la posibilidad de tales daños. Esto incluye, sin limitación, pérdida de ingresos o beneficios anticipados, pérdida de negocios, pérdida de oportunidades, pérdida de datos o cualquier otro daño, ya sea que surja de un contrato, negligencia u otra acción ilícita."
    },
    {
      "title": "6. Enlaces a Terceros",
      "content": "Este sitio web puede contener enlaces a otros sitios web de interés. Sin embargo, una vez que haya utilizado estos enlaces para salir de nuestro sitio, debe tener en cuenta que no tenemos control sobre ese otro sitio web. Por lo tanto, no podemos ser responsables de la protección y privacidad de cualquier información que usted proporcione mientras visita dichos sitios y dichos sitios no se rigen por esta declaración de privacidad. Debe tener precaución y consultar la declaración de privacidad aplicable al sitio web en cuestión."
    },
    {
      "title": "7. Modificaciones",
      "content": "CLIC Inmobiliaria se reserva el derecho de revisar estos términos y condiciones en cualquier momento sin previo aviso. Al usar este sitio web, usted acepta estar sujeto a la versión actual de estos términos y condiciones de uso. Es su responsabilidad revisar periódicamente estos términos para estar al tanto de cualquier cambio. El uso continuado del sitio después de la publicación de cambios constituye su aceptación de dichos cambios."
    },
    {
      "title": "8. Jurisdicción y Ley Aplicable",
      "content": "Estos términos y condiciones se rigen por las leyes de la República Dominicana y se interpretan de acuerdo con ellas. Usted se somete irrevocablemente a la jurisdicción exclusiva de los tribunales de Santo Domingo, República Dominicana. Cualquier disputa relacionada con estos términos estará sujeta a la jurisdicción exclusiva de los tribunales dominicanos. Para cualquier consulta sobre estos términos, puede contactarnos en info@clic.do o llamar al +1 (829) 514-8080."
    }
  ]'::jsonb,
  'República Dominicana'
)
ON CONFLICT (type, language, country_code)
DO UPDATE SET
  sections = EXCLUDED.sections,
  jurisdiction = EXCLUDED.jurisdiction,
  updated_at = NOW();

-- Inglés
INSERT INTO legal_content (type, language, country_code, sections, jurisdiction)
VALUES (
  'terms',
  'en',
  'DO',
  '[
    {
      "title": "1. Acceptance of Terms",
      "content": "By accessing and using this CLIC Real Estate website, you agree to be bound by these terms and conditions of use, all applicable laws and regulations in the Dominican Republic, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trademark laws."
    },
    {
      "title": "2. Use of Site",
      "content": "This website and its content are for your general information and personal use. It is subject to change without notice. The use of any information or materials on this website is entirely at your own risk, for which we shall not be liable. It shall be your own responsibility to ensure that any products, services or information available through this website meet your specific requirements."
    },
    {
      "title": "3. Intellectual Property",
      "content": "This website contains material which is owned by or licensed to CLIC Real Estate. This material includes, but is not limited to, the design, layout, look, appearance, graphics, photographs and textual content. Reproduction is prohibited other than in accordance with the copyright notice, which forms part of these terms and conditions."
    },
    {
      "title": "4. Property Listings",
      "content": "All information about properties listed on this site is provided in good faith and is believed to be accurate at the time of publication. However, CLIC Real Estate does not guarantee the accuracy, completeness or timeliness of such information. Prices, availability and features of properties are subject to change without notice."
    }
  ]'::jsonb,
  'Dominican Republic'
)
ON CONFLICT (type, language, country_code)
DO UPDATE SET
  sections = EXCLUDED.sections,
  jurisdiction = EXCLUDED.jurisdiction,
  updated_at = NOW();

-- =========================================
-- Datos de ejemplo - Políticas de Privacidad
-- =========================================

-- Español
INSERT INTO legal_content (type, language, country_code, sections, jurisdiction)
VALUES (
  'privacy',
  'es',
  'DO',
  '[
    {
      "title": "1. Recopilación de Información",
      "content": "CLIC Inmobiliaria recopila información que usted nos proporciona directamente cuando crea una cuenta, completa un formulario de contacto, solicita información sobre una propiedad, se suscribe a nuestro boletín o utiliza cualquiera de nuestros servicios. Esta información puede incluir: nombre completo, correo electrónico, número de teléfono, dirección, preferencias de búsqueda de propiedades, información financiera (cuando sea relevante para transacciones), y cualquier otra información que voluntariamente nos proporcione. También recopilamos automáticamente cierta información cuando visita nuestro sitio, incluyendo su dirección IP, tipo de navegador, páginas visitadas y tiempo de permanencia."
    },
    {
      "title": "2. Uso de la Información",
      "content": "Utilizamos la información que recopilamos para los siguientes propósitos: proporcionar y mantener nuestros servicios de intermediación inmobiliaria, procesar transacciones y enviar información relacionada con sus consultas, enviarle comunicaciones de marketing sobre propiedades que coincidan con sus preferencias (si ha dado su consentimiento), responder a sus comentarios, preguntas y solicitudes de manera oportuna, mejorar nuestro sitio web y servicios mediante análisis de uso, personalizar su experiencia en nuestro sitio, detectar, prevenir y abordar problemas técnicos o de seguridad, y cumplir con nuestras obligaciones legales."
    },
    {
      "title": "3. Compartir Información con Terceros",
      "content": "No vendemos, comercializamos ni transferimos su información personal a terceros sin su consentimiento explícito, excepto en los siguientes casos limitados: con proveedores de servicios de confianza que nos ayudan a operar nuestro negocio (procesadores de pago, servicios de hosting, herramientas de marketing), siempre bajo acuerdos de confidencialidad estrictos; cuando sea legalmente requerido por autoridades competentes o para proteger nuestros derechos legítimos; en el caso de una fusión, adquisición o venta de activos de la empresa, donde sus datos podrían transferirse como parte de los activos; con su consentimiento explícito para propósitos específicos que le hayamos comunicado claramente."
    },
    {
      "title": "4. Cookies y Tecnologías de Seguimiento",
      "content": "Utilizamos cookies y tecnologías similares para recopilar información sobre su actividad en nuestro sitio. Las cookies nos ayudan a: recordar sus preferencias y configuraciones, entender cómo usa nuestro sitio para mejorar la experiencia del usuario, mostrarle anuncios relevantes basados en sus intereses, y analizar el rendimiento del sitio. Usamos cookies esenciales (necesarias para el funcionamiento del sitio), cookies de rendimiento (para analítica), cookies funcionales (para recordar preferencias) y cookies de publicidad (para mostrar anuncios relevantes). Puede configurar su navegador para rechazar todas las cookies o indicar cuándo se envía una cookie, pero esto puede afectar algunas funcionalidades del sitio."
    },
    {
      "title": "5. Seguridad y Protección de Datos",
      "content": "Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger su información personal contra el acceso no autorizado, alteración, divulgación o destrucción. Estas medidas incluyen: cifrado SSL/TLS para todas las transmisiones de datos sensibles, firewalls y sistemas de detección de intrusiones, controles de acceso estrictos y autenticación multifactor para el personal, copias de seguridad regulares y planes de recuperación ante desastres, capacitación continua del personal en prácticas de seguridad, y auditorías de seguridad periódicas. Sin embargo, ningún método de transmisión por Internet o almacenamiento electrónico es 100% seguro, por lo que no podemos garantizar la seguridad absoluta."
    },
    {
      "title": "6. Sus Derechos de Privacidad",
      "content": "Bajo la legislación de protección de datos aplicable, usted tiene los siguientes derechos: derecho de acceso a su información personal que tenemos almacenada, derecho a rectificar información inexacta o incompleta, derecho a eliminar su información personal (derecho al olvido), bajo ciertas condiciones, derecho a restringir u oponerse al procesamiento de sus datos personales, derecho a la portabilidad de datos (recibir sus datos en formato estructurado), derecho a retirar su consentimiento en cualquier momento, y derecho a presentar una queja ante la autoridad de protección de datos competente. Para ejercer cualquiera de estos derechos, contáctenos a través de privacidad@clic.do."
    },
    {
      "title": "7. Retención de Datos",
      "content": "Conservamos su información personal solo durante el tiempo necesario para los fines establecidos en esta política de privacidad y para cumplir con nuestras obligaciones legales, resolver disputas y hacer cumplir nuestros acuerdos. Los períodos de retención específicos varían según el tipo de información: datos de cuenta activa se mantienen mientras su cuenta esté activa, datos de transacciones se conservan por al menos 10 años según requerimientos legales y fiscales, datos de marketing se eliminan dentro de 2 años de inactividad si no hay consentimiento renovado, y registros de comunicación se mantienen por 5 años para fines de servicio al cliente."
    },
    {
      "title": "8. Transferencias Internacionales de Datos",
      "content": "Sus datos pueden ser transferidos y mantenidos en servidores ubicados fuera de la República Dominicana. Cuando transferimos su información personal a otros países, nos aseguramos de que existan salvaguardas apropiadas, como cláusulas contractuales estándar aprobadas o mecanismos de certificación reconocidos. Al usar nuestros servicios, usted consiente estas transferencias bajo las protecciones descritas."
    },
    {
      "title": "9. Actualizaciones de la Política",
      "content": "Podemos actualizar esta política de privacidad periódicamente para reflejar cambios en nuestras prácticas, servicios o requisitos legales. Le notificaremos sobre cualquier cambio material publicando la nueva política en nuestro sitio web con una fecha de actualización visible y, cuando sea apropiado, enviándole una notificación por correo electrónico. Le recomendamos revisar esta política regularmente para mantenerse informado sobre cómo protegemos su información."
    },
    {
      "title": "10. Información de Contacto",
      "content": "Si tiene preguntas, inquietudes o solicitudes relacionadas con esta política de privacidad o nuestras prácticas de manejo de datos, puede contactarnos a través de: Email: privacidad@clic.do, Teléfono: +1 (829) 514-8080, Dirección postal: CLIC Inmobiliaria, Santo Domingo, República Dominicana. Nuestro Oficial de Protección de Datos está disponible para atender sus consultas de lunes a viernes de 9:00 AM a 6:00 PM."
    }
  ]'::jsonb,
  'República Dominicana'
)
ON CONFLICT (type, language, country_code)
DO UPDATE SET
  sections = EXCLUDED.sections,
  jurisdiction = EXCLUDED.jurisdiction,
  updated_at = NOW();

-- Inglés
INSERT INTO legal_content (type, language, country_code, sections, jurisdiction)
VALUES (
  'privacy',
  'en',
  'DO',
  '[
    {
      "title": "1. Information Collection",
      "content": "CLIC Real Estate collects information that you provide directly to us when you create an account, complete a contact form, request property information, subscribe to our newsletter, or use any of our services. This information may include: full name, email address, phone number, address, property search preferences, financial information (when relevant for transactions), and any other information you voluntarily provide."
    },
    {
      "title": "2. Use of Information",
      "content": "We use the information we collect to provide and maintain our real estate services, process transactions and send related information, send you marketing communications about matching properties (if consented), respond to your comments and requests, improve our website and services, personalize your experience, and comply with legal obligations."
    },
    {
      "title": "3. Information Sharing",
      "content": "We do not sell, trade or transfer your personal information to third parties without your explicit consent, except in limited cases: with trusted service providers under strict confidentiality agreements, when legally required, or in case of merger or acquisition."
    }
  ]'::jsonb,
  'Dominican Republic'
)
ON CONFLICT (type, language, country_code)
DO UPDATE SET
  sections = EXCLUDED.sections,
  jurisdiction = EXCLUDED.jurisdiction,
  updated_at = NOW();

-- =========================================
-- Verificar datos insertados
-- =========================================

SELECT
  type,
  language,
  country_code,
  jurisdiction,
  jsonb_array_length(sections) as num_sections,
  updated_at
FROM legal_content
ORDER BY type, language;
