-- Adiciona a coluna tipo à tabela gbp_categorias
ALTER TABLE gbp_categorias
ADD COLUMN tipo text DEFAULT 'Outros';

-- Atualiza registros existentes para ter um tipo padrão
UPDATE gbp_categorias
SET tipo = 'Outros'
WHERE tipo IS NULL;
