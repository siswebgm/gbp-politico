-- Drop existing constraints if they exist
ALTER TABLE IF EXISTS gbp_usuarios 
DROP CONSTRAINT IF EXISTS chk_usuarios_status,
DROP CONSTRAINT IF EXISTS chk_usuarios_nivel_acesso;

-- Recreate the users table with proper structure
CREATE TABLE IF NOT EXISTS gbp_usuarios (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    nivel_acesso VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    empresa_id BIGINT NOT NULL REFERENCES gbp_empresas(id) ON DELETE CASCADE,
    ultimo_acesso TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Add constraints
    CONSTRAINT chk_usuarios_nivel_acesso CHECK (nivel_acesso IN ('admin', 'attendant')),
    CONSTRAINT chk_usuarios_status CHECK (status IN ('active', 'blocked'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_usuarios_empresa_id ON gbp_usuarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON gbp_usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_status ON gbp_usuarios(status);
CREATE INDEX IF NOT EXISTS idx_usuarios_nivel_acesso ON gbp_usuarios(nivel_acesso);

-- Create function to update ultimo_acesso
CREATE OR REPLACE FUNCTION update_usuario_ultimo_acesso()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ultimo_acesso = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ultimo_acesso
DROP TRIGGER IF EXISTS tr_update_usuario_ultimo_acesso ON gbp_usuarios;
CREATE TRIGGER tr_update_usuario_ultimo_acesso
    BEFORE UPDATE ON gbp_usuarios
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION update_usuario_ultimo_acesso();