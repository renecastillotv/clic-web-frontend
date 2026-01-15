-- ================================================================
-- Arreglar políticas RLS para contact_submissions
-- ================================================================

-- OPCIÓN 1: Deshabilitar RLS completamente (más simple, menos seguro)
-- Descomenta si quieres usar esta opción:
-- ALTER TABLE contact_submissions DISABLE ROW LEVEL SECURITY;

-- OPCIÓN 2: Política más permisiva para inserts anónimos (RECOMENDADO)
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow anonymous insert on contact_submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Allow authenticated users to view contact_submissions" ON contact_submissions;
DROP POLICY IF EXISTS "Allow authenticated users to update contact_submissions" ON contact_submissions;

-- Crear política permisiva para INSERT desde service role y anon
CREATE POLICY "Enable insert for all users"
  ON contact_submissions
  FOR INSERT
  WITH CHECK (true);

-- Política para SELECT (solo usuarios autenticados)
CREATE POLICY "Enable select for authenticated users only"
  ON contact_submissions
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para UPDATE (solo usuarios autenticados)
CREATE POLICY "Enable update for authenticated users only"
  ON contact_submissions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verificar que RLS esté habilitado
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Verificación
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'contact_submissions';
