-- Script para finalizar a migração da tabela gbp_demandas_ruas
-- Este script deve ser executado após a migração dos dados para a tabela gbp_requerentes_demanda_rua

-- 1. Garantir que o requerente_uid seja NOT NULL
ALTER TABLE public.gbp_demandas_ruas 
  ALTER COLUMN requerente_uid SET NOT NULL;

-- 2. Remover as colunas antigas de requerente (se ainda existirem)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'gbp_demandas_ruas' 
             AND column_name = 'requerente_nome') THEN
    ALTER TABLE public.gbp_demandas_ruas 
      DROP COLUMN requerente_nome,
      DROP COLUMN requerente_cpf,
      DROP COLUMN requerente_whatsapp;
  END IF;
END $$;

-- 3. Criar índice para melhorar consultas por requerente
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_requerente_uid 
  ON public.gbp_demandas_ruas(requerente_uid);

-- 4. Garantir permissões para usuários autenticados
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gbp_demandas_ruas TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.gbp_demandas_ruas_uid_seq TO authenticated;

-- 5. Adicionar comentários para documentação
COMMENT ON TABLE public.gbp_demandas_ruas IS 'Tabela para armazenar as demandas de manutenção de ruas';
COMMENT ON COLUMN public.gbp_demandas_ruas.uid IS 'Identificador único da demanda';
COMMENT ON COLUMN public.gbp_demandas_ruas.empresa_uid IS 'Referência à empresa responsável pela demanda';
COMMENT ON COLUMN public.gbp_demandas_ruas.requerente_uid IS 'Referência ao requerente da demanda na tabela gbp_requerentes_demanda_rua';
COMMENT ON COLUMN public.gbp_demandas_ruas.tipo_de_demanda IS 'Tipo da demanda (ex: buraco, iluminação, etc)';
COMMENT ON COLUMN public.gbp_demandas_ruas.status IS 'Status atual da demanda (pendente, em_andamento, concluido, cancelado)';

-- 6. Atualizar estatísticas da tabela
ANALYZE public.gbp_demandas_ruas;
