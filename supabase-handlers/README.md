# Handlers de Supabase para Nuevas Páginas

## 📁 Archivos creados

1. **locations-handler.ts** - Handler para páginas de ubicaciones
2. **property-types-handler.ts** - Handler para tipos de propiedades
3. **legal-handler.ts** - Handler unificado para términos y políticas
4. **INTEGRATION_GUIDE.md** - Guía completa de integración
5. **README.md** - Este archivo

## 🎯 Funcionalidad

### 1. Ubicaciones (`/ubicaciones`)
**Rutas:**
- ES: `/ubicaciones`
- EN: `/en/locations`
- FR: `/fr/emplacements`

**Datos que obtiene de la BD:**
- Lista de ciudades con conteo de propiedades activas
- Lista de sectores con conteo de propiedades activas
- Estadísticas totales (ciudades, sectores, propiedades)
- Ubicaciones destacadas (top 4 ciudades)
- Búsquedas populares (top 10 sectores)

**Query principal:**
```sql
SELECT city, city_slug
FROM properties
WHERE status = 'active'
  AND city IS NOT NULL
```

### 2. Tipos de Propiedades (`/propiedades`)
**Rutas:**
- ES: `/propiedades`
- EN: `/en/property-types`
- FR: `/fr/types-de-proprietes`

**Datos que obtiene de la BD:**
- Lista de categorías/tipos con conteo
- Propiedades destacadas por tipo (top 6 de cada categoría)
- Descripción e íconos personalizados por tipo

**Query principal:**
```sql
SELECT category, category_slug
FROM properties
WHERE status = 'active'
  AND category IS NOT NULL
```

### 3. Términos y Condiciones (`/terminos-y-condiciones`)
**Rutas:**
- ES: `/terminos-y-condiciones`
- EN: `/en/terms-and-conditions`
- FR: `/fr/termes-et-conditions`

**Datos:**
- Intenta obtener de tabla `legal_content` (si existe)
- Fallback a contenido por defecto en código (8 secciones completas)
- Incluye fecha de última actualización y jurisdicción

### 4. Políticas de Privacidad (`/politicas-de-privacidad`)
**Rutas:**
- ES: `/politicas-de-privacidad`
- EN: `/en/privacy-policy`
- FR: `/fr/politique-de-confidentialite`

**Datos:**
- Intenta obtener de tabla `legal_content` (si existe)
- Fallback a contenido por defecto en código (9 secciones completas incluyendo GDPR)
- Incluye fecha de última actualización y jurisdicción

## 🚀 Instalación rápida

### Opción 1: Integrar en content-backend existente

1. Copia los 3 handlers a `supabase/functions/content-backend/handlers/`
2. Actualiza `content-backend/index.ts` siguiendo la guía en `INTEGRATION_GUIDE.md`
3. Despliega: `supabase functions deploy content-backend`

### Opción 2: Crear tabla legal_content (opcional pero recomendado)

```bash
# Conectar a tu BD de Supabase
supabase db push

# O ejecutar manualmente el SQL de INTEGRATION_GUIDE.md
```

## 📊 Estructura de datos esperada en BD

### Tabla `properties` (ya existe)
Campos utilizados:
- `city`, `city_slug`
- `sector`, `sector_slug`
- `category`, `category_slug`
- `status` (debe ser 'active')
- `id`, `code`, `title`, `price`, `currency`
- `bedrooms`, `bathrooms`, `area`, `parking_spaces`
- `image`, `images`
- `featured`, `views_count`

### Tabla `legal_content` (opcional, crear nueva)
```typescript
{
  id: UUID,
  type: 'terms' | 'privacy',
  language: 'es' | 'en' | 'fr',
  country_code: 'DO' | 'US' | ...,
  sections: [
    {
      title: string,
      content: string
    }
  ],
  jurisdiction: string,
  updated_at: timestamp
}
```

## 🧪 Testing local

### 1. Test con Supabase CLI local

```bash
# Iniciar Supabase localmente
supabase start

# Desplegar función localmente
supabase functions deploy content-backend --no-verify-jwt

# Probar endpoints
curl http://localhost:54321/functions/v1/content-backend/ubicaciones
curl http://localhost:54321/functions/v1/content-backend/propiedades
curl http://localhost:54321/functions/v1/content-backend/terminos-y-condiciones
```

### 2. Test en producción

```bash
# Obtener URL de tu proyecto
SUPABASE_URL="https://[tu-proyecto].supabase.co"

# Test ubicaciones
curl $SUPABASE_URL/functions/v1/content-backend/ubicaciones

# Test inglés
curl $SUPABASE_URL/functions/v1/content-backend/en/locations

# Test francés
curl $SUPABASE_URL/functions/v1/content-backend/fr/emplacements
```

## ✅ Checklist de deployment

- [ ] Copiar handlers a `supabase/functions/content-backend/handlers/`
- [ ] Actualizar `index.ts` con el router
- [ ] (Opcional) Crear tabla `legal_content`
- [ ] (Opcional) Insertar contenido legal en BD
- [ ] Desplegar función: `supabase functions deploy content-backend`
- [ ] Probar cada endpoint en desarrollo
- [ ] Probar cada endpoint en producción
- [ ] Verificar que las páginas en Astro se renderizan correctamente
- [ ] Verificar SEO (meta tags, structured data)
- [ ] Verificar multiidioma (es/en/fr)

## 🔍 Troubleshooting

### Error: "handlers/locations-handler.ts not found"
**Solución:** Verifica la estructura de carpetas. Debe ser:
```
supabase/functions/content-backend/
├── index.ts
└── handlers/
    ├── locations-handler.ts
    ├── property-types-handler.ts
    └── legal-handler.ts
```

### Error: "Cannot read properties of undefined (reading 'count')"
**Solución:** Asegúrate de tener propiedades activas en la tabla `properties` con campos `city`, `sector` y `category` no nulos.

### Contenido legal no se actualiza
**Solución:** Verifica que:
1. La tabla `legal_content` existe
2. Los campos `type`, `language` y `country_code` coinciden exactamente
3. El campo `updated_at` se actualiza con el trigger

### Las páginas muestran datos demo
**Solución:**
1. Verifica que el handler está desplegado correctamente
2. Chequea los logs de Supabase: `supabase functions logs content-backend`
3. Verifica que el endpoint devuelve el `pageType` correcto

## 📈 Próximos pasos

1. **Agregar caché:** Implementar Redis o caché en memoria para queries frecuentes
2. **Imágenes:** Subir imágenes reales de ciudades a `/public/images/cities/`
3. **Analytics:** Agregar tracking de vistas en cada página
4. **A/B Testing:** Experimentar con diferentes contenidos legales
5. **Multipaís:** Extender soporte para diferentes jurisdicciones

## 💡 Tips

- Los handlers ya incluyen contenido por defecto completo en 3 idiomas
- No necesitas crear la tabla `legal_content` para que funcionen
- El contenido de ubicaciones y tipos se genera dinámicamente desde `properties`
- El SEO está completamente optimizado (structured data, Open Graph, etc.)
- Los handlers son completamente independientes y pueden ser modificados sin afectar otros

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs: `supabase functions logs content-backend`
2. Verifica la documentación en `INTEGRATION_GUIDE.md`
3. Prueba cada handler individualmente con curl
4. Verifica que tu tabla `properties` tiene datos activos
