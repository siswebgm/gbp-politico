-- Create the form_config table
CREATE TABLE IF NOT EXISTS gbp_form_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    categoria_id INTEGER NOT NULL REFERENCES gbp_categorias_eleitor(id) ON DELETE CASCADE,
    campos_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_form_config_categoria ON gbp_form_config(categoria_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON gbp_form_config;

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON gbp_form_config
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- Set up RLS (Row Level Security)
ALTER TABLE gbp_form_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for authenticated users" ON gbp_form_config
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM gbp_categorias_eleitor c
            WHERE c.id = categoria_id
            AND c.empresa_id IN (
                SELECT empresa_id FROM gbp_usuarios_empresa WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Enable insert access for authenticated users" ON gbp_form_config
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM gbp_categorias_eleitor c
            WHERE c.id = categoria_id
            AND c.empresa_id IN (
                SELECT empresa_id FROM gbp_usuarios_empresa WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Enable update access for authenticated users" ON gbp_form_config
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM gbp_categorias_eleitor c
            WHERE c.id = categoria_id
            AND c.empresa_id IN (
                SELECT empresa_id FROM gbp_usuarios_empresa WHERE user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM gbp_categorias_eleitor c
            WHERE c.id = categoria_id
            AND c.empresa_id IN (
                SELECT empresa_id FROM gbp_usuarios_empresa WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Enable delete access for authenticated users" ON gbp_form_config
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM gbp_categorias_eleitor c
            WHERE c.id = categoria_id
            AND c.empresa_id IN (
                SELECT empresa_id FROM gbp_usuarios_empresa WHERE user_id = auth.uid()
            )
        )
    );
