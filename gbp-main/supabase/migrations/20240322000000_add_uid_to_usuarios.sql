-- Create cargo enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE cargo_enum AS ENUM ('admin', 'editor', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Drop existing primary key constraint if it exists
ALTER TABLE gbp_usuarios 
DROP CONSTRAINT IF EXISTS gbp_usuarios_pkey;

-- Add uid column if it doesn't exist
ALTER TABLE gbp_usuarios
ADD COLUMN IF NOT EXISTS uid UUID NOT NULL DEFAULT gen_random_uuid();

-- Set uid as primary key
ALTER TABLE gbp_usuarios
ADD CONSTRAINT gbp_usuarios_pkey PRIMARY KEY (uid);

-- Add cargo validation
ALTER TABLE gbp_usuarios
ADD CONSTRAINT valid_cargo CHECK (
    (cargo)::cargo_enum = ANY (ARRAY['admin'::cargo_enum, 'editor'::cargo_enum, 'viewer'::cargo_enum])
);

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

-- Create index for uid
CREATE INDEX IF NOT EXISTS idx_usuarios_uid ON gbp_usuarios(uid);

-- Add unique constraint for uid
ALTER TABLE gbp_usuarios
ADD CONSTRAINT gbp_usuarios_uid_key UNIQUE (uid); 