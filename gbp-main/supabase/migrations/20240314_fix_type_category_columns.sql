-- Remove as colunas antigas
ALTER TABLE gbp_upload_history
DROP COLUMN IF EXISTS tipo,
DROP COLUMN IF EXISTS categoria;

-- Adiciona as novas colunas com foreign keys
ALTER TABLE gbp_upload_history
ADD COLUMN tipo_uid UUID REFERENCES gbp_categoria_tipos(uid),
ADD COLUMN categoria_uid UUID REFERENCES gbp_categorias(uid);
