-- ================================================================
-- TABLAS PARA SISTEMA DE REACCIONES EN FAVORITOS COMPARTIDOS
-- ================================================================

-- Tabla para almacenar visitantes de listas compartidas
CREATE TABLE IF NOT EXISTS public.favorite_visitors (
  id BIGSERIAL PRIMARY KEY,
  list_id TEXT NOT NULL,  -- El device_id de device_favorites
  visitor_device_id TEXT NOT NULL,
  visitor_alias TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Índices para búsqueda rápida
  CONSTRAINT unique_visitor_per_list UNIQUE (list_id, visitor_device_id)
);

-- Tabla para almacenar reacciones (likes, dislikes, comentarios)
CREATE TABLE IF NOT EXISTS public.favorite_reactions (
  id BIGSERIAL PRIMARY KEY,
  list_id TEXT NOT NULL,  -- El device_id de device_favorites
  property_id UUID NOT NULL,  -- ID de la propiedad (UUID)
  visitor_device_id TEXT NOT NULL,
  visitor_alias TEXT NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike', 'comment')),
  comment_text TEXT,  -- Solo para reaction_type = 'comment'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Índices para búsqueda rápida
  CONSTRAINT unique_like_dislike_per_visitor
    UNIQUE (list_id, property_id, visitor_device_id, reaction_type)
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_favorite_visitors_list_id ON public.favorite_visitors(list_id);
CREATE INDEX IF NOT EXISTS idx_favorite_visitors_device_id ON public.favorite_visitors(visitor_device_id);

CREATE INDEX IF NOT EXISTS idx_favorite_reactions_list_id ON public.favorite_reactions(list_id);
CREATE INDEX IF NOT EXISTS idx_favorite_reactions_property_id ON public.favorite_reactions(property_id);
CREATE INDEX IF NOT EXISTS idx_favorite_reactions_visitor_device_id ON public.favorite_reactions(visitor_device_id);
CREATE INDEX IF NOT EXISTS idx_favorite_reactions_type ON public.favorite_reactions(reaction_type);

-- ================================================================
-- POLÍTICAS RLS (Row Level Security)
-- ================================================================

-- Habilitar RLS
ALTER TABLE public.favorite_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_reactions ENABLE ROW LEVEL SECURITY;

-- Política para favorite_visitors: Permitir lectura y escritura a todos (anon)
CREATE POLICY "Allow public read access to favorite_visitors"
  ON public.favorite_visitors
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to favorite_visitors"
  ON public.favorite_visitors
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to favorite_visitors"
  ON public.favorite_visitors
  FOR UPDATE
  USING (true);

-- Política para favorite_reactions: Permitir lectura y escritura a todos (anon)
CREATE POLICY "Allow public read access to favorite_reactions"
  ON public.favorite_reactions
  FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert access to favorite_reactions"
  ON public.favorite_reactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to favorite_reactions"
  ON public.favorite_reactions
  FOR DELETE
  USING (true);

-- ================================================================
-- COMENTARIOS
-- ================================================================

COMMENT ON TABLE public.favorite_visitors IS 'Almacena los visitantes que acceden a listas de favoritos compartidas';
COMMENT ON TABLE public.favorite_reactions IS 'Almacena likes, dislikes y comentarios en propiedades de listas compartidas';

COMMENT ON COLUMN public.favorite_visitors.list_id IS 'ID de la lista compartida (device_id de device_favorites)';
COMMENT ON COLUMN public.favorite_visitors.visitor_device_id IS 'ID único del dispositivo del visitante';
COMMENT ON COLUMN public.favorite_visitors.visitor_alias IS 'Nombre/alias que el visitante eligió';

COMMENT ON COLUMN public.favorite_reactions.list_id IS 'ID de la lista compartida (device_id de device_favorites)';
COMMENT ON COLUMN public.favorite_reactions.property_id IS 'ID de la propiedad en la que se hizo la reacción';
COMMENT ON COLUMN public.favorite_reactions.reaction_type IS 'Tipo de reacción: like, dislike o comment';
COMMENT ON COLUMN public.favorite_reactions.comment_text IS 'Texto del comentario (solo cuando reaction_type = comment)';
