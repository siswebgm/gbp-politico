-- Cria uma sequência para gerar IDs únicos para upload_history_uid
CREATE SEQUENCE IF NOT EXISTS gbp_upload_history_seq;

-- Define o valor inicial da sequência para ser maior que o último ID usado
SELECT setval('gbp_upload_history_seq', COALESCE((SELECT MAX(upload_history_uid) FROM gbp_upload_history), 0) + 1);

-- Modifica a coluna upload_history_uid para usar a sequência como valor padrão
ALTER TABLE gbp_upload_history
ALTER COLUMN upload_history_uid SET DEFAULT nextval('gbp_upload_history_seq');
