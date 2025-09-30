-- Adiciona a coluna tipo_uid
ALTER TABLE gbp_categorias 
ADD COLUMN tipo_uid UUID REFERENCES gbp_categoria_tipos(uid) ON DELETE SET NULL;

-- Migra os dados existentes
WITH tipos_por_empresa AS (
  SELECT DISTINCT ON (nome, empresa_uid) 
    uid as tipo_uid,
    nome,
    empresa_uid
  FROM gbp_categoria_tipos
)
UPDATE gbp_categorias c
SET tipo_uid = t.tipo_uid
FROM tipos_por_empresa t
WHERE c.tipo = t.nome
AND c.empresa_uid = t.empresa_uid;

-- Remove a coluna tipo antiga
ALTER TABLE gbp_categorias DROP COLUMN tipo;
