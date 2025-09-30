-- Transferir dados da tabela antiga para a nova
INSERT INTO gbp_categorias (nome, descricao, empresa_uid, created_at)
SELECT nome, descricao, empresa_uid, created_at
FROM gbp_categorias_eleitor;

-- Remover a tabela antiga
DROP TABLE IF EXISTS gbp_categorias_eleitor CASCADE;

-- Atualizar a constraint na tabela de eleitores
ALTER TABLE IF EXISTS gbp_eleitores 
DROP CONSTRAINT IF EXISTS fk_eleitores_categoria;

ALTER TABLE IF EXISTS gbp_eleitores
ADD CONSTRAINT fk_eleitores_categoria
FOREIGN KEY (categoria_id)
REFERENCES gbp_categorias(id)
ON DELETE SET NULL;

-- Atualizar o índice se existir
DROP INDEX IF EXISTS idx_eleitores_categoria_id;
CREATE INDEX idx_eleitores_categoria_id ON gbp_eleitores(categoria_id); 