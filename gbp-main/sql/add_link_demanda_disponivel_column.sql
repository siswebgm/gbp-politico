-- Adicionar coluna link_demanda_disponivel na tabela gbp_empresas
ALTER TABLE gbp_empresas
ADD COLUMN IF NOT EXISTS link_demanda_disponivel BOOLEAN DEFAULT true;

-- Comentário sobre a coluna
COMMENT ON COLUMN gbp_empresas.link_demanda_disponivel IS 'Controla se o link público de demandas está disponível para acesso público';
