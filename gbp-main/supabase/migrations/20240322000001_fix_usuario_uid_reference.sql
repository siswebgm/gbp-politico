-- Drop existing foreign key constraint if it exists
ALTER TABLE gbp_eleitores
DROP CONSTRAINT IF EXISTS gbp_eleitores_usuario_uid_fkey;

-- Add new foreign key constraint
ALTER TABLE gbp_eleitores
ADD CONSTRAINT gbp_eleitores_usuario_uid_fkey
FOREIGN KEY (usuario_uid)
REFERENCES gbp_usuarios(uid)
ON DELETE SET NULL; 