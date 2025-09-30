-- Drop existing table if it exists
DROP TABLE IF EXISTS gbp_form_config CASCADE;

-- Create the form_config table
CREATE TABLE gbp_form_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    categoria_id INTEGER NOT NULL,
    campos_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (categoria_id) REFERENCES gbp_categorias_eleitor(id) ON DELETE CASCADE
);

-- Create index for faster lookups
CREATE INDEX idx_form_config_categoria ON gbp_form_config(categoria_id);

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_form_config_updated_at
    BEFORE UPDATE ON gbp_form_config
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
