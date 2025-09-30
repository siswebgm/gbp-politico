-- Add status and last access columns to users table
ALTER TABLE gbp_usuarios
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked')),
ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP WITH TIME ZONE;

-- Create index for status column
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON gbp_usuarios(status);

-- Update existing users to have active status
UPDATE gbp_usuarios SET status = 'active' WHERE status IS NULL;

-- Add trigger to update ultimo_acesso on login
CREATE OR REPLACE FUNCTION update_ultimo_acesso()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ultimo_acesso = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_ultimo_acesso ON gbp_usuarios;
CREATE TRIGGER tr_update_ultimo_acesso
    BEFORE UPDATE ON gbp_usuarios
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION update_ultimo_acesso();