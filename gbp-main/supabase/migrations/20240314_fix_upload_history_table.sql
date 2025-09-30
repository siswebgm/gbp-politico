-- Verifica se a coluna upload_history_uid existe e a remove
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'gbp_upload_history' 
        AND column_name = 'upload_history_uid'
    ) THEN
        ALTER TABLE gbp_upload_history DROP COLUMN upload_history_uid;
    END IF;
END $$;
