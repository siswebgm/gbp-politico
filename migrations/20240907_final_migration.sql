-- Script final de migração para a tabela gbp_demandas_ruas
-- Este script deve ser executado após a migração dos dados para a tabela gbp_requerentes_demanda_rua

-- 1. Primeiro, vamos garantir que todas as demandas tenham um requerente_uid válido
-- Se houver demandas sem requerente_uid, isso irá falhar
ALTER TABLE public.gbp_demandas_ruas 
  ALTER COLUMN requerente_uid SET NOT NULL;

-- 2. Remover a restrição NOT NULL das colunas antigas
ALTER TABLE public.gbp_demandas_ruas 
  ALTER COLUMN requerente_nome DROP NOT NULL,
  ALTER COLUMN requerente_cpf DROP NOT NULL,
  ALTER COLUMN requerente_whatsapp DROP NOT NULL;

-- 3. Atualizar as permissões para garantir que o usuário autenticado possa acessar a tabela de requerentes
GRANT ALL ON TABLE public.gbp_requerentes_demanda_rua TO authenticated, service_role;

-- 4. Adicionar índice para melhorar o desempenho das consultas por requerente
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_requerente_uid 
  ON public.gbp_demandas_ruas(requerente_uid);

-- 5. (OPCIONAL) Comentar as colunas que serão removidas para documentação
COMMENT ON COLUMN public.gbp_demandas_ruas.requerente_nome IS 'DEPRECATED - Remover após migração completa';
COMMENT ON COLUMN public.gbp_demandas_ruas.requerente_cpf IS 'DEPRECATED - Remover após migração completa';
COMMENT ON COLUMN public.gbp_demandas_ruas.requerente_whatsapp IS 'DEPRECATED - Remover após migração completa';

-- 6. (OPCIONAL) Remover as colunas antigas após confirmar que tudo está funcionando
-- ALTER TABLE public.gbp_demandas_ruas
--   DROP COLUMN requerente_nome,
--   DROP COLUMN requerente_cpf,
--   DROP COLUMN requerente_whatsapp;
