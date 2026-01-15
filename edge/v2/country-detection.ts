// 📁 supabase/functions/unified-property-search/country-detection.ts
import { DEFAULT_DOMINICAN_REPUBLIC } from './config.ts';
export class CountryDetectionService {
  supabase;
  constructor(supabase){
    this.supabase = supabase;
  }
  async detectCountryByDomainAndInjectTag(requestUrl) {
    console.log('🌍 === DETECTANDO PAÍS POR DOMINIO ===');
    const url = new URL(requestUrl);
    const hostname = url.hostname;
    const subdomain = hostname.split('.')[0];
    console.log('🔍 Analizando:', {
      hostname,
      subdomain
    });
    try {
      // 1. Buscar por custom domains PRIMERO
      let country = await this.findByCustomDomain(hostname);
      let detectionMethod = 'custom_domain';
      // 2. Si no encuentra, buscar por subdomain
      if (!country) {
        country = await this.findBySubdomain(subdomain);
        detectionMethod = 'subdomain';
      }
      // 3. Fallback a República Dominicana
      if (!country) {
        country = await this.getDefaultCountry();
        detectionMethod = 'default';
      }
      // 4. Hardcoded fallback
      if (!country) {
        country = this.getHardcodedFallback();
        detectionMethod = 'hardcoded_fallback';
      }
      // 5. Buscar el tag correspondiente al país
      const countryTag = await this.findCountryTag(country);
      return {
        country,
        countryTag,
        detectionMethod
      };
    } catch (error) {
      console.error('❌ Error detectando país:', error);
      return this.getErrorFallback();
    }
  }
  async findByCustomDomain(hostname) {
    const { data: country, error } = await this.supabase.from('countries').select('*').eq('active', true).contains('custom_domains', [
      hostname
    ]).single();
    return error ? null : country;
  }
  async findBySubdomain(subdomain) {
    const { data: country, error } = await this.supabase.from('countries').select('*').eq('active', true).eq('subdomain', subdomain).single();
    return error ? null : country;
  }
  async getDefaultCountry() {
    console.log('🔄 No se encontró país específico, usando República Dominicana como default');
    const { data: country, error } = await this.supabase.from('countries').select('*').eq('active', true).ilike('name', '%república dominicana%').single();
    return error ? null : country;
  }
  getHardcodedFallback() {
    return DEFAULT_DOMINICAN_REPUBLIC;
  }
  getErrorFallback() {
    return {
      country: this.getHardcodedFallback(),
      countryTag: null,
      detectionMethod: 'error_fallback'
    };
  }
  async findCountryTag(country) {
    console.log('🏷️ Buscando tag del país:', country.name);
    try {
      const countrySlug = country.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
      const { data: tag } = await this.supabase.from('tags').select('id, name, slug, category, display_name').eq('category', 'pais').or(`slug.eq.${countrySlug},name.ilike.%${country.name}%`).single();
      if (tag) {
        console.log('✅ Tag de país encontrado:', tag.name);
        return tag;
      }
      console.log('⚠️ No se encontró tag para el país:', country.name);
      return null;
    } catch (error) {
      console.error('❌ Error buscando tag del país:', error);
      return null;
    }
  }
}
