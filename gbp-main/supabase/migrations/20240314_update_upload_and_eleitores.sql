-- Remove as colunas antigas da tabela gbp_upload_history
ALTER TABLE gbp_upload_history
DROP COLUMN IF EXISTS tipo,
DROP COLUMN IF EXISTS categoria;

-- Adiciona as novas colunas com foreign keys na tabela gbp_upload_history
ALTER TABLE gbp_upload_history
ADD COLUMN tipo_uid UUID REFERENCES gbp_categoria_tipos(uid),
ADD COLUMN categoria_uid UUID REFERENCES gbp_categorias(uid);

-- Adiciona a coluna categoria_uid à tabela gbp_eleitores
ALTER TABLE gbp_eleitores
ADD COLUMN IF NOT EXISTS categoria_uid UUID REFERENCES gbp_categorias(uid);
