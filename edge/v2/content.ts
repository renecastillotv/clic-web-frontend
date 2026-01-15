// 📁 supabase/functions/unified-property-search/content.ts
import { formatDuration } from './utils.ts';
export class ContentService {
  supabase;
  constructor(supabase){
    this.supabase = supabase;
  }
  async getRelatedContent(tagIds, countryTagId, limitPerType = 10) {
    console.log('🔍 === CONTENIDO CON DOS LLAMADAS SIMPLES ===');
    if (!countryTagId) {
      console.log('⚠️ No hay país, búsqueda normal');
      return this.getEmptyResult();
    }
    try {
      // ✅ LLAMADA 1: PAÍS + OTROS TAGS (alta relevancia)
      console.log('🎯 LLAMADA 1: País + otros tags');
      let organizedTagIds = [
        ...tagIds
      ];
      if (!organizedTagIds.includes(countryTagId)) {
        organizedTagIds = [
          countryTagId,
          ...tagIds
        ];
      } else {
        // Reorganizar para poner país primero
        organizedTagIds = organizedTagIds.filter((id)=>id !== countryTagId);
        organizedTagIds = [
          countryTagId,
          ...organizedTagIds
        ];
      }
      const { data: specificResults } = await this.supabase.rpc('get_all_content_by_tags', {
        tag_ids: organizedTagIds,
        limit_per_type: limitPerType
      });
      console.log('✅ Específicos:', specificResults?.length || 0);
      // ✅ LLAMADA 2: SOLO PAÍS (para rellenar)
      console.log('🔄 LLAMADA 2: Solo país para rellenar');
      const { data: fillResults } = await this.supabase.rpc('get_all_content_by_tags', {
        tag_ids: [
          countryTagId
        ],
        limit_per_type: limitPerType * 2 // Más cantidad para opciones
      });
      console.log('✅ Relleno:', fillResults?.length || 0);
      // ✅ COMBINAR RESULTADOS SIN DUPLICADOS
      const combinedResults = this.combineSimple(specificResults || [], fillResults || [], limitPerType);
      console.log('🔀 Combinados:', combinedResults.length);
      // ✅ PROCESAR CONTENIDO (lógica existente)
      return await this.processResults(combinedResults);
    } catch (error) {
      console.error('❌ Error:', error);
      return this.getEmptyResult();
    }
  }
  async getDefaultRelatedContent(countryTagId = null) {
    try {
      // ✅ SIEMPRE intentar con país primero
      if (countryTagId) {
        console.log('🌍 Intentando obtener contenido por defecto CON PAÍS:', countryTagId);
        const countryContent = await this.getRelatedContent([], countryTagId, 20); // Más contenido
        // ✅ Criterio más permisivo pero aún del mismo país
        const hasMinimumContent = countryContent.articles.length >= 1 || countryContent.videos.length >= 1 || countryContent.faqs.length >= 2 || countryContent.testimonials.length >= 1;
        if (hasMinimumContent) {
          console.log('✅ Contenido del país encontrado para default');
          return {
            ...countryContent,
            content_source: 'country_default'
          };
        }
        console.log('⚠️ Contenido del país insuficiente, intentando con menos restricciones...');
        // ✅ Segundo intento: buscar contenido del país directamente en las tablas
        const [articles, videos, faqs, testimonials] = await Promise.all([
          this.getContentByCountryTag('articles', countryTagId, 5),
          this.getContentByCountryTag('videos', countryTagId, 4),
          this.getContentByCountryTag('faqs', countryTagId, 6),
          this.getContentByCountryTag('testimonials', countryTagId, 3)
        ]);
        const hasAnyCountryContent = articles.length > 0 || videos.length > 0 || faqs.length > 0 || testimonials.length > 0;
        if (hasAnyCountryContent) {
          console.log('✅ Contenido directo del país encontrado');
          return {
            articles,
            videos,
            testimonials,
            faqs,
            seo_content: [],
            countryInjected: true
          };
        }
      }
      // ❌ ADVERTENCIA CLARA cuando usa contenido global
      console.warn('⚠️ NO SE ENCONTRÓ CONTENIDO DEL PAÍS - Usando contenido global como último recurso');
      // Mantener el fallback actual pero con warning claro
      const [articles, videos, faqs, testimonials] = await Promise.all([
        this.supabase.from('articles').select(`
          id, title, slug, excerpt, content, featured_image,
          published_at, created_at, updated_at,
          meta_title, meta_description, read_time,
          views, featured, category, author_id,
          users!articles_author_id_fkey(
            first_name, last_name, profile_photo_url
          )
        `).eq('status', 'published').order('published_at', {
          ascending: false
        }).limit(5),
        this.supabase.from('videos').select('*').eq('status', 'published').order('published_at', {
          ascending: false
        }).limit(4),
        this.supabase.from('faqs').select('*').eq('status', 'published').order('sort_order').limit(6),
        this.supabase.from('testimonials').select('*').eq('status', 'published').order('published_at', {
          ascending: false
        }).limit(3)
      ]);
      return {
        articles: this.processArticles(articles.data || []),
        videos: videos.data || [],
        testimonials: testimonials.data || [],
        faqs: faqs.data || [],
        seo_content: [],
        countryInjected: false
      };
    } catch (error) {
      console.error('❌ Error obteniendo contenido por defecto:', error);
      return this.getEmptyResult();
    }
  }
  async getContentByCountryTag(contentType, countryTagId, limit) {
    try {
      const { data: contentTags } = await this.supabase.from('content_tags').select('content_id').eq('content_type', contentType).eq('tag_id', countryTagId);
      if (!contentTags || contentTags.length === 0) return [];
      const contentIds = contentTags.map((ct)=>ct.content_id);
      let query;
      switch(contentType){
        case 'articles':
          query = this.supabase.from('articles').select(`
            id, title, slug, excerpt, content, featured_image,
            published_at, created_at, updated_at,
            meta_title, meta_description, read_time,
            views, featured, category, author_id,
            users!articles_author_id_fkey(
              first_name, last_name, profile_photo_url
            )
          `);
          break;
        case 'videos':
          query = this.supabase.from('videos').select('*');
          break;
        case 'faqs':
          query = this.supabase.from('faqs').select('*');
          break;
        case 'testimonials':
          query = this.supabase.from('testimonials').select('*');
          break;
        default:
          return [];
      }
      const { data } = await query.in('id', contentIds).eq('status', 'published').limit(limit);
      return data || [];
    } catch (error) {
      console.error(`❌ Error obteniendo ${contentType} por país:`, error);
      return [];
    }
  }
  combineSimple(specificResults, fillResults, limitPerType) {
    console.log('🔀 Combinando resultados simples');
    const usedIds = new Set();
    const final = [];
    // Agrupar por tipo
    const specificByType = this.groupByType(specificResults);
    const fillByType = this.groupByType(fillResults);
    [
      'article',
      'video',
      'testimonial',
      'faq',
      'seo_content'
    ].forEach((type)=>{
      const specific = specificByType[type] || [];
      const fill = fillByType[type] || [];
      let count = 0;
      // Primero: específicos
      specific.forEach((item)=>{
        if (!usedIds.has(item.content_id) && count < limitPerType) {
          final.push({
            ...item,
            priority: 'specific'
          });
          usedIds.add(item.content_id);
          count++;
        }
      });
      // Luego: relleno
      fill.forEach((item)=>{
        if (!usedIds.has(item.content_id) && count < limitPerType) {
          final.push({
            ...item,
            priority: 'fill'
          });
          usedIds.add(item.content_id);
          count++;
        }
      });
      console.log(`📋 ${type}: específicos=${specific.length}, relleno=${count - specific.length}, total=${count}`);
    });
    return final;
  }
  groupByType(results) {
    return (results || []).reduce((acc, item)=>{
      if (!acc[item.content_type]) acc[item.content_type] = [];
      acc[item.content_type].push(item);
      return acc;
    }, {});
  }
  async processResults(combinedResults) {
    const groupedIds = {
      article: [],
      video: [],
      testimonial: [],
      faq: [],
      seo_content: []
    };
    const metadataMap = {};
    combinedResults.forEach((result)=>{
      const { content_id, content_type, total_weight, matched_tags, priority } = result;
      if (groupedIds[content_type]) {
        groupedIds[content_type].push(content_id);
        metadataMap[content_id] = {
          total_weight,
          matched_tags,
          content_type,
          priority,
          is_tag_related: true
        };
      }
    });
    console.log('📊 Para consultar:', {
      articles: groupedIds.article.length,
      videos: groupedIds.video.length,
      testimonials: groupedIds.testimonial.length,
      faqs: groupedIds.faq.length,
      seo_content: groupedIds.seo_content.length
    });
    const result = {
      articles: [],
      videos: [],
      testimonials: [],
      faqs: [],
      seo_content: [],
      countryInjected: true // Marcar que se inyectó país
    };
    // ✅ ARTÍCULOS
    if (groupedIds.article.length > 0) {
      const { data: articles } = await this.supabase.from('articles').select(`
          id, title, slug, excerpt, content, featured_image,
          published_at, created_at, updated_at,
          meta_title, meta_description, read_time,
          views, featured, category, author_id,
          users!articles_author_id_fkey(
            first_name, last_name, profile_photo_url
          )
        `).in('id', groupedIds.article).eq('status', 'published').order('published_at', {
        ascending: false
      });
      if (articles) {
        result.articles = this.processArticles(articles, metadataMap);
      }
    }
    // ✅ VIDEOS
    if (groupedIds.video.length > 0) {
      const { data: videos } = await this.supabase.from('videos').select(`
          id, title, description, video_slug, thumbnail, video_id, 
          video_platform, duration, views, category, featured,
          meta_title, meta_description, status, published_at, 
          created_at, updated_at, subtitle
        `).in('id', groupedIds.video).eq('status', 'published').order('published_at', {
        ascending: false
      });
      if (videos) {
        result.videos = videos.map((video)=>({
            ...video,
            ...metadataMap[video.id],
            formatted_duration: formatDuration(video.duration),
            youtube_url: video.video_platform === 'youtube' && video.video_id ? `https://www.youtube.com/watch?v=${video.video_id}` : null
          }));
      }
    }
    // ✅ TESTIMONIALES
    if (groupedIds.testimonial.length > 0) {
      const { data: testimonials } = await this.supabase.from('testimonials').select('*').in('id', groupedIds.testimonial).eq('status', 'published').order('published_at', {
        ascending: false
      });
      if (testimonials) {
        result.testimonials = testimonials.map((testimonial)=>({
            ...testimonial,
            ...metadataMap[testimonial.id]
          }));
      }
    }
    // ✅ FAQS
    if (groupedIds.faq.length > 0) {
      const { data: faqs } = await this.supabase.from('faqs').select('*').in('id', groupedIds.faq).eq('status', 'published').order('sort_order');
      if (faqs) {
        result.faqs = faqs.map((faq)=>({
            ...faq,
            ...metadataMap[faq.id]
          }));
      }
    }
    // ✅ SEO CONTENT
    if (groupedIds.seo_content.length > 0) {
      const { data: seoContent } = await this.supabase.from('seo_content').select('*').in('id', groupedIds.seo_content).eq('status', 'published').order('created_at', {
        ascending: false
      });
      if (seoContent) {
        result.seo_content = seoContent.map((content)=>({
            ...content,
            ...metadataMap[content.id]
          }));
      }
    }
    console.log('✅ Resultado final:', {
      articles: result.articles.length,
      videos: result.videos.length,
      testimonials: result.testimonials.length,
      faqs: result.faqs.length,
      seo_content: result.seo_content.length
    });
    return result;
  }
  processArticles(articles, metadataMap = {}) {
    return articles.map((article)=>{
      const author = {
        name: article.users ? `${article.users.first_name || ''} ${article.users.last_name || ''}`.trim() || 'Equipo CLIC' : 'Equipo CLIC',
        avatar: article.users?.profile_photo_url || '/images/team/clic-experts.jpg'
      };
      return {
        ...article,
        ...metadataMap[article.id],
        featuredImage: article.featured_image,
        publishedAt: article.published_at,
        readTime: article.read_time ? `${article.read_time} min` : '8 min',
        author: author,
        category: article.category || 'Artículos',
        views: article.views || `${Math.floor(Math.random() * 5 + 1)}.${Math.floor(Math.random() * 9 + 1)}K`,
        featured: article.featured || false
      };
    });
  }
  getEmptyResult() {
    return {
      articles: [],
      videos: [],
      testimonials: [],
      faqs: [],
      seo_content: [],
      countryInjected: false
    };
  }
}
