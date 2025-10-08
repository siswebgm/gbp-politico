-- Adicionar campo arquivado na tabela gbp_demandas_ruas
ALTER TABLE public.gbp_demandas_ruas
ADD COLUMN IF NOT EXISTS arquivado BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS pasta_arquivo TEXT NULL;

-- Adicionar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_arquivado 
ON public.gbp_demandas_ruas USING btree (arquivado) 
TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_pasta_arquivo 
ON public.gbp_demandas_ruas USING btree (pasta_arquivo) 
TABLESPACE pg_default;

-- Comentários explicativos
COMMENT ON COLUMN public.gbp_demandas_ruas.arquivado IS 'Indica se a demanda foi arquivada pelo usuário';
COMMENT ON COLUMN public.gbp_demandas_ruas.pasta_arquivo IS 'Nome da pasta/categoria de arquivamento';
