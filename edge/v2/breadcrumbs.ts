// ================================================================
// 📄 11. breadcrumbs.ts - Servicio de breadcrumbs
// ================================================================
import { HIERARCHY_ORDER } from './config.ts';
export class BreadcrumbsService {
  supabase;
  constructor(supabase){
    this.supabase = supabase;
  }
  async generateSmartBreadcrumbs(tags, urlSegments, context = 'listing') {
    const breadcrumbs = [];
    breadcrumbs.push({
      name: 'Inicio',
      slug: '',
      url: '/',
      category: 'root',
      is_active: false,
      position: 0
    });
    if (!tags || tags.length === 0) {
      return breadcrumbs;
    }
    const tagsByCategory = {
      operacion: tags.filter((t)=>t.category === 'operacion'),
      categoria: tags.filter((t)=>t.category === 'categoria'),
      ciudad: tags.filter((t)=>t.category === 'ciudad'),
      sector: tags.filter((t)=>t.category === 'sector'),
      provincia: tags.filter((t)=>t.category === 'provincia'),
      otros: tags.filter((t)=>![
          'operacion',
          'categoria',
          'ciudad',
          'sector',
          'provincia'
        ].includes(t.category))
    };
    let currentPath = '';
    let position = 1;
    for (const categoryKey of HIERARCHY_ORDER){
      const categoryTags = tagsByCategory[categoryKey];
      if (categoryTags.length > 0) {
        const tag = categoryTags[0];
        currentPath = currentPath ? `${currentPath}/${tag.slug}` : tag.slug;
        breadcrumbs.push({
          name: tag.display_name || tag.name,
          slug: tag.slug,
          url: `/${currentPath}`,
          category: tag.category,
          is_active: false,
          position: position,
          tag_id: tag.id,
          description: tag.description,
          icon: tag.icon
        });
        position++;
      }
    }
    if (context === 'listing' && tagsByCategory.otros.length > 0) {
      const additionalTags = tagsByCategory.otros.filter((tag)=>urlSegments.includes(tag.slug)).slice(0, 2);
      for (const tag of additionalTags){
        currentPath = `${currentPath}/${tag.slug}`;
        breadcrumbs.push({
          name: tag.display_name || tag.name,
          slug: tag.slug,
          url: `/${currentPath}`,
          category: tag.category,
          is_active: false,
          position: position,
          tag_id: tag.id,
          description: tag.description,
          icon: tag.icon
        });
        position++;
      }
    }
    if (context === 'listing' && breadcrumbs.length > 1) {
      breadcrumbs[breadcrumbs.length - 1].is_active = true;
    }
    return breadcrumbs.filter((bc)=>bc.name && bc.name.trim().length > 0);
  }
  async generatePropertyBreadcrumbs(property, propertyTags) {
    try {
      if (propertyTags.length === 0) {
        return await this.generateFallbackPropertyBreadcrumbs(property);
      }
      const breadcrumbs = await this.generateSmartBreadcrumbs(propertyTags, [], 'single');
      const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
      const finalUrl = lastBreadcrumb ? `${lastBreadcrumb.url}/${property.slug_url || property.id}` : `/${property.slug_url || property.id}`;
      breadcrumbs.push({
        name: property.name,
        slug: property.slug_url || property.id,
        url: finalUrl,
        category: 'property',
        is_active: true,
        position: breadcrumbs.length,
        is_current_page: true
      });
      return breadcrumbs;
    } catch (error) {
      console.error('❌ Error generando breadcrumbs de propiedad:', error);
      return await this.generateFallbackPropertyBreadcrumbs(property);
    }
  }
  async generateFallbackPropertyBreadcrumbs(property) {
    const breadcrumbs = [
      {
        name: 'Inicio',
        slug: '',
        url: '/',
        category: 'root',
        is_active: false,
        position: 0
      }
    ];
    if (property.property_categories?.name) {
      const categorySlug = property.property_categories.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
      breadcrumbs.push({
        name: property.property_categories.name,
        slug: categorySlug,
        url: `/${categorySlug}`,
        category: 'categoria',
        is_active: false,
        position: 1
      });
    }
    if (property.cities?.name) {
      const citySlug = property.cities.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
      const previousUrl = breadcrumbs[breadcrumbs.length - 1].url;
      const cityUrl = previousUrl === '/' ? `/${citySlug}` : `${previousUrl}/${citySlug}`;
      breadcrumbs.push({
        name: property.cities.name,
        slug: citySlug,
        url: cityUrl,
        category: 'ciudad',
        is_active: false,
        position: breadcrumbs.length
      });
    }
    const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
    const finalUrl = `${lastBreadcrumb.url}/${property.slug_url || property.id}`;
    breadcrumbs.push({
      name: property.name,
      slug: property.slug_url || property.id,
      url: finalUrl,
      category: 'property',
      is_active: true,
      position: breadcrumbs.length,
      is_current_page: true
    });
    return breadcrumbs;
  }
}
