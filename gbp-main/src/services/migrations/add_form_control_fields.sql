-- Add new columns to gbp_form_config
ALTER TABLE gbp_form_config
ADD COLUMN IF NOT EXISTS max_registrations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing rows to have default values
UPDATE gbp_form_config
SET max_registrations = 0,
    is_active = true
WHERE max_registrations IS NULL
   OR is_active IS NULL;
