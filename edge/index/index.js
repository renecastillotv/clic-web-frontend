import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { handleSingleProperty } from './single-property-handler.ts';
import { calculatePropertyAggregations, generateAdvancedStructuredData, buildEnhancedDescription } from './seo-utils.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
// Optimized data fetching functions
async function getCountryAndTags(supabase, tags, language) {
  // Get country with country tag in single query
  const { data: countryData } = await supabase.from('countries').select(`
      id, name, code, country_tag_id,
      tags!countries_country_tag_id_fkey(id, slug, slug_en, slug_fr, category, display_name, display_name_en, display_name_fr)
    `).eq('code', 'DOM').eq('active', true).single();
  // Get user tags in parallel if needed
  let validatedTags = [];
  if (tags.length > 0) {
    let slugField = 'slug';
    if (language === 'en') slugField = 'slug_en';
    if (language === 'fr') slugField = 'slug_fr';
    const { data: tagResults } = await supabase.from('tags').select('id, slug, slug_en, slug_fr, category, display_name, display_name_en, display_name_fr').in(slugField, tags).eq('active', true);
    for (const tag of tags){
      const foundTag = tagResults?.find((t)=>t[slugField] === tag);
      if (foundTag) {
        validatedTags.push({
          slug: tag,
          id: foundTag.id,
          ...foundTag
        });
      }
    }
  }
  return {
    country: countryData,
    countryTag: countryData?.tags,
    validatedTags
  };
}
serve(async (req)=>{
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);
    const requestUrl = new URL(req.url);
    const queryParams = requestUrl.searchParams;
    // Extract tracking parameters
    const trackingParams = new URLSearchParams();
    for (const [key, value] of queryParams.entries()){
      if (key.startsWith('utm_') || key === 'ref' || key.startsWith('fbclid') || key.startsWith('gclid')) {
        trackingParams.set(key, value);
      }
    }
    const trackingString = trackingParams.toString() ? `?${trackingParams.toString()}` : '';
    // Parse path
    const fullPath = requestUrl.pathname;
    const backendIndex = fullPath.indexOf('/backend/');
    if (backendIndex === -1) {
      throw new Error('Invalid path');
    }
    const pathAfterBackend = fullPath.substring(backendIndex + 9);
    const segments = pathAfterBackend.split('/').filter((segment)=>segment !== '');
    // Determine language and tags
    let language = 'es';
    let tags = [];
    if (segments.length > 0) {
      if (segments[0] === 'en' || segments[0] === 'fr') {
        language = segments[0];
        tags = segments.slice(1);
      } else {
        tags = segments;
      }
    }
    console.log('Language:', language, 'Tags:', tags);
    // Get country and tags
    const { country, countryTag, validatedTags } = await getCountryAndTags(supabase, tags, language);
    // Add country tag to validated tags
    if (countryTag) {
      const countrySlugField = language === 'en' ? 'slug_en' : language === 'fr' ? 'slug_fr' : 'slug';
      validatedTags.unshift({
        slug: countryTag[countrySlugField] || countryTag.slug,
        id: countryTag.id,
        ...countryTag
      });
    }
    // Check for special pages
    let isSpecialPage = false;
    let specialPageType = null;
    let customListTagInfo = null;
    if (validatedTags.length > 0) {
      const customListTagFound = validatedTags.find((tag)=>tag.category === 'custom-list');
      if (customListTagFound) {
        isSpecialPage = true;
        specialPageType = 'custom-list';
        customListTagInfo = customListTagFound;
      }
    }
    // Initialize variables
    let pageType = 'property-list';
    let property = null;
    let properties = [];
    let pagination = null;
    let relatedContent = [];
    let propertyCarousels = [];
    let hotItems = {
      properties: [],
      cities: [],
      sectors: [],
      agents: [],
      projects: [],
      custom: []
    };
    // Check if it's a single property
    if (tags.length > 0) {
      const fullSlug = tags.join('/');
      let propertySlugField = 'slug_url';
      if (language === 'en') propertySlugField = 'slug_en';
      if (language === 'fr') propertySlugField = 'slug_fr';
      const { data: propertyData } = await supabase.from('properties').select('id, private_name').eq(propertySlugField, fullSlug).single();
      if (propertyData) {
        pageType = 'single-property';
        property = propertyData;
      }
    }
    let userTagsDetails = null;
    let seoPages = null;
    // Process property-list with RPC function
    if (pageType === 'property-list') {
      const allTagIds = validatedTags.map((tag)=>tag.id).filter(Boolean);
      console.log('Looking for properties with tags:', allTagIds);
      if (allTagIds.length > 0) {
        const page = parseInt(requestUrl.searchParams.get('page') || '1');
        const limit = 32;
        // DEBUG: First test with debug function to see what's happening
        console.log('Testing with RPC function v08...');
        // PHASE 1: Get content metadata with RPC and other data in parallel
        const [rpcResult, userTagsResult, seoResult, hotItemsResult] = await Promise.all([
          // Use RPC function for content metadata (solo usa properties como content_type)
          supabase.rpc('get_all_content_by_tags_v08', {
            tag_ids: allTagIds,
            limit_per_type: limit
          }),
          // User tags details
          supabase.from('tags').select('id, name, category, display_name, display_name_en, display_name_fr, slug, slug_en, slug_fr').in('id', allTagIds),
          // SEO pages
          supabase.from('seo_pages').select('*, location_closure, tag_name').in('tag_id', allTagIds).eq('language', language),
          // Hot items (if country exists)
          countryTag?.id ? supabase.from('popular_items').select('*').eq('country_tag_id', countryTag.id).eq('active', true).order('priority') : Promise.resolve({
            data: []
          })
        ]);
        console.log('RPC result:', JSON.stringify(rpcResult, null, 2));
        const { data: rpcResults, error: rpcError } = rpcResult;
        userTagsDetails = userTagsResult.data;
        seoPages = seoResult.data;
        if (rpcError) {
          console.error('RPC Error:', rpcError);
        }
        console.log('RPC results:', rpcResults?.length);
        // Process properties from RPC results
        if (rpcResults && rpcResults.length > 0) {
          // Filter only property content_type results
          const propertyResults = rpcResults.filter((result)=>result.content_type === 'property');
          console.log('Property results from RPC:', propertyResults.length);
          if (propertyResults.length > 0) {
            // Get property IDs for batch fetch
            const propertyIds = propertyResults.map((result)=>result.content_id);
            // Fetch complete property data
            const { data: propertiesData, error: propertiesError } = await supabase.from('properties').select(`
                id, code, name, description, content_en, content_fr, 
                sale_price, sale_currency, rental_price, rental_currency, 
                temp_rental_price, temp_rental_currency, furnished_rental_price, furnished_rental_currency,
                bedrooms, bathrooms, built_area, is_project, main_image_url, gallery_images_url, 
                slug_url, slug_en, slug_fr, sector_id, city_id, category_id
              `).in('id', propertyIds).eq('property_status', 'Publicada').eq('availability', 1);
            if (propertiesError) {
              console.error('Properties fetch error:', propertiesError);
            }
            console.log('Properties from database:', propertiesData?.length);
            if (propertiesData && propertiesData.length > 0) {
              // Get unique IDs for batch lookups
              const sectorIds = [
                ...new Set(propertiesData.map((p)=>p.sector_id).filter(Boolean))
              ];
              const cityIds = [
                ...new Set(propertiesData.map((p)=>p.city_id).filter(Boolean))
              ];
              const categoryIds = [
                ...new Set(propertiesData.map((p)=>p.category_id).filter(Boolean))
              ];
              // Batch fetch names
              const [sectorsData, citiesData, categoriesData] = await Promise.all([
                sectorIds.length > 0 ? supabase.from('sectors').select('id, name').in('id', sectorIds) : Promise.resolve({
                  data: []
                }),
                cityIds.length > 0 ? supabase.from('cities').select('id, name').in('id', cityIds) : Promise.resolve({
                  data: []
                }),
                categoryIds.length > 0 ? supabase.from('property_categories').select('id, name').in('id', categoryIds) : Promise.resolve({
                  data: []
                })
              ]);
              // Create lookup maps
              const sectorsMap = new Map((sectorsData.data || []).map((s)=>[
                  s.id,
                  s.name
                ]));
              const citiesMap = new Map((citiesData.data || []).map((c)=>[
                  c.id,
                  c.name
                ]));
              const categoriesMap = new Map((categoriesData.data || []).map((cat)=>[
                  cat.id,
                  cat.name
                ]));
              // Create RPC results lookup for sorting by weight
              const rpcResultsMap = new Map(propertyResults.map((result)=>[
                  result.content_id,
                  result
                ]));
              // Sort properties by RPC weight and process
              const sortedPropertiesData = propertiesData.map((prop)=>({
                  ...prop,
                  rpc_weight: rpcResultsMap.get(prop.id)?.total_weight || 0,
                  rpc_matched_tags: rpcResultsMap.get(prop.id)?.matched_tags || 0
                })).sort((a, b)=>b.rpc_weight - a.rpc_weight || b.rpc_matched_tags - a.rpc_matched_tags);
              properties = sortedPropertiesData.map((propertyData)=>{
                // Process multilingual content
                let processedName = propertyData.name;
                let processedDescription = propertyData.description;
                if (language === 'en' && propertyData.content_en) {
                  try {
                    const contentEn = typeof propertyData.content_en === 'string' ? JSON.parse(propertyData.content_en) : propertyData.content_en;
                    processedName = contentEn.name || propertyData.name;
                    processedDescription = contentEn.description || propertyData.description;
                  } catch (e) {}
                } else if (language === 'fr' && propertyData.content_fr) {
                  try {
                    const contentFr = typeof propertyData.content_fr === 'string' ? JSON.parse(propertyData.content_fr) : propertyData.content_fr;
                    processedName = contentFr.name || propertyData.name;
                    processedDescription = contentFr.description || propertyData.description;
                  } catch (e) {}
                }
                // Build URLs
                let propertySlug = propertyData.slug_url;
                if (language === 'en' && propertyData.slug_en) propertySlug = propertyData.slug_en;
                if (language === 'fr' && propertyData.slug_fr) propertySlug = propertyData.slug_fr;
                let propertyUrl = propertySlug;
                if (language === 'en') propertyUrl = `en/${propertySlug}`;
                if (language === 'fr') propertyUrl = `fr/${propertySlug}`;
                return {
                  id: propertyData.id,
                  code: propertyData.code,
                  name: processedName,
                  description: processedDescription,
                  sale_price: propertyData.sale_price,
                  sale_currency: propertyData.sale_currency,
                  rental_price: propertyData.rental_price,
                  rental_currency: propertyData.rental_currency,
                  temp_rental_price: propertyData.temp_rental_price,
                  temp_rental_currency: propertyData.temp_rental_currency,
                  furnished_rental_price: propertyData.furnished_rental_price,
                  furnished_rental_currency: propertyData.furnished_rental_currency,
                  bedrooms: propertyData.bedrooms,
                  bathrooms: propertyData.bathrooms,
                  built_area: propertyData.built_area,
                  is_project: propertyData.is_project,
                  main_image_url: propertyData.main_image_url,
                  gallery_images_url: propertyData.gallery_images_url,
                  sector: sectorsMap.get(propertyData.sector_id) || null,
                  city: citiesMap.get(propertyData.city_id) || null,
                  category: categoriesMap.get(propertyData.category_id) || null,
                  slug_url: propertySlug,
                  url: `/${propertyUrl}${trackingString}`
                };
              });
              console.log('Properties processed:', properties.length);
            }
          }
          // Set pagination (simple since RPC doesn't provide total count)
          const totalCount = properties.length;
          const totalPages = 1; // RPC already limits results
          pagination = {
            page: 1,
            limit: limit,
            total_properties: totalCount,
            total_pages: totalPages,
            has_next_page: false,
            has_prev_page: false
          };
        } else {
          // No properties found
          properties = [];
          pagination = {
            page: 1,
            limit: 32,
            total_properties: 0,
            total_pages: 0,
            has_next_page: false,
            has_prev_page: false
          };
        }
        // Process hot items efficiently
        if (hotItemsResult.data && hotItemsResult.data.length > 0) {
          const processHotItemContent = (item)=>{
            let translatedContent = {
              title: item.title,
              subtitle: item.subtitle,
              url: item.url
            };
            if (language !== 'es') {
              const contentField = language === 'en' ? item.content_en : item.content_fr;
              if (contentField) {
                try {
                  const parsedContent = typeof contentField === 'string' ? JSON.parse(contentField) : contentField;
                  translatedContent = {
                    title: parsedContent.title || item.title,
                    subtitle: parsedContent.subtitle || item.subtitle,
                    url: parsedContent.url || item.url
                  };
                } catch (e) {}
              }
            }
            let processedUrl = translatedContent.url;
            if (processedUrl) {
              if (language === 'en') processedUrl = `en/${processedUrl}`;
              if (language === 'fr') processedUrl = `fr/${processedUrl}`;
              processedUrl = `/${processedUrl}${trackingString}`;
            }
            return {
              ...item,
              title: translatedContent.title,
              subtitle: translatedContent.subtitle,
              url: processedUrl
            };
          };
          const processedHotItems = hotItemsResult.data.map(processHotItemContent);
          hotItems = {
            properties: processedHotItems.filter((item)=>item.category === 'categoria').slice(0, 6),
            cities: processedHotItems.filter((item)=>item.category === 'ciudad').slice(0, 10),
            sectors: processedHotItems.filter((item)=>item.category === 'sector').slice(0, 8),
            agents: processedHotItems.filter((item)=>item.category === 'asesor').slice(0, 5),
            projects: processedHotItems.filter((item)=>item.category === 'proyecto').slice(0, 4),
            custom: processedHotItems.filter((item)=>item.category === 'custom').slice(0, 3)
          };
        }
        // PHASE 2: Get carousels and related content in parallel (if country exists)
        if (countryTag?.id) {
          const [carouselsResult, relatedContentResult] = await Promise.all([
            // Carousels
            getCarouselsOptimized(supabase, countryTag.id, userTagsDetails, tags, trackingString, language),
            // Related content  
            getRelatedContentOptimized(supabase, countryTag.id, allTagIds, language, trackingString)
          ]);
          propertyCarousels = carouselsResult;
          relatedContent = relatedContentResult;
        }
      } else {
        // No tags - empty pagination
        pagination = {
          page: parseInt(requestUrl.searchParams.get('page') || '1'),
          limit: 32,
          total_properties: 0,
          total_pages: 0,
          has_next_page: false,
          has_prev_page: false
        };
      }
    }
    // SEO content processing
    const seoContent = {
      market_insights: [],
      tips: [],
      investment_data: {},
      neighborhood_info: {}
    };
    if (seoPages && seoPages.length > 0) {
      const priorityOrder = [
        'sector',
        'ciudad',
        'categoria',
        'operacion'
      ];
      const sortedPages = seoPages.sort((a, b)=>{
        const aPriority = priorityOrder.indexOf(a.content_type);
        const bPriority = priorityOrder.indexOf(b.content_type);
        return aPriority - bPriority;
      });
      sortedPages.forEach((page)=>{
        if (page.market_insights) {
          seoContent.market_insights.push({
            ...page.market_insights,
            content_type: page.content_type,
            priority: priorityOrder.indexOf(page.content_type)
          });
        }
        if (page.tips) {
          seoContent.tips.push({
            ...page.tips,
            content_type: page.content_type
          });
        }
        if (page.investment_data) {
          const currentPriority = Object.keys(seoContent.investment_data).length > 0 ? seoContent.investment_data._priority || 999 : 999;
          const newPriority = priorityOrder.indexOf(page.content_type);
          if (newPriority < currentPriority) {
            seoContent.investment_data = {
              ...page.investment_data,
              _priority: newPriority,
              _source: page.content_type
            };
          }
        }
        if (page.neighborhood_info) {
          Object.assign(seoContent.neighborhood_info, page.neighborhood_info);
        }
      });
      if (seoContent.investment_data._priority !== undefined) {
        delete seoContent.investment_data._priority;
        delete seoContent.investment_data._source;
      }
    }
    // SEO building (simplified for performance)
    const buildSEOData = async ()=>{
      const breadcrumbs = [];
      const homeLabel = language === 'en' ? 'Home' : language === 'fr' ? 'Accueil' : 'Inicio';
      const baseHomeUrl = language === 'es' ? '/' : `/${language}/`;
      const homeUrl = trackingString ? `${baseHomeUrl}${trackingString}` : baseHomeUrl;
      breadcrumbs.push({
        name: homeLabel,
        url: homeUrl
      });
      if (userTagsDetails) {
        const filteredTags = userTagsDetails.filter((tag)=>tag.category !== 'pais' && tag.category !== 'custom-list');
        let cumulativeUrl = language === 'es' ? '' : `/${language}`;
        filteredTags.forEach((tag)=>{
          const tagSlug = language === 'en' && tag.slug_en ? tag.slug_en : language === 'fr' && tag.slug_fr ? tag.slug_fr : tag.slug;
          const tagDisplayName = language === 'en' && tag.display_name_en ? tag.display_name_en : language === 'fr' && tag.display_name_fr ? tag.display_name_fr : tag.display_name || tag.name;
          cumulativeUrl += `/${tagSlug}`;
          breadcrumbs.push({
            name: tagDisplayName,
            url: `${cumulativeUrl}${trackingString}`
          });
        });
      }
      // Quick SEO building
      const getUserDisplayName = (tagName, category)=>{
        const tag = userTagsDetails?.find((t)=>t.name === tagName && t.category === category);
        if (!tag) return tagName;
        if (language === 'en' && tag.display_name_en) return tag.display_name_en;
        if (language === 'fr' && tag.display_name_fr) return tag.display_name_fr;
        return tag.display_name || tagName;
      };
      const userCategoryTags = userTagsDetails?.filter((tag)=>tag.category === 'categoria').map((tag)=>tag.name) || [];
      const userOperationTags = userTagsDetails?.filter((tag)=>tag.category === 'operacion').map((tag)=>tag.name) || [];
      const userCityTags = userTagsDetails?.filter((tag)=>tag.category === 'ciudad').map((tag)=>tag.name) || [];
      const userSectorTags = userTagsDetails?.filter((tag)=>tag.category === 'sector').map((tag)=>tag.name) || [];
      // Fast title building
      let titleParts = [];
      const propertiesCount = pagination?.total_properties || 0;
      if (propertiesCount > 0) titleParts.push(propertiesCount.toString());
      if (userCategoryTags.length > 0) {
        const categoryDisplay = getUserDisplayName(userCategoryTags[0], 'categoria');
        let pluralCategory = categoryDisplay;
        if (!pluralCategory.toLowerCase().endsWith('s')) pluralCategory += 's';
        titleParts.push(pluralCategory);
      } else {
        const propertiesLabel = language === 'en' ? 'Properties' : language === 'fr' ? 'Propriétés' : 'Propiedades';
        titleParts.push(propertiesLabel);
      }
      if (userOperationTags.length > 0) {
        const operationDisplay = getUserDisplayName(userOperationTags[0], 'operacion');
        if (language === 'en') {
          titleParts.push(`to ${operationDisplay.toLowerCase()}`);
        } else if (language === 'fr') {
          titleParts.push(`pour ${operationDisplay.toLowerCase()}`);
        } else {
          titleParts.push(`para ${operationDisplay.toLowerCase()}`);
        }
      } else {
        const fallbackOperation = language === 'en' ? 'for sale and rent' : language === 'fr' ? 'à vendre et à louer' : 'a la venta y alquiler';
        titleParts.push(fallbackOperation);
      }
      // Get location from SEO pages
      let locationText = '';
      if (userSectorTags.length > 0) {
        const sectorTag = userTagsDetails?.find((tag)=>tag.category === 'sector');
        if (sectorTag?.id) {
          const sectorSeoPage = seoPages?.find((page)=>page.tag_id === sectorTag.id);
          if (sectorSeoPage?.location_closure) locationText = sectorSeoPage.location_closure;
        }
      }
      if (!locationText && userCityTags.length > 0) {
        const cityTag = userTagsDetails?.find((tag)=>tag.category === 'ciudad');
        if (cityTag?.id) {
          const citySeoPage = seoPages?.find((page)=>page.tag_id === cityTag.id);
          if (citySeoPage?.location_closure) locationText = citySeoPage.location_closure;
        }
      }
      if (!locationText && countryTag?.id) {
        const countrySeoPage = seoPages?.find((page)=>page.tag_id === countryTag.id);
        if (countrySeoPage?.location_closure) {
          locationText = countrySeoPage.location_closure;
        } else {
          locationText = language === 'en' ? 'in Dominican Republic' : language === 'fr' ? 'en République Dominicaine' : 'en República Dominicana';
        }
      }
      if (locationText) titleParts.push(locationText);
      titleParts.push('| CLIC Inmobiliaria');
      const title = titleParts.join(' ');
      // Simple description
      const description = `Encuentra las mejores propiedades disponibles. Ubicaciones premium, financiamiento disponible, asesoría inmobiliaria experta.`;
      // Build URLs
      let canonicalUrl = tags.join('/');
      if (language !== 'es') canonicalUrl = `${language}/${canonicalUrl}`;
      const hreflangUrls = {
        es: `https://clic.do/${tags.join('/')}`,
        en: `https://clic.do/en/${tags.join('/')}`,
        fr: `https://clic.do/fr/${tags.join('/')}`
      };
      // Generate structured data and enhanced fields
      const propertyAggregations = calculatePropertyAggregations(properties);
      const structuredData = generateAdvancedStructuredData({
        properties,
        breadcrumbs,
        relatedContent,
        pagination,
        propertyAggregations,
        tags: userTagsDetails,
        seoContent,
        language,
        canonicalUrl: `https://clic.do/${canonicalUrl}`,
        hreflangUrls
      });
      const enhancedDescription = buildEnhancedDescription({
        baseDescription: description,
        propertyAggregations,
        marketInsights: seoContent.market_insights,
        language
      });
      return {
        title,
        description: enhancedDescription,
        keywords: [],
        h1: title.replace(' | CLIC Inmobiliaria', ''),
        h2: language === 'en' ? 'The property you are looking for, just one CLICK away!' : language === 'fr' ? 'La propriété que vous cherchez, à un CLIC de distance !' : 'El inmueble que buscas, a un CLIC de distancia!',
        canonical_url: `/${canonicalUrl}`,
        breadcrumbs,
        coordinates: null,
        seo_content: seoContent,
        structured_data: structuredData,
        og: {
          title: title,
          description: description,
          url: `https://clic.do/${canonicalUrl}`,
          type: 'website',
          site_name: 'CLIC Inmobiliaria',
          locale: language === 'en' ? 'en_US' : language === 'fr' ? 'fr_FR' : 'es_DO',
          image: properties.length > 0 ? properties[0].main_image_url : 'https://clic.do/images/og-default.jpg'
        },
        twitter: {
          card: "summary_large_image",
          title: title,
          description: description,
          image: properties.length > 0 ? properties[0].main_image_url : 'https://clic.do/images/og-default.jpg',
          site: "@clicinmobiliaria"
        },
        hreflang: hreflangUrls,
        technical: {
          robots: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1
          },
          sitemap: {
            lastModified: new Date().toISOString(),
            changeFreq: "daily",
            priority: 0.6
          }
        },
        meta_tags: {
          robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
          author: 'René Castillo - CLIC Inmobiliaria',
          publisher: 'CLIC Inmobiliaria'
        },
        places_enrichment: null
      };
    };
    const seoData = await buildSEOData();
    // Build response
    const response = {
      country,
      language,
      tags: validatedTags,
      page_type: pageType,
      total_properties: pagination?.total_properties || 0,
      seo: seoData
    };
    if (isSpecialPage) {
      response.special_page = true;
      response.special_type = specialPageType;
      if (customListTagInfo) {
        response.custom_list_info = {
          id: customListTagInfo.id,
          slug: customListTagInfo.slug,
          display_name: language === 'en' && customListTagInfo.display_name_en ? customListTagInfo.display_name_en : language === 'fr' && customListTagInfo.display_name_fr ? customListTagInfo.display_name_fr : customListTagInfo.display_name
        };
      }
    }
    if (pageType === 'single-property') {
      const singlePropertyData = await handleSingleProperty({
        property: property,
        supabase,
        language,
        countryTag,
        validatedTags,
        trackingString,
        seoPages,
        userTagsDetails,
        hotItems
      });
      response.property = singlePropertyData.property;
      response.seo = singlePropertyData.seo;
    } else {
      response.properties = properties;
      response.related_content = relatedContent;
      response.carousels = propertyCarousels;
      response.hot_items = hotItems;
      if (pagination) {
        response.pagination = pagination;
      }
    }
    console.log('Response summary:', {
      properties: properties.length,
      carousels: propertyCarousels.length,
      related_content: relatedContent.length,
      hot_items_total: Object.values(hotItems).reduce((sum, arr)=>sum + arr.length, 0)
    });
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
// Carousel and related content helper functions
async function getCarouselsOptimized(supabase, countryTagId, userTagsDetails, tags, trackingString, language) {
  try {
    const { data: tagGroups } = await supabase.from('tag_groups').select(`
        id, slug, slug_en, slug_fr, name, description, icon, color, 
        seo_title, seo_description, content_en, content_fr, requirements,
        tag_id,
        tags!tag_groups_tag_id_fkey(
          id, slug, slug_en, slug_fr, name, category, 
          display_name, display_name_en, display_name_fr
        )
      `).eq('active', true).order('priority').limit(3);
    if (!tagGroups || tagGroups.length === 0) return [];
    const carouselPromises = tagGroups.map(async (group)=>{
      if (!group.tag_id || !group.tags) return null;
      const customListTag = group.tags;
      // Get properties for this carousel (simplified)
      const { data: customListProperties } = await supabase.from('content_tags').select('content_id').eq('content_type', 'property').eq('tag_id', customListTag.id).limit(3);
      if (!customListProperties || customListProperties.length === 0) return null;
      const propertyIds = customListProperties.map((cp)=>cp.content_id);
      const { data: carouselProperties } = await supabase.from('properties').select('id, code, name, sale_price, sale_currency, rental_price, rental_currency, bedrooms, bathrooms, built_area, is_project, main_image_url, slug_url, slug_en, slug_fr').in('id', propertyIds).eq('property_status', 'Publicada').eq('availability', 1).limit(3);
      if (!carouselProperties || carouselProperties.length === 0) return null;
      // Build carousel with minimal processing
      const propertiesWithUrls = carouselProperties.map((prop)=>{
        let propertySlug = prop.slug_url;
        if (language === 'en' && prop.slug_en) propertySlug = prop.slug_en;
        if (language === 'fr' && prop.slug_fr) propertySlug = prop.slug_fr;
        let propertyUrl = propertySlug;
        if (language === 'en') propertyUrl = `en/${propertySlug}`;
        if (language === 'fr') propertyUrl = `fr/${propertySlug}`;
        return {
          id: prop.id,
          code: prop.code,
          name: prop.name,
          sale_price: prop.sale_price,
          sale_currency: prop.sale_currency,
          rental_price: prop.rental_price,
          rental_currency: prop.rental_currency,
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
          built_area: prop.built_area,
          is_project: prop.is_project,
          main_image_url: prop.main_image_url,
          url: `/${propertyUrl}${trackingString}`
        };
      });
      return {
        group_id: group.id,
        title: group.seo_title || group.name,
        description: group.seo_description,
        icon: group.icon,
        color: group.color,
        carousel_url: `/${tags.join('/')}${trackingString}`,
        properties: propertiesWithUrls
      };
    });
    const carouselResults = await Promise.all(carouselPromises);
    return carouselResults.filter(Boolean);
  } catch (error) {
    console.error('Carousel error:', error);
    return [];
  }
}
async function getRelatedContentOptimized(supabase, countryTagId, allTagIds, language, trackingString) {
  try {
    const searchTagIds = [
      countryTagId,
      ...allTagIds.filter((id)=>id !== countryTagId)
    ];
    // Get content tags in one query
    const { data: contentTags } = await supabase.from('content_tags').select('content_id, content_type, tag_id').in('content_type', [
      'article',
      'video',
      'faq'
    ]).in('tag_id', searchTagIds).limit(50);
    if (!contentTags || contentTags.length === 0) return [];
    // Score content by relevance
    const contentScores = {};
    contentTags.forEach((ct)=>{
      const key = `${ct.content_type}-${ct.content_id}`;
      if (!contentScores[key]) {
        contentScores[key] = {
          content_type: ct.content_type,
          content_id: ct.content_id,
          score: 0,
          has_country: false
        };
      }
      contentScores[key].score++;
      if (ct.tag_id === countryTagId) {
        contentScores[key].has_country = true;
      }
    });
    // Get top content by type
    const topContent = Object.values(contentScores).filter((c)=>c.has_country).sort((a, b)=>b.score - a.score).slice(0, 12);
    if (topContent.length === 0) return [];
    // Group by type for parallel queries
    const articleIds = topContent.filter((c)=>c.content_type === 'article').map((c)=>c.content_id).slice(0, 4);
    const videoIds = topContent.filter((c)=>c.content_type === 'video').map((c)=>c.content_id).slice(0, 4);
    const faqIds = topContent.filter((c)=>c.content_type === 'faq').map((c)=>c.content_id).slice(0, 4);
    // Get content in parallel
    const contentPromises = [];
    if (articleIds.length > 0) {
      contentPromises.push(supabase.from('articles').select('id, title, excerpt, slug, slug_en, slug_fr, featured_image').in('id', articleIds).eq('status', 'published').then(({ data })=>data?.map((item)=>({
            ...item,
            content_type: 'article'
          })) || []));
    }
    if (videoIds.length > 0) {
      contentPromises.push(supabase.from('videos').select('id, title, description, video_slug, slug_en, slug_fr, thumbnail').in('id', videoIds).eq('status', 'published').then(({ data })=>data?.map((item)=>({
            ...item,
            content_type: 'video'
          })) || []));
    }
    if (faqIds.length > 0) {
      contentPromises.push(supabase.from('faqs').select('id, question, answer').in('id', faqIds).eq('status', 'published').then(({ data })=>data?.map((item)=>({
            ...item,
            content_type: 'faq'
          })) || []));
    }
    const contentResults = await Promise.all(contentPromises);
    const allContent = contentResults.flat();
    return allContent.map((item)=>{
      const result = {
        id: item.id,
        content_type: item.content_type
      };
      if (item.content_type === 'faq') {
        result.question = item.question;
        result.answer = item.answer;
      } else {
        result.title = item.title;
        if (item.content_type === 'article') {
          result.excerpt = item.excerpt;
          result.featured_image = item.featured_image;
          const slug = language === 'en' && item.slug_en ? item.slug_en : language === 'fr' && item.slug_fr ? item.slug_fr : item.slug;
          if (slug) {
            let url = slug;
            if (language === 'en') url = `en/${slug}`;
            if (language === 'fr') url = `fr/${slug}`;
            result.url = `/${url}${trackingString}`;
          }
        } else if (item.content_type === 'video') {
          result.description = item.description;
          result.thumbnail = item.thumbnail;
          const slug = language === 'en' && item.slug_en ? item.slug_en : language === 'fr' && item.slug_fr ? item.slug_fr : item.video_slug;
          if (slug) {
            let url = slug;
            if (language === 'en') url = `en/${slug}`;
            if (language === 'fr') url = `fr/${slug}`;
            result.url = `/${url}${trackingString}`;
          }
        }
      }
      return result;
    });
  } catch (error) {
    console.error('Related content error:', error);
    return [];
  }
}
