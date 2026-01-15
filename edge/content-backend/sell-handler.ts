// sell-handler.ts
export async function handleSell(params) {
  const { supabase, language, trackingString, baseData } = params;
  console.log('🏡 handleSell(start)');
  // Usamos el campo real_data del país en lugar de una constante fija
  const hideRealData = !baseData.country?.real_data;
  const currentCountryId = baseData.country?.id;
  const currentCountryCurrency = baseData.country?.currency || 'USD';
  const countryCode = baseData.country?.code || 'DOM'; // Para diferenciar DOM de otros países
  // Año en curso
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);
  const yearStartIso = yearStart.toISOString();
  // ============================================================================
  // 1) TASAS DE CAMBIO
  // ============================================================================
  console.log('💰 Fetching currencies...');
  const { data: currencies, error: currenciesError } = await supabase.from('currencies').select('code, symbol, usd_rate').eq('is_active', true);
  if (currenciesError) console.error('❌ currenciesError:', currenciesError);
  const exchangeRates = {};
  (currencies || []).forEach((c)=>{
    exchangeRates[c.code] = {
      rate: c.usd_rate,
      symbol: c.symbol
    };
  });
  const toUSD = (amount, currencyCode)=>{
    if (!amount) return 0;
    const code = currencyCode || 'USD';
    if (code === 'USD') return amount;
    const rate = exchangeRates[code]?.rate || 1;
    return amount / rate;
  };
  const formatCurrency = (amount, currencyCode = currentCountryCurrency)=>{
    const symbol = exchangeRates[currencyCode]?.symbol || '$';
    const formatted = new Intl.NumberFormat('es-419', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.round(amount));
    return `${symbol}${formatted}`;
  };
  // ============================================================================
  // 2) DEALS DEL AÑO (VENTA) CON JOINS
  // ============================================================================
  console.log('📊 Fetching YEAR deals with full joins...');
  const dealsSelect = `
    id,
    deal_number,
    closing_value,
    currency,
    won_date,
    property_name,
    property_category,
    property_city,
    property_sector,
    commission_percentage,
    deal_type_id,
    operation_type_id,
    closed_by_agent_id,
    country_id,
    is_cancelled,
    properties:property_id(
      id,
      created_at,
      is_project,
      bedrooms,
      bathrooms,
      built_area,
      category_id,
      project_typology_id,
      property_categories:category_id(name),
      project_typologies:project_typology_id(bedrooms, bathrooms, built_area)
    ),
    deal_types:deal_type_id(name),
    operation_types!inner(name, code),
    users!inner(
      id,
      first_name,
      last_name,
      slug,
      profile_photo_url,
      active,
      show_on_website,
      position,
      phone,
      email,
      years_experience,
      specialty_description,
      content_en,
      content_fr
    )
  `;
  const { data: yearDeals, error: dealsError, count: yearDealsCount } = await supabase.from('deals').select(dealsSelect, {
    count: 'exact'
  }).eq('country_id', currentCountryId).eq('is_cancelled', false).not('won_date', 'is', null).gte('won_date', yearStartIso) // este año
  .eq('operation_types.code', 1) // Venta
  .eq('users.active', true).eq('users.show_on_website', true);
  if (dealsError) {
    console.error('❌ Deals (year) error:', dealsError);
  } else {
    console.log('✅ yearDeals:', yearDeals?.length || 0, 'of', yearDealsCount);
  }
  const salesDeals = yearDeals || [];
  // ============================================================================
  // 3) STATS: categorías, habitaciones, ciudades, sectores, proyectos vs individuales
  // ============================================================================
  console.log('📈 Building market stats (year)...');
  const categoryStats = {};
  const bedroomStats = {};
  const cityStats = {};
  const sectorStats = {};
  salesDeals.forEach((deal)=>{
    // Categoría
    const category = deal.property_category || deal.properties?.property_categories?.name || 'Otro';
    categoryStats[category] ||= {
      count: 0,
      volumeUSD: 0
    };
    categoryStats[category].count += 1;
    categoryStats[category].volumeUSD += toUSD(deal.closing_value, deal.currency);
    // Habitaciones
    let bedrooms = null;
    if (deal.properties?.is_project && deal.properties?.project_typologies?.bedrooms) {
      bedrooms = deal.properties.project_typologies.bedrooms;
    } else if (deal.properties?.bedrooms) {
      bedrooms = deal.properties.bedrooms;
    }
    if (bedrooms) {
      const key = String(bedrooms);
      bedroomStats[key] = (bedroomStats[key] || 0) + 1;
    }
    // Ciudad
    const city = deal.property_city || 'Santo Domingo';
    cityStats[city] = (cityStats[city] || 0) + 1;
    // Sector
    if (deal.property_sector) {
      sectorStats[deal.property_sector] = (sectorStats[deal.property_sector] || 0) + 1;
    }
  });
  // ============================================================================
  // 4) TOP AGENTS (por número de ventas del año)
  // ============================================================================
  console.log('👥 Computing top agents (year)...');
  const agentDealsCount = {};
  const agentDealsVolumeUSD = {};
  const agentInfo = {};
  salesDeals.forEach((deal)=>{
    const agentId = deal.closed_by_agent_id;
    const agent = deal.users;
    if (!agentId || !agent) return;
    if (!(agent.active && agent.show_on_website)) return;
    agentDealsCount[agentId] = (agentDealsCount[agentId] || 0) + 1;
    agentDealsVolumeUSD[agentId] = (agentDealsVolumeUSD[agentId] || 0) + toUSD(deal.closing_value, deal.currency);
    if (!agentInfo[agentId]) {
      // Extraer specialty_description de content_en o content_fr según idioma
      let specialtyDesc = agent.specialty_description || "";
      try {
        if (language === 'en' && agent.content_en) {
          const contentEn = JSON.parse(agent.content_en);
          if (contentEn.specialty_description) {
            specialtyDesc = contentEn.specialty_description;
          }
        } else if (language === 'fr' && agent.content_fr) {
          const contentFr = JSON.parse(agent.content_fr);
          if (contentFr.specialty_description) {
            specialtyDesc = contentFr.specialty_description;
          }
        }
      } catch (err) {
        console.error('❌ Error parsing agent content:', err);
      }
      console.log(`DEBUG - Agent ${agent.first_name} ${agent.last_name}:`, {
        specialty_description: agent.specialty_description,
        content_en: agent.content_en ? 'present' : 'missing',
        content_fr: agent.content_fr ? 'present' : 'missing',
        final_specialty: specialtyDesc
      });
      agentInfo[agentId] = {
        id: agent.id,
        first_name: agent.first_name,
        last_name: agent.last_name,
        slug: agent.slug,
        profile_photo_url: agent.profile_photo_url,
        position: agent.position,
        phone: agent.phone,
        email: agent.email,
        years_experience: agent.years_experience,
        specialty_description: specialtyDesc
      };
    }
  });
  // Generar números ficticios pero mantener agentes reales
  const topAgents = Object.entries(agentDealsCount).sort(([, a], [, b])=>b - a).slice(0, 6).map(([agentId, count], index)=>{
    const a = agentInfo[agentId];
    if (!a) return null;

    // Si hideRealData, generar números ficticios (más altos, manteniendo el orden)
    let fakeSales, fakeVolume;
    if (hideRealData) {
      // El primero (líder) tiene más ventas, luego va bajando
      // Rango: 80-120 ventas para el líder, luego 60-80, 40-60, 30-40, etc.
      const baseRanges = [
        { min: 80, max: 120 },   // Líder
        { min: 60, max: 80 },    // Segundo
        { min: 40, max: 60 },    // Tercero
        { min: 30, max: 40 },    // Cuarto
        { min: 20, max: 30 },    // Quinto
        { min: 15, max: 25 }     // Sexto
      ];
      const range = baseRanges[index] || { min: 10, max: 20 };
      fakeSales = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;

      // Volumen proporcional: entre $10M-$25M USD para el líder
      const volumeMultiplier = fakeSales * (150000 + Math.random() * 100000); // $150K-$250K por venta
      fakeVolume = volumeMultiplier;
    }

    return {
      id: a.id,
      name: `${a.first_name || ''} ${a.last_name || ''}`.trim(),
      slug: a.slug,
      avatar: a.profile_photo_url || '/images/team/default-advisor.jpg',
      position: a.position || (language === 'en' ? 'Real Estate Advisor' : language === 'fr' ? 'Conseiller Immobilier' : 'Asesor Inmobiliario'),
      phone: a.phone,
      email: a.email,
      totalSales: hideRealData ? fakeSales : count,
      totalVolume: hideRealData ? fakeVolume : (agentDealsVolumeUSD[agentId] || 0),
      yearsExperience: a.years_experience || 1,
      specialties: [
        'ventas'
      ],
      specialty_description: a.specialty_description || '',
      url: buildAdvisorUrl(a.slug, language, trackingString)
    };
  }).filter(Boolean);

  const topAgentsModified = topAgents;
  // ============================================================================
  // 5) MÉTRICAS FINALES (año)
  // ============================================================================
  const volumesByCurrency = {};
  let totalVolumeUSD = 0;
  salesDeals.forEach((deal)=>{
    const currency = deal.currency || 'USD';
    volumesByCurrency[currency] ||= {
      count: 0,
      total: 0
    };
    volumesByCurrency[currency].count += 1;
    volumesByCurrency[currency].total += deal.closing_value;
    totalVolumeUSD += toUSD(deal.closing_value, deal.currency);
  });
  let marketStats = {};
  if (hideRealData) {
    // Datos genéricos cuando hideRealData es true
    marketStats = {
      totalVolumeUSD: 250000000,
      volumeLocal: 500000000,
      volumeUSD: 250000000,
      averagePriceUSD: 150000,
      averageDaysOnMarket: 30,
      totalSalesRaw: 0,
      totalSales: language === 'en' ? "hundreds" : language === 'fr' ? "centaines" : "cientos",
      topCategory: 'Apartamento',
      topCategoryCount: 0,
      topBedrooms: '3',
      topCity: countryCode === 'DOM' ? 'Santo Domingo' : language === 'en' ? 'Main City' : language === 'fr' ? 'Ville Principale' : 'Ciudad Principal',
      topSector: countryCode === 'DOM' ? 'Piantini' : language === 'en' ? 'Main Area' : language === 'fr' ? 'Secteur Principal' : 'Sector Principal',
      yearOverYearGrowth: 12.5
    };
  } else {
    const topCategory = Object.entries(categoryStats).sort(([_k1, a], [_k2, b])=>b.count - a.count)[0];
    const topBedrooms = Object.entries(bedroomStats).sort(([_k1, a], [_k2, b])=>b - a)[0];
    const topCities1 = Object.entries(cityStats).sort(([_k1, a], [_k2, b])=>b - a).slice(0, 5);
    const topSectors1 = Object.entries(sectorStats).sort(([_k1, a], [_k2, b])=>b - a).slice(0, 5);
    marketStats = {
      totalVolumeUSD,
      volumeLocal: volumesByCurrency[currentCountryCurrency]?.total || 0,
      volumeUSD: volumesByCurrency['USD']?.total || 0,
      averagePriceUSD: salesDeals.length > 0 ? Math.round(totalVolumeUSD / salesDeals.length) : 150000,
      averageDaysOnMarket: 45,
      totalSalesRaw: salesDeals.length,
      totalSales: salesDeals.length,
      topCategory: topCategory?.[0] || 'Apartamento',
      topCategoryCount: topCategory?.[1]?.count || 0,
      topBedrooms: topBedrooms?.[0] || '2',
      topCity: topCities1[0]?.[0] || 'Santo Domingo',
      topSector: topSectors1[0]?.[0] || 'Piantini',
      yearOverYearGrowth: 5.2
    };
  }
  // Desglose proyectos vs individuales (año)
  const projectsCount = salesDeals.filter((d)=>d.properties?.is_project).length;
  const individualCount = salesDeals.length - projectsCount;
  // ============================================================================
  // 6) TESTIMONIOS (priorizar vendedores/desarrolladores; fallback compradores)
  // ============================================================================
  console.log('💬 Fetching testimonials (priority sellers/devs)...');
  const fetchTestimonials = async (categories, limit)=>{
    return await supabase.from('testimonials').select('*').eq('status', 'published').in('category', categories).order('rating', {
      ascending: false
    }).limit(limit);
  };
  let testimonials = [];
  let { data: t1, error: t1err } = await fetchTestimonials([
    'vendedores',
    'desarrolladores'
  ], 6);
  if (t1err) console.error('❌ testimonials priority error:', t1err);
  if (t1?.length) testimonials = t1;
  if (testimonials.length < 6) {
    const remaining = 6 - testimonials.length;
    const { data: t2, error: t2err } = await fetchTestimonials([
      'compradores'
    ], remaining);
    if (t2err) console.error('❌ testimonials fallback error:', t2err);
    if (t2?.length) testimonials = [
      ...testimonials,
      ...t2
    ];
  }
  // ============================================================================
  // 7) SUCCESS STORIES: últimos 6 del año
  // ============================================================================
  const successStories = [
    ...salesDeals
  ].sort((a, b)=>new Date(b.won_date).getTime() - new Date(a.won_date).getTime()).slice(0, 6).map((deal)=>({
      id: deal.id,
      propertyName: deal.property_name || 'Propiedad',
      location: `${deal.property_sector || ''} ${deal.property_city || ''}`.trim(),
      price: formatCurrency(deal.closing_value, deal.currency),
      soldDate: deal.won_date
    }));
  // Servicios diferenciados según el país y el idioma
  const getServiceTitles = ()=>{
    if (language === 'en') {
      return {
        photoTitle: 'Professional Photography and Video',
        photoDesc: 'High-quality photography, promotional videos and 360° virtual tours',
        pricingTitle: 'Market Analysis and Pricing Strategy',
        pricingDesc: 'Expert evaluation of the real market value of your property',
        marketingTitle: countryCode === 'DOM' ? 'Digital Platform Marketing' : 'Multi-Platform Marketing',
        marketingDesc: countryCode === 'DOM' ? 'Featured presence on YouTube, social networks and real estate platforms' : 'Promotion of your property on the main real estate platforms',
        legalTitle: 'Complete Legal Support',
        legalDesc: 'Specialized legal advice throughout the sales process'
      };
    } else if (language === 'fr') {
      return {
        photoTitle: 'Photographie et Vidéo Professionnelles',
        photoDesc: 'Photographie de haute qualité, vidéos promotionnelles et visites virtuelles 360°',
        pricingTitle: 'Analyse de Marché et Stratégie de Prix',
        pricingDesc: 'Évaluation experte de la valeur réelle de marché de votre propriété',
        marketingTitle: countryCode === 'DOM' ? 'Marketing sur Plateformes Digitales' : 'Marketing Multi-Plateforme',
        marketingDesc: countryCode === 'DOM' ? 'Présence remarquée sur YouTube, réseaux sociaux et plateformes immobilières' : 'Promotion de votre propriété sur les principales plateformes immobilières',
        legalTitle: 'Support Juridique Complet',
        legalDesc: 'Conseil juridique spécialisé tout au long du processus de vente'
      };
    } else {
      // Español por defecto
      return {
        photoTitle: 'Fotografía y Video Profesional',
        photoDesc: 'Fotografía de alta calidad, videos promocionales y tours virtuales 360°',
        pricingTitle: 'Tasación y Estrategia de Precio',
        pricingDesc: 'Evaluación experta del valor real de mercado de su propiedad',
        marketingTitle: countryCode === 'DOM' ? 'Marketing en Plataformas Digitales' : 'Marketing Multi-Plataforma',
        marketingDesc: countryCode === 'DOM' ? 'Presencia destacada en YouTube, redes sociales y plataformas inmobiliarias' : 'Promoción de su propiedad en las principales plataformas inmobiliarias',
        legalTitle: 'Soporte Legal Completo',
        legalDesc: 'Asesoría legal especializada durante todo el proceso de venta'
      };
    }
  };
  const serviceTitles = getServiceTitles();
  let services = [];
  if (countryCode === 'DOM') {
    // Servicios específicos para República Dominicana con René Castillo
    services = [
      {
        title: serviceTitles.photoTitle,
        description: serviceTitles.photoDesc,
        icon: 'camera',
        included: true,
        features: language === 'en' ? [
          'Professional HD photography',
          'Promotional video',
          '360° virtual tour',
          'Drone photography',
          'Professional editing'
        ] : language === 'fr' ? [
          'Photographie HD professionnelle',
          'Vidéo promotionnelle',
          'Visite virtuelle 360°',
          'Photographie par drone',
          'Édition professionnelle'
        ] : [
          'Fotografía profesional HD',
          'Video promocional',
          'Tour virtual 360°',
          'Fotografía con dron',
          'Edición profesional'
        ]
      },
      {
        title: serviceTitles.pricingTitle,
        description: serviceTitles.pricingDesc,
        icon: 'dollar-sign',
        included: true,
        features: language === 'en' ? [
          'Comparative market analysis',
          'Professional valuation',
          'Optimal pricing strategy',
          'Personalized advice'
        ] : language === 'fr' ? [
          'Analyse comparative du marché',
          'Évaluation professionnelle',
          'Stratégie de prix optimale',
          'Conseil personnalisé'
        ] : [
          'Análisis comparativo de mercado',
          'Valoración profesional',
          'Estrategia de precio óptimo',
          'Asesoría personalizada'
        ]
      },
      {
        title: serviceTitles.marketingTitle,
        description: serviceTitles.marketingDesc,
        icon: 'globe',
        included: true,
        features: language === 'en' ? [
          'Promotion on YouTube channel with 200K+ subscribers',
          'Social media campaigns',
          'Endorsement from René Castillo as a public figure with 600K+ followers',
          '20+ real estate portals'
        ] : language === 'fr' ? [
          'Promotion sur chaîne YouTube avec 200K+ abonnés',
          'Campagnes sur réseaux sociaux',
          'Soutien de René Castillo comme figure publique avec 600K+ followers',
          '20+ portails immobiliers'
        ] : [
          'Promoción en canal de YouTube con 200K+ suscriptores',
          'Campañas en redes sociales',
          'Respaldo de René Castillo como figura pública con 600K+ seguidores',
          '20+ portales inmobiliarios'
        ]
      },
      {
        title: serviceTitles.legalTitle,
        description: serviceTitles.legalDesc,
        icon: 'shield',
        included: true,
        features: language === 'en' ? [
          'Documentation review',
          'Contract preparation',
          'Advisory on procedures',
          'Closing support'
        ] : language === 'fr' ? [
          'Examen de la documentation',
          'Préparation des contrats',
          'Conseil sur les procédures',
          'Accompagnement à la clôture'
        ] : [
          'Revisión de documentación',
          'Elaboración de contratos',
          'Asesoría en trámites',
          'Acompañamiento en cierre'
        ]
      }
    ];
  } else {
    // Servicios genéricos para otros países
    services = [
      {
        title: serviceTitles.photoTitle,
        description: serviceTitles.photoDesc,
        icon: 'camera',
        included: true,
        features: language === 'en' ? [
          'Professional photography',
          '360° virtual tour',
          'Professional staging consultation'
        ] : language === 'fr' ? [
          'Photographie professionnelle',
          'Visite virtuelle 360°',
          'Consultation de mise en scène professionnelle'
        ] : [
          'Fotografía profesional',
          'Tour virtual 360°',
          'Consulta de staging profesional'
        ]
      },
      {
        title: serviceTitles.pricingTitle,
        description: serviceTitles.pricingDesc,
        icon: 'dollar-sign',
        included: true,
        features: language === 'en' ? [
          'Comparative market analysis',
          'Professional valuation',
          'Optimal pricing strategy'
        ] : language === 'fr' ? [
          'Analyse comparative du marché',
          'Évaluation professionnelle',
          'Stratégie de prix optimale'
        ] : [
          'Análisis comparativo de mercado',
          'Valoración profesional',
          'Estrategia de precio óptimo'
        ]
      },
      {
        title: serviceTitles.marketingTitle,
        description: serviceTitles.marketingDesc,
        icon: 'globe',
        included: true,
        features: language === 'en' ? [
          'Presence on real estate portals',
          'Social media promotion',
          'Targeted digital marketing'
        ] : language === 'fr' ? [
          'Présence sur les portails immobiliers',
          'Promotion sur réseaux sociaux',
          'Marketing digital ciblé'
        ] : [
          'Presencia en portales inmobiliarios',
          'Promoción en redes sociales',
          'Marketing digital dirigido'
        ]
      },
      {
        title: serviceTitles.legalTitle,
        description: serviceTitles.legalDesc,
        icon: 'shield',
        included: true,
        features: language === 'en' ? [
          'Documentation review',
          'Contract preparation',
          'Closing support'
        ] : language === 'fr' ? [
          'Examen de la documentation',
          'Préparation des contrats',
          'Accompagnement à la clôture'
        ] : [
          'Revisión de documentación',
          'Elaboración de contratos',
          'Acompañamiento en cierre'
        ]
      }
    ];
  }
  // Título de la sección de agentes según idioma
  const getTopAgentsTitle = ()=>{
    const currentYear = new Date().getFullYear();
    if (language === 'en') {
      return `Leading Sales Agents ${currentYear}`;
    } else if (language === 'fr') {
      return `Agents de Vente Leaders ${currentYear}`;
    } else {
      return `Agentes Líderes en Ventas ${currentYear}`;
    }
  };
  // ============================================================================
  // 8) RESPONSE
  // ============================================================================
  const response = {
    country: baseData.country,
    countryTag: baseData.country?.tags,
    globalConfig: baseData.globalConfig,
    hotItems: baseData.hotItems,
    language,
    trackingString,
    domainInfo: params.domainInfo,
    type: 'sell',
    pageType: 'sell',
    seo: {
      title: language === 'en' ? `Sell Your Property Fast | ${marketStats.averageDaysOnMarket} Days Average | CLIC` : language === 'fr' ? `Vendez Votre Propriété Rapidement | ${marketStats.averageDaysOnMarket} Jours en Moyenne | CLIC` : `Vende Tu Propiedad Rápido | ${marketStats.averageDaysOnMarket} Días Promedio | CLIC`,
      description: language === 'en' ? `Expert agents with ${marketStats.totalSales} successful sales this year. Professional service in ${marketStats.topCity}.` : language === 'fr' ? `Agents experts avec ${marketStats.totalSales} ventes réussies cette année. Service professionnel à ${marketStats.topCity}.` : `Agentes expertos con ${marketStats.totalSales} ventas exitosas este año. Servicio profesional en ${marketStats.topCity}.`,
      h1: language === 'en' ? 'Sell Your Property With The Experts' : language === 'fr' ? 'Vendez Votre Propriété Avec Les Experts' : 'Vende Tu Propiedad Con Los Expertos',
      canonical_url: language === 'es' ? '/vender' : `/${language}/sell`,
      breadcrumbs: [
        {
          name: language === 'en' ? 'Home' : language === 'fr' ? 'Accueil' : 'Inicio',
          url: '/'
        },
        {
          name: language === 'en' ? 'Sell' : language === 'fr' ? 'Vendre' : 'Vender',
          url: language === 'es' ? '/vender' : `/${language}/sell`
        }
      ],
      hreflang: baseData?.seo?.hreflang,
      structured_data: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: language === 'en' ? `Sell Your Property Fast | ${marketStats.averageDaysOnMarket} Days Average | CLIC` : language === 'fr' ? `Vendez Votre Propriété Rapidement | ${marketStats.averageDaysOnMarket} Jours en Moyenne | CLIC` : `Vende Tu Propiedad Rápido | ${marketStats.averageDaysOnMarket} Días Promedio | CLIC`,
        description: language === 'en' ? `Expert agents with ${marketStats.totalSales} successful sales this year. Professional service in ${marketStats.topCity}.` : language === 'fr' ? `Agents experts avec ${marketStats.totalSales} ventes réussies cette année. Service professionnel à ${marketStats.topCity}.` : `Agentes expertos con ${marketStats.totalSales} ventas exitosas este año. Servicio profesional en ${marketStats.topCity}.`
      },
      open_graph: baseData?.seo?.open_graph,
      twitter_card: baseData?.seo?.twitter_card,
      keywords: baseData?.seo?.keywords,
      additional_meta_tags: baseData?.seo?.additional_meta_tags,
      meta_tags: baseData?.seo?.meta_tags
    },
    marketHighlights: {
      totalVolume: formatCurrency(marketStats.totalVolumeUSD, 'USD'),
      volumeBreakdown: Object.entries(volumesByCurrency || {}).map(([currency, data])=>({
          currency,
          total: formatCurrency(data.total, currency),
          count: data.count
        })),
      averagePrice: formatCurrency(marketStats.averagePriceUSD, 'USD'),
      daysOnMarket: marketStats.averageDaysOnMarket,
      totalSales: marketStats.totalSales,
      topCategory: marketStats.topCategory,
      topBedrooms: marketStats.topBedrooms,
      topLocation: `${marketStats.topCity} - ${marketStats.topSector}`,
      projectsShare: hideRealData ? language === 'en' ? "Over 60%" : language === 'fr' ? "Plus de 60%" : "Más del 60%" : salesDeals.length > 0 ? `${Math.round(projectsCount / salesDeals.length * 100)}%` : '0%',
      yearTrend: `+${marketStats.yearOverYearGrowth}%`
    },
    marketAnalysis: hideRealData ? {
      categories: {},
      bedrooms: {},
      topCities: [],
      topSectors: [],
      projectsBreakdown: {
        projects: 0,
        individual: 0
      }
    } : {
      categories: categoryStats,
      bedrooms: bedroomStats,
      topCities: Object.entries(cityStats).sort(([_k1, a], [_k2, b])=>b - a).slice(0, 5),
      topSectors: Object.entries(sectorStats).sort(([_k1, a], [_k2, b])=>b - a).slice(0, 5),
      projectsBreakdown: {
        projects: projectsCount,
        individual: individualCount
      }
    },
    services,
    // Eliminamos la sección process
    topAgentsTitle: getTopAgentsTitle(),
    topAgents: topAgentsModified,
    testimonials: (testimonials || []).map((t)=>({
        id: t.id,
        title: t.title,
        excerpt: t.excerpt || (t.full_testimonial ? t.full_testimonial.substring(0, 150) + '...' : language === 'en' ? 'Excellent experience with CLIC Real Estate' : language === 'fr' ? 'Excellente expérience avec CLIC Immobilier' : 'Excelente experiencia con CLIC Inmobiliaria'),
        rating: t.rating || 5,
        clientName: hideRealData ? language === 'en' ? 'Satisfied Client' : language === 'fr' ? 'Client Satisfait' : 'Cliente Satisfecho' : t.client_name,
        clientAvatar: t.client_avatar,
        clientProfession: t.client_profession,
        location: t.transaction_location,
        category: t.category
      })),
    successStories,
    // Eliminamos la sección guarantees
    contactInfo: {
      phone: baseData.globalConfig?.contact?.phone,
      whatsapp: baseData.globalConfig?.contact?.whatsapp,
      email: baseData.globalConfig?.contact?.email
    }
  };
  console.log('🎯 handleSell(done):', {
    salesThisYear: hideRealData ? "hidden" : response.marketHighlights.totalSales,
    topAgents: response.topAgents?.length || 0,
    countryCode,
    language,
    averagePrice: marketStats.averagePriceUSD
  });
  return response;
}
// Helper
function buildAdvisorUrl(slug, language, trackingString) {
  if (!slug) return null;
  const basePath = language === 'es' ? 'asesores' : language === 'en' ? 'advisors' : 'conseillers';
  const langPrefix = language === 'es' ? '' : `${language}/`;
  return `/${langPrefix}${basePath}/${slug}${trackingString}`;
}
