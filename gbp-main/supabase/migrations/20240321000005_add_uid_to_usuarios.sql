-- Add uid column to gbp_usuarios table
ALTER TABLE gbp_usuarios
ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();

-- Update existing rows with new UIDs
UPDATE gbp_usuarios
SET uid = gen_random_uuid()
WHERE uid IS NULL;

-- Make uid not null
ALTER TABLE gbp_usuarios
ALTER COLUMN uid SET NOT NULL;

-- Create index for uid
CREATE INDEX IF NOT EXISTS idx_usuarios_uid ON gbp_usuarios(uid);

-- Add unique constraint for uid
ALTER TABLE gbp_usuarios
ADD CONSTRAINT gbp_usuarios_uid_key UNIQUE (uid);

-- Update foreign key in gbp_eleitores
ALTER TABLE gbp_eleitores
DROP CONSTRAINT IF EXISTS gbp_eleitores_usuario_uid_fkey;

ALTER TABLE gbp_eleitores
ADD CONSTRAINT gbp_eleitores_usuario_uid_fkey
FOREIGN KEY (usuario_uid)
REFERENCES gbp_usuarios(uid)
ON DELETE SET NULL; 