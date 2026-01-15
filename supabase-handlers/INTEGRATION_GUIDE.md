# Guía de Integración de Handlers en Supabase

## Ubicación de los archivos

Estos handlers deben integrarse en tu edge function `content-backend` de Supabase.

## Estructura recomendada

```
supabase/functions/content-backend/
├── index.ts (archivo principal)
├── handlers/
│   ├── locations-handler.ts
│   ├── property-types-handler.ts
│   └── legal-handler.ts
```

## Integración en index.ts

Agrega las siguientes importaciones y lógica en tu archivo `content-backend/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { handleLocationsPage } from './handlers/locations-handler.ts';
import { handlePropertyTypesPage } from './handlers/property-types-handler.ts';
import { handleLegalPage } from './handlers/legal-handler.ts';

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const searchParams = url.searchParams;

    // Obtener idioma del path
    const pathParts = pathname.split('/').filter(Boolean);
    let language = 'es';
    let routeParts = pathParts;

    if (pathParts[0] === 'en' || pathParts[0] === 'fr') {
      language = pathParts[0];
      routeParts = pathParts.slice(1);
    }

    const firstSegment = routeParts[0] || '';

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

    // Obtener configuración global y país (reutilizar tu lógica existente)
    const country = { code: 'DO', name: 'República Dominicana' }; // Adaptar según tu lógica
    const globalConfig = {}; // Adaptar según tu lógica

    // ROUTER PARA NUEVAS PÁGINAS
    switch (firstSegment) {
      // UBICACIONES
      case 'ubicaciones':
      case 'locations':
      case 'emplacements': {
        const data = await handleLocationsPage(language, supabaseClient, country, globalConfig);
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      }

      // TIPOS DE PROPIEDADES
      case 'propiedades':
      case 'property-types':
      case 'types-de-proprietes': {
        const data = await handlePropertyTypesPage(language, supabaseClient, country, globalConfig);
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      }

      // TÉRMINOS Y CONDICIONES
      case 'terminos-y-condiciones':
      case 'terms-and-conditions':
      case 'termes-et-conditions': {
        const data = await handleLegalPage('terms', language, supabaseClient, country, globalConfig);
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      }

      // POLÍTICAS DE PRIVACIDAD
      case 'politicas-de-privacidad':
      case 'privacy-policy':
      case 'politique-de-confidentialite': {
        const data = await handleLegalPage('privacy', language, supabaseClient, country, globalConfig);
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      }

      // TUS OTROS HANDLERS EXISTENTES (asesores, testimonios, etc.)
      default: {
        // Tu lógica existente para otros endpoints...
        return new Response(JSON.stringify({ pageType: '404' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }
    }

  } catch (error) {
    console.error('Error in content-backend:', error);
    return new Response(JSON.stringify({
      pageType: '404',
      error: error.message
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500
    });
  }
});
```

## Tabla de base de datos opcional para contenido legal

Si quieres almacenar el contenido legal en la base de datos (recomendado para diferentes franquicias):

```sql
CREATE TABLE legal_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL, -- 'terms' o 'privacy'
  language VARCHAR(2) NOT NULL, -- 'es', 'en', 'fr'
  country_code VARCHAR(2) NOT NULL, -- 'DO', 'US', etc.
  sections JSONB NOT NULL, -- Array de {title, content}
  jurisdiction VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(type, language, country_code)
);

-- Índices
CREATE INDEX idx_legal_content_lookup ON legal_content(type, language, country_code);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_legal_content_updated_at BEFORE UPDATE ON legal_content
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Insertar contenido legal de ejemplo

```sql
-- Términos y condiciones en español
INSERT INTO legal_content (type, language, country_code, sections, jurisdiction)
VALUES (
  'terms',
  'es',
  'DO',
  '[
    {
      "title": "1. Aceptación de los Términos",
      "content": "Al acceder y utilizar este sitio web..."
    },
    {
      "title": "2. Uso del Sitio",
      "content": "Este sitio web y su contenido..."
    }
  ]'::jsonb,
  'República Dominicana'
);

-- Políticas de privacidad en español
INSERT INTO legal_content (type, language, country_code, sections, jurisdiction)
VALUES (
  'privacy',
  'es',
  'DO',
  '[
    {
      "title": "1. Recopilación de Información",
      "content": "CLIC Inmobiliaria recopila información..."
    },
    {
      "title": "2. Uso de la Información",
      "content": "Utilizamos la información que recopilamos..."
    }
  ]'::jsonb,
  'República Dominicana'
);
```

## Deployment

1. **Copia los archivos** a tu proyecto de Supabase:
   ```bash
   cp locations-handler.ts supabase/functions/content-backend/handlers/
   cp property-types-handler.ts supabase/functions/content-backend/handlers/
   cp legal-handler.ts supabase/functions/content-backend/handlers/
   ```

2. **Actualiza** `content-backend/index.ts` con el código de integración

3. **Despliega** la función:
   ```bash
   supabase functions deploy content-backend
   ```

4. **(Opcional)** Crea la tabla `legal_content` si quieres gestionar contenido legal desde la BD

## Testing

Prueba cada endpoint:

```bash
# Ubicaciones
curl https://[tu-proyecto].supabase.co/functions/v1/content-backend/ubicaciones

# Tipos de propiedades
curl https://[tu-proyecto].supabase.co/functions/v1/content-backend/propiedades

# Términos
curl https://[tu-proyecto].supabase.co/functions/v1/content-backend/terminos-y-condiciones

# Privacidad
curl https://[tu-proyecto].supabase.co/functions/v1/content-backend/politicas-de-privacidad
```

## Notas importantes

1. **Los handlers ya tienen contenido por defecto** en español, inglés y francés, así que funcionarán aunque no crees la tabla `legal_content`

2. **El handler de ubicaciones** obtiene datos reales de la tabla `properties` (ciudades y sectores con conteos)

3. **El handler de tipos de propiedades** obtiene datos reales de la tabla `properties` (categorías con conteos) y puede incluir propiedades destacadas

4. **Los handlers legales** intentan primero obtener contenido de la BD, y si no existe, usan el contenido por defecto incluido en el código

5. **Todos los handlers soportan multiidioma** automáticamente basándose en el parámetro `language`

6. **El SEO está completamente configurado** con meta tags, structured data, breadcrumbs, Open Graph y Twitter Cards
