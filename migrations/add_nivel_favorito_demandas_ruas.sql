-- Adicionar coluna nivel_favorito na tabela gbp_demandas_ruas
-- Níveis: 0 = não favorito, 1-5 = níveis de prioridade

ALTER TABLE gbp_demandas_ruas 
ADD COLUMN IF NOT EXISTS nivel_favorito INTEGER DEFAULT 0;

-- Adicionar comentário na coluna
COMMENT ON COLUMN gbp_demandas_ruas.nivel_favorito IS 'Nível de prioridade do favorito: 0=não favorito, 1=baixa, 2=média-baixa, 3=média, 4=média-alta, 5=alta/urgente';

-- Criar índice para melhorar performance de consultas por nível
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_nivel_favorito 
ON gbp_demandas_ruas(nivel_favorito) 
WHERE nivel_favorito > 0;

-- Migrar dados existentes: se favorito = true, definir nivel_favorito = 3 (média)
UPDATE gbp_demandas_ruas 
SET nivel_favorito = 3 
WHERE favorito = true AND (nivel_favorito IS NULL OR nivel_favorito = 0);
