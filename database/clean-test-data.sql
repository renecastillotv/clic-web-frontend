-- ================================================================
-- LIMPIAR DATOS DE PRUEBA - FAVORITOS Y REACCIONES
-- ================================================================

-- Ver los datos actuales antes de borrar
SELECT 'VISITANTES ACTUALES:' AS info;
SELECT * FROM favorite_visitors ORDER BY joined_at DESC;

SELECT 'REACCIONES ACTUALES:' AS info;
SELECT * FROM favorite_reactions ORDER BY created_at DESC;

-- ================================================================
-- OPCIÓN 1: Borrar todo (empezar de cero)
-- ================================================================
-- Descomenta estas líneas para borrar todo:

-- DELETE FROM favorite_reactions;
-- DELETE FROM favorite_visitors;

-- ================================================================
-- OPCIÓN 2: Borrar solo las reacciones de una lista específica
-- ================================================================
-- Cambia 'DEV-0f1241a8-120' por tu list_id real

-- DELETE FROM favorite_reactions WHERE list_id = 'DEV-0f1241a8-120';
-- DELETE FROM favorite_visitors WHERE list_id = 'DEV-0f1241a8-120';

-- ================================================================
-- OPCIÓN 3: Borrar solo un visitante específico
-- ================================================================
-- Cambia 'VIS-xxx' por el visitor_device_id real

-- DELETE FROM favorite_reactions WHERE visitor_device_id = 'VIS-xxx';
-- DELETE FROM favorite_visitors WHERE visitor_device_id = 'VIS-xxx';

-- ================================================================
-- Verificar que se borraron
-- ================================================================
SELECT 'DESPUÉS DE BORRAR:' AS info;
SELECT COUNT(*) as total_visitantes FROM favorite_visitors;
SELECT COUNT(*) as total_reacciones FROM favorite_reactions;
