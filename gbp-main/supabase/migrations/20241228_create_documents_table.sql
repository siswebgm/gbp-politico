-- Create documents table
CREATE TABLE IF NOT EXISTS gbp_documentos (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    author TEXT NOT NULL,
    empresa_id BIGINT NOT NULL REFERENCES gbp_empresas(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gbp_documentos_updated_at
    BEFORE UPDATE ON gbp_documentos
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_documentos_empresa_id ON gbp_documentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_documentos_type ON gbp_documentos(type);
CREATE INDEX IF NOT EXISTS idx_documentos_status ON gbp_documentos(status);

-- Create RLS policies
ALTER TABLE gbp_documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's documents"
    ON gbp_documentos FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM gbp_usuarios WHERE empresa_id = gbp_documentos.empresa_id
    ));

CREATE POLICY "Users can insert documents for their company"
    ON gbp_documentos FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT id FROM gbp_usuarios WHERE empresa_id = gbp_documentos.empresa_id
    ));

CREATE POLICY "Users can update their company's documents"
    ON gbp_documentos FOR UPDATE
    USING (auth.uid() IN (
        SELECT id FROM gbp_usuarios WHERE empresa_id = gbp_documentos.empresa_id
    ))
    WITH CHECK (auth.uid() IN (
        SELECT id FROM gbp_usuarios WHERE empresa_id = gbp_documentos.empresa_id
    ));

CREATE POLICY "Users can delete their company's documents"
    ON gbp_documentos FOR DELETE
    USING (auth.uid() IN (
        SELECT id FROM gbp_usuarios WHERE empresa_id = gbp_documentos.empresa_id
    ));
