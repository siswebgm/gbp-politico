-- Adicionar campos de soft delete na tabela gbp_demandas_ruas
ALTER TABLE public.gbp_demandas_ruas
ADD COLUMN IF NOT EXISTS excluido BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS excluido_em TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS excluido_por_uid UUID NULL,
ADD COLUMN IF NOT EXISTS excluido_por_nome TEXT NULL;

-- Adicionar índice para melhorar performance de queries
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_excluido 
ON public.gbp_demandas_ruas USING btree (excluido) 
TABLESPACE pg_default;

-- Adicionar foreign key para o usuário que excluiu
ALTER TABLE public.gbp_demandas_ruas
ADD CONSTRAINT fk_excluido_por_usuario 
FOREIGN KEY (excluido_por_uid) 
REFERENCES gbp_usuarios (uid) 
ON DELETE SET NULL;

-- Comentários explicativos
COMMENT ON COLUMN public.gbp_demandas_ruas.excluido IS 'Indica se a demanda foi excluída (soft delete)';
COMMENT ON COLUMN public.gbp_demandas_ruas.excluido_em IS 'Data e hora em que a demanda foi excluída';
COMMENT ON COLUMN public.gbp_demandas_ruas.excluido_por_uid IS 'UID do usuário que excluiu a demanda';
COMMENT ON COLUMN public.gbp_demandas_ruas.excluido_por_nome IS 'Nome do usuário que excluiu a demanda';
