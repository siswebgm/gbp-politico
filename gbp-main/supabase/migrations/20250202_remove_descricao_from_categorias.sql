-- Remove a coluna descricao da tabela gbp_categorias
ALTER TABLE IF EXISTS gbp_categorias 
  DROP COLUMN IF EXISTS descricao;
