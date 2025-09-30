-- Remove auth_id column from gbp_usuarios table
ALTER TABLE gbp_usuarios
DROP COLUMN IF EXISTS auth_id; 