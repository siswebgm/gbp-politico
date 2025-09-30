-- Add last_access column to users table
ALTER TABLE gbp_usuarios
ADD COLUMN IF NOT EXISTS ultimo_acesso TIMESTAMP WITH TIME ZONE;

-- Create index for last_access
CREATE INDEX IF NOT EXISTS idx_usuarios_ultimo_acesso ON gbp_usuarios(ultimo_acesso);