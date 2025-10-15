-- =====================================================
-- Migration: Adicionar Expiração de 30 dias para Disparos
-- Descrição: Adiciona coluna de expiração e função para arquivar
--            disparos automaticamente após 30 dias
-- Data: 2025-10-14
-- =====================================================

-- 1. Adicionar coluna expires_at na tabela gbp_disparo
ALTER TABLE public.gbp_disparo 
ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- 2. Adicionar coluna archived (arquivado) para não deletar, apenas ocultar
ALTER TABLE public.gbp_disparo 
ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- 3. Adicionar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_gbp_disparo_expires_at 
ON public.gbp_disparo(expires_at) WHERE archived = false;

CREATE INDEX IF NOT EXISTS idx_gbp_disparo_archived 
ON public.gbp_disparo(archived);

-- 4. Atualizar disparos existentes com data de expiração (30 dias após criação)
UPDATE public.gbp_disparo 
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

-- 5. Criar função para definir expiração automaticamente em novos disparos
CREATE OR REPLACE FUNCTION set_disparo_expiration()
RETURNS TRIGGER AS $$
BEGIN
  -- Define expiração para 30 dias após a criação
  NEW.expires_at := NEW.created_at + INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Criar trigger para definir expiração em novos disparos
DROP TRIGGER IF EXISTS trg_set_disparo_expiration ON public.gbp_disparo;

CREATE TRIGGER trg_set_disparo_expiration
  BEFORE INSERT ON public.gbp_disparo
  FOR EACH ROW
  EXECUTE FUNCTION set_disparo_expiration();

-- 7. Criar função para arquivar disparos expirados automaticamente
CREATE OR REPLACE FUNCTION archive_expired_disparos()
RETURNS void AS $$
BEGIN
  UPDATE public.gbp_disparo
  SET archived = true
  WHERE 
    archived = false 
    AND expires_at < NOW()
    AND realizado = true; -- Só arquiva disparos finalizados
    
  RAISE NOTICE 'Disparos expirados foram arquivados';
END;
$$ LANGUAGE plpgsql;

-- 8. Criar uma view para consultar apenas disparos ativos (não expirados)
CREATE OR REPLACE VIEW vw_disparos_ativos AS
SELECT 
  d.*,
  CASE 
    WHEN d.archived THEN 'Arquivado'
    WHEN d.expires_at < NOW() THEN 'Expirado'
    WHEN d.realizado THEN 'Finalizado'
    ELSE d.andamento
  END as status_disparo,
  EXTRACT(DAY FROM (d.expires_at - NOW())) as dias_para_expirar
FROM public.gbp_disparo d
WHERE d.archived = false
ORDER BY d.created_at DESC;

-- 9. Criar view para disparos arquivados/expirados
CREATE OR REPLACE VIEW vw_disparos_arquivados AS
SELECT 
  d.*,
  (d.expires_at - d.created_at) as periodo_ativo
FROM public.gbp_disparo d
WHERE d.archived = true OR d.expires_at < NOW()
ORDER BY d.expires_at DESC;

-- 10. Comentários nas colunas
COMMENT ON COLUMN public.gbp_disparo.expires_at IS 'Data e hora em que o disparo expirará (30 dias após criação)';
COMMENT ON COLUMN public.gbp_disparo.archived IS 'Indica se o disparo foi arquivado (não aparece em consultas normais)';

-- 11. [OPCIONAL] Criar job agendado para arquivar automaticamente
-- Requer extensão pg_cron (se disponível no Supabase)
-- 
-- SELECT cron.schedule(
--   'archive-expired-disparos',
--   '0 2 * * *', -- Executa todo dia às 2h da manhã
--   $$ SELECT archive_expired_disparos(); $$
-- );

-- =====================================================
-- INSTRUÇÕES DE USO:
-- =====================================================

-- Para consultar apenas disparos ativos (não expirados):
-- SELECT * FROM vw_disparos_ativos;

-- Para consultar disparos arquivados:
-- SELECT * FROM vw_disparos_arquivados;

-- Para arquivar manualmente disparos expirados:
-- SELECT archive_expired_disparos();

-- Para desarquivar um disparo específico:
-- UPDATE gbp_disparo SET archived = false WHERE uid = 'UUID_DO_DISPARO';

-- Para estender a validade de um disparo por mais 30 dias:
-- UPDATE gbp_disparo 
-- SET expires_at = expires_at + INTERVAL '30 days' 
-- WHERE uid = 'UUID_DO_DISPARO';

-- =====================================================
-- ROLLBACK (caso necessário):
-- =====================================================
/*
-- Remover views
DROP VIEW IF EXISTS vw_disparos_ativos;
DROP VIEW IF EXISTS vw_disparos_arquivados;

-- Remover trigger e função
DROP TRIGGER IF EXISTS trg_set_disparo_expiration ON public.gbp_disparo;
DROP FUNCTION IF EXISTS set_disparo_expiration();
DROP FUNCTION IF EXISTS archive_expired_disparos();

-- Remover índices
DROP INDEX IF EXISTS idx_gbp_disparo_expires_at;
DROP INDEX IF EXISTS idx_gbp_disparo_archived;

-- Remover colunas
ALTER TABLE public.gbp_disparo DROP COLUMN IF EXISTS expires_at;
ALTER TABLE public.gbp_disparo DROP COLUMN IF EXISTS archived;
*/
