-- Adiciona a coluna categoria_uid à tabela gbp_eleitores
ALTER TABLE gbp_eleitores
ADD COLUMN IF NOT EXISTS categoria_uid UUID REFERENCES gbp_categorias(uid);
