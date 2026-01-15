-- ================================================================
-- TABLAS PARA SISTEMA DE REACCIONES EN FAVORITOS COMPARTIDOS
-- Ejecuta esto en Supabase SQL Editor
-- ================================================================

-- 1. Eliminar tablas si existen (solo si quieres empezar de cero)
-- DROP TABLE IF EXISTS public.favorite_reactions CASCADE;
-- DROP TABLE IF EXISTS public.favorite_visitors CASCADE;

-- 2. Crear tabla de visitantes
CREATE TABLE public.favorite_visitors (
  id BIGSERIAL PRIMARY KEY,
  list_id TEXT NOT NULL,
  visitor_device_id TEXT NOT NULL,
  visitor_alias TEXT NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (list_id, visitor_device_id)
);

-- 3. Crear tabla de reacciones
CREATE TABLE public.favorite_reactions (
  id BIGSERIAL PRIMARY KEY,
  list_id TEXT NOT NULL,
  property_id UUID NOT NULL,
  visitor_device_id TEXT NOT NULL,
  visitor_alias TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'comment')),
  comment_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Crear índices
CREATE INDEX idx_favorite_visitors_list_id ON public.favorite_visitors(list_id);
CREATE INDEX idx_favorite_reactions_list_id ON public.favorite_reactions(list_id);
CREATE INDEX idx_favorite_reactions_property_id ON public.favorite_reactions(property_id);

-- 5. Habilitar RLS
ALTER TABLE public.favorite_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_reactions ENABLE ROW LEVEL SECURITY;

-- 6. Crear políticas (permitir acceso público)
CREATE POLICY "Allow all operations on favorite_visitors"
  ON public.favorite_visitors
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all operations on favorite_reactions"
  ON public.favorite_reactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 7. Verificar que se crearon correctamente
SELECT 'Tablas creadas exitosamente' AS status;
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('favorite_visitors', 'favorite_reactions');
