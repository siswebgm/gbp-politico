-- ============================================================================
-- Habilitar extensão pgcrypto necessária para hash de senhas
-- ============================================================================

-- Habilitar extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Verificar se foi habilitada
SELECT 
  'Extensão pgcrypto habilitada!' as status,
  (SELECT count(*) FROM pg_extension WHERE extname = 'pgcrypto') as extensao_instalada;
