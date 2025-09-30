-- Remove status column and related constraints
ALTER TABLE IF EXISTS gbp_usuarios 
DROP COLUMN IF EXISTS status CASCADE;

-- Drop status-related indexes if they exist
DROP INDEX IF EXISTS idx_usuarios_status;