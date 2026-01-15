-- ================================================================
-- Tabla para Contact Submissions
-- ================================================================

-- Eliminar tabla si existe (solo para desarrollo, comentar en producción)
-- DROP TABLE IF EXISTS contact_submissions CASCADE;

-- Crear tabla contact_submissions
CREATE TABLE IF NOT EXISTS contact_submissions (
  -- Identificador único
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Información del contacto (REQUERIDOS)
  nombre TEXT NOT NULL,
  telefono TEXT NOT NULL,
  email TEXT NOT NULL,
  tipo_servicio TEXT NOT NULL CHECK (tipo_servicio IN ('asesor', 'vender', 'desarrollo', 'comprar', 'otro')),

  -- Información adicional (OPCIONALES)
  mensaje TEXT,
  preferencia_contacto TEXT DEFAULT 'asap',

  -- Información de tracking y metadata
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,

  -- Parámetros UTM
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,

  -- Otros parámetros de tracking
  ref_param TEXT,
  fbclid TEXT,
  gclid TEXT,

  -- Tracking data completo en JSON
  tracking_data JSONB,

  -- Estado del submission
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'contactado', 'en_proceso', 'completado', 'descartado')),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_telefono ON contact_submissions(telefono);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_tipo_servicio ON contact_submissions(tipo_servicio);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_utm_source ON contact_submissions(utm_source);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_utm_campaign ON contact_submissions(utm_campaign);

-- Índice GIN para búsqueda en tracking_data JSON
CREATE INDEX IF NOT EXISTS idx_contact_submissions_tracking_data ON contact_submissions USING GIN (tracking_data);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_contact_submissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_contact_submissions_updated_at ON contact_submissions;

CREATE TRIGGER trigger_update_contact_submissions_updated_at
  BEFORE UPDATE ON contact_submissions
  FOR EACH ROW
  EXECUTE FUNCTION update_contact_submissions_updated_at();

-- Comentarios en la tabla
COMMENT ON TABLE contact_submissions IS 'Almacena los envíos del formulario de contacto con información de tracking';
COMMENT ON COLUMN contact_submissions.nombre IS 'Nombre completo del contacto';
COMMENT ON COLUMN contact_submissions.telefono IS 'Número de teléfono del contacto';
COMMENT ON COLUMN contact_submissions.email IS 'Correo electrónico del contacto';
COMMENT ON COLUMN contact_submissions.tipo_servicio IS 'Tipo de servicio solicitado: asesor, vender, desarrollo, comprar, otro';
COMMENT ON COLUMN contact_submissions.mensaje IS 'Mensaje opcional del contacto';
COMMENT ON COLUMN contact_submissions.preferencia_contacto IS 'Cuándo prefiere ser contactado';
COMMENT ON COLUMN contact_submissions.tracking_data IS 'Datos completos de tracking en formato JSON';
COMMENT ON COLUMN contact_submissions.status IS 'Estado del submission: pendiente, contactado, en_proceso, completado, descartado';

-- Política de seguridad (Row Level Security)
-- IMPORTANTE: Ajustar según tus necesidades de seguridad

-- Habilitar RLS
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Política: Permitir INSERT anónimo (para el formulario público)
-- NOTA: Esto permite que cualquiera inserte datos.
-- En producción, considera validaciones adicionales o usar service_role key en la edge function
CREATE POLICY "Allow anonymous insert on contact_submissions"
  ON contact_submissions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Política: Solo usuarios autenticados pueden ver los submissions
CREATE POLICY "Allow authenticated users to view contact_submissions"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Política: Solo usuarios autenticados pueden actualizar
CREATE POLICY "Allow authenticated users to update contact_submissions"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permisos
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT ON contact_submissions TO anon;
GRANT SELECT, UPDATE ON contact_submissions TO authenticated;

-- Vista para análisis de submissions (opcional)
CREATE OR REPLACE VIEW contact_submissions_analytics AS
SELECT
  DATE_TRUNC('day', created_at) as submission_date,
  tipo_servicio,
  status,
  COUNT(*) as total_submissions,
  COUNT(DISTINCT email) as unique_emails,
  utm_source,
  utm_campaign
FROM contact_submissions
GROUP BY DATE_TRUNC('day', created_at), tipo_servicio, status, utm_source, utm_campaign
ORDER BY submission_date DESC;

COMMENT ON VIEW contact_submissions_analytics IS 'Vista para análisis de submissions agrupados por fecha, tipo y fuente';

-- Verificación
SELECT
  'contact_submissions table created successfully!' as message,
  COUNT(*) as current_rows
FROM contact_submissions;
