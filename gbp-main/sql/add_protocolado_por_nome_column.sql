-- Adicionar coluna protocolado_por_nome na tabela gbp_demandas_ruas
-- Esta coluna armazena o nome do usuário que protocolou a demanda

ALTER TABLE gbp_demandas_ruas 
ADD COLUMN IF NOT EXISTS protocolado_por_nome TEXT;

-- Adicionar comentário na coluna para documentação
COMMENT ON COLUMN gbp_demandas_ruas.protocolado_por_nome IS 'Nome do usuário que protocolou a demanda';
