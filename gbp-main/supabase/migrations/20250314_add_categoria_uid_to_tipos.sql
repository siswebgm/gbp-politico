-- Adicionar coluna categoria_uid à tabela gbp_categoria_tipos
ALTER TABLE gbp_categoria_tipos 
ADD COLUMN categoria_uid UUID REFERENCES gbp_categorias(uid) ON DELETE CASCADE;

-- Atualizar os tipos existentes para associá-los às categorias correspondentes
UPDATE gbp_categoria_tipos t
SET categoria_uid = (
    SELECT c.uid 
    FROM gbp_categorias c 
    WHERE c.empresa_uid = t.empresa_uid 
    AND c.nome = t.nome
    LIMIT 1
);
