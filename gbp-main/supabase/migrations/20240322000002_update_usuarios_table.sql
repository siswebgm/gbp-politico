-- Drop existing table if it exists
DROP TABLE IF EXISTS gbp_usuarios CASCADE;

-- Create cargo enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE cargo_enum AS ENUM ('admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table with correct structure
CREATE TABLE gbp_usuarios (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    contato VARCHAR(255),
    cargo cargo_enum NOT NULL,
    nivel_acesso VARCHAR(20) NOT NULL,
    permissoes TEXT[] DEFAULT ARRAY[]::TEXT[],
    empresa_uid UUID NOT NULL REFERENCES gbp_empresas(uid) ON DELETE CASCADE,
    ultimo_acesso TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    
    -- Add constraints
    CONSTRAINT chk_usuarios_nivel_acesso CHECK (nivel_acesso IN ('admin', 'attendant')),
    CONSTRAINT chk_usuarios_status CHECK (status IN ('active', 'blocked', 'pending'))
);

-- Create indexes for better query performance
CREATE INDEX idx_usuarios_empresa_uid ON gbp_usuarios(empresa_uid);
CREATE INDEX idx_usuarios_email ON gbp_usuarios(email);
CREATE INDEX idx_usuarios_status ON gbp_usuarios(status);
CREATE INDEX idx_usuarios_nivel_acesso ON gbp_usuarios(nivel_acesso);
CREATE INDEX idx_usuarios_cargo ON gbp_usuarios(cargo);

-- Create function to update permissions based on cargo
CREATE OR REPLACE FUNCTION update_permissions_on_cargo_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Set default permissions based on cargo
    IF NEW.cargo = 'admin' THEN
        NEW.permissoes = ARRAY['all'];
    ELSIF NEW.cargo = 'editor' THEN
        NEW.permissoes = ARRAY['edit', 'view'];
    ELSIF NEW.cargo = 'viewer' THEN
        NEW.permissoes = ARRAY['view'];
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for permissions update
DROP TRIGGER IF EXISTS update_permissions_trigger ON gbp_usuarios;
CREATE TRIGGER update_permissions_trigger
    BEFORE INSERT OR UPDATE OF cargo ON gbp_usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_permissions_on_cargo_change();

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