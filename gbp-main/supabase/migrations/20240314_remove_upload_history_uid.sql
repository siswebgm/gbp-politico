-- Remove a coluna upload_history_uid da tabela gbp_upload_history
ALTER TABLE gbp_upload_history
DROP COLUMN IF EXISTS upload_history_uid;
