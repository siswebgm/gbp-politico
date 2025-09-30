-- Add status column to gbp_usuarios table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'gbp_usuarios' 
                  AND column_name = 'status') THEN
        ALTER TABLE gbp_usuarios
        ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';

        -- Add check constraint to ensure valid status values
        ALTER TABLE gbp_usuarios
        ADD CONSTRAINT chk_usuarios_status 
        CHECK (status IN ('active', 'blocked'));

        -- Create index for status column
        CREATE INDEX idx_usuarios_status ON gbp_usuarios(status);
    END IF;
END $$;