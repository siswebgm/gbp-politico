-- Altera a coluna upload_history_uid para permitir valores nulos
ALTER TABLE gbp_upload_history
ALTER COLUMN upload_history_uid DROP NOT NULL;
