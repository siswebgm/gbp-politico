-- Ciclo de cobrança por empresa:
--   dia_vencimento = dia fixo de vencimento das cobranças (ex.: 5 ou 20).
--   Janela de pagamento: ~10 dias após o vencimento
--   (cliente do dia 20 paga até 30; do dia 5 paga até 10).

ALTER TABLE public.gbp_empresas
ADD COLUMN IF NOT EXISTS dia_vencimento integer DEFAULT 20;

ALTER TABLE public.gbp_empresas
ADD CONSTRAINT gbp_empresas_dia_vencimento_check
CHECK (dia_vencimento BETWEEN 1 AND 28) NOT VALID;

-- Pede recarga do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- OPCIONAL: bloqueio automático diário de empresas vencidas.
-- Requer a extensão pg_cron habilitada no Supabase
-- (Database > Extensions > pg_cron). Rode:
--
-- SELECT cron.schedule(
--   'verificar-assinaturas-vencidas',
--   '15 3 * * *',  -- todo dia 03:15 (UTC)
--   $$SELECT verificar_assinaturas_vencidas()$$
-- );
-- ============================================================
