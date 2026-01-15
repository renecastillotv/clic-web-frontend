# Nuevas Páginas - Handlers Implementados

## ✅ Handlers creados

Se han agregado 3 nuevos handlers a la edge function `content-backend`:

1. **`locations-handler.ts`** - Página de ubicaciones
2. **`property-types-handler.ts`** - Página de tipos de propiedades
3. **`legal-handler.ts`** - Páginas legales (términos y privacidad)

## 📋 Rutas configuradas

### Español
- `/ubicaciones` → LocationsLayout
- `/propiedades` → PropertyTypesLayout
- `/terminos-y-condiciones` → LegalLayout (terms)
- `/politicas-de-privacidad` → LegalLayout (privacy)

### Inglés
- `/en/locations` → LocationsLayout
- `/en/property-types` → PropertyTypesLayout
- `/en/terms-and-conditions` → LegalLayout (terms)
- `/en/privacy-policy` → LegalLayout (privacy)

### Francés
- `/fr/emplacements` → LocationsLayout
- `/fr/types-de-proprietes` → PropertyTypesLayout
- `/fr/termes-et-conditions` → LegalLayout (terms)
- `/fr/politique-de-confidentialite` → LegalLayout (privacy)

## 🔄 Cómo funciona

### Flujo de datos

1. Usuario visita `/ubicaciones`
2. Astro router llama a `content-backend`
3. `index.ts` detecta la ruta y llama a `handleLocations()`
4. Handler obtiene datos de Supabase (ciudades, sectores, conteos)
5. Devuelve JSON con `pageType: 'locations-main'`
6. Astro renderiza `LocationsLayout.astro` con los datos

## 📊 Datos que obtienen de Supabase

### locations-handler.ts
**Queries a tabla `properties`:**
- Ciudades: `SELECT city, city_slug WHERE status='active'`
- Sectores: `SELECT sector, sector_slug, city WHERE status='active'`
- Total: `SELECT count(id) WHERE status='active'`

**Devuelve:**
```typescript
{
  pageType: 'locations-main',
  locations: {
    cities: [{name, slug, count, image}],
    sectors: [{name, slug, city, count}]
  },
  stats: {totalCities, totalSectors, totalProperties}
}
```

### property-types-handler.ts
**Queries a tabla `properties`:**
- Categorías: `SELECT category, category_slug WHERE status='active'`
- Destacadas por tipo: `SELECT * WHERE category=X LIMIT 6`

**Devuelve:**
```typescript
{
  pageType: 'property-types-main',
  propertyTypes: [{type, slug, count, icon, description}],
  featuredByType: {
    'Apartamentos': [propiedades...],
    'Casas': [propiedades...]
  }
}
```

### legal-handler.ts
**Intenta obtener de tabla `legal_content` (opcional):**
- `SELECT * FROM legal_content WHERE type=X AND language=Y AND country_code=Z`

**Si no existe, usa contenido por defecto**

**Devuelve:**
```typescript
{
  pageType: 'legal-terms' | 'legal-privacy',
  legalType: 'terms' | 'privacy',
  content: {
    sections: [{title, content}]
  },
  lastUpdated: '2025-01-15',
  jurisdiction: 'República Dominicana'
}
```

## 🚀 Deployment

### Opción 1: Supabase CLI
```bash
cd edge/content-backend
supabase functions deploy content-backend
```

### Opción 2: Dashboard de Supabase
1. Ir a Edge Functions → content-backend
2. Copiar contenido de cada handler
3. Pegar en la sección correspondiente
4. Guardar y desplegar

## 🧪 Testing local

```bash
# Ubicaciones
curl http://localhost:54321/functions/v1/content-backend/ubicaciones

# Tipos de propiedades
curl http://localhost:54321/functions/v1/content-backend/propiedades

# Términos
curl http://localhost:54321/functions/v1/content-backend/terminos-y-condiciones

# Privacidad
curl http://localhost:54321/functions/v1/content-backend/politicas-de-privacidad

# Inglés
curl http://localhost:54321/functions/v1/content-backend/en/locations

# Francés
curl http://localhost:54321/functions/v1/content-backend/fr/emplacements
```

## 📝 Tabla legal_content (opcional)

Si quieres gestionar el contenido legal desde la base de datos:

```sql
CREATE TABLE legal_content (
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

CREATE INDEX idx_legal_content_lookup ON legal_content(type, language, country_code);
```

**Nota:** La tabla es **opcional**. Si no existe, los handlers usan contenido por defecto completo incluido en el código.

## ✨ Características

- ✅ **Multiidioma completo** - Español, inglés y francés
- ✅ **Datos reales** - Extrae de tabla `properties` automáticamente
- ✅ **SEO optimizado** - Meta tags, structured data, Open Graph, breadcrumbs
- ✅ **Contenido por defecto** - Funciona sin configuración adicional
- ✅ **Fallback inteligente** - Si no hay datos en BD, usa contenido demo
- ✅ **Tracking** - Incluye tracking strings para analytics

## 🔧 Mantenimiento

### Actualizar contenido legal
```sql
UPDATE legal_content
SET sections = '[...]'::jsonb, updated_at = NOW()
WHERE type = 'terms' AND language = 'es';
```

### Agregar nuevo idioma
1. Editar `legal-handler.ts`
2. Agregar traducciones en `defaultContent`
3. Agregar rutas en `index.ts` → `CONTENT_ROUTES`
4. Desplegar

### Modificar tipos de propiedades
Editar `property-types-handler.ts` → `typeConfig` para agregar/modificar descripciones e iconos

## 📞 Soporte

Si tienes problemas:
1. Verifica que las tablas `properties` tengan datos activos
2. Revisa logs de Supabase: `supabase functions logs content-backend`
3. Prueba los endpoints con curl
4. Verifica que los pageTypes coincidan en Astro y handlers

## 🎯 Siguiente paso

**Desplegar a producción:**
```bash
cd edge/content-backend
supabase functions deploy content-backend --project-ref [tu-proyecto]
```

Una vez desplegado, las páginas en Astro automáticamente empezarán a mostrar datos reales en lugar del fallback demo.
