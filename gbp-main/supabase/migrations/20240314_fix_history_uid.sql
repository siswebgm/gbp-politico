-- Permite que a coluna upload_history_uid seja nula
ALTER TABLE gbp_upload_history
ALTER COLUMN upload_history_uid DROP NOT NULL;
