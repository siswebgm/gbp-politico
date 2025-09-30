-- Adiciona campos de tipo e categoria à tabela gbp_upload_history
ALTER TABLE gbp_upload_history
ADD COLUMN tipo VARCHAR(255),
ADD COLUMN categoria VARCHAR(255);
