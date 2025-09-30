-- Create resultados_eleitorais table
CREATE TABLE IF NOT EXISTS gbp_resultados_eleitorais (
    id BIGSERIAL PRIMARY KEY,
    empresa_id BIGINT NOT NULL REFERENCES gbp_empresas(id),
    aa_eleicao TEXT NOT NULL,
    nr_zona TEXT NOT NULL,
    nr_secao TEXT NOT NULL,
    nr_local_votacao TEXT NOT NULL,
    nm_local_votacao TEXT NOT NULL,
    qt_votos INTEGER NOT NULL DEFAULT 0,
    qt_aptos INTEGER NOT NULL DEFAULT 0,
    qt_comparecimento INTEGER NOT NULL DEFAULT 0,
    qt_abstencoes INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create trigger to update updated_at
CREATE TRIGGER update_gbp_resultados_eleitorais_updated_at
    BEFORE UPDATE ON gbp_resultados_eleitorais
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_resultados_empresa_id ON gbp_resultados_eleitorais(empresa_id);
CREATE INDEX IF NOT EXISTS idx_resultados_aa_eleicao ON gbp_resultados_eleitorais(aa_eleicao);
CREATE INDEX IF NOT EXISTS idx_resultados_zona_secao ON gbp_resultados_eleitorais(nr_zona, nr_secao);

-- Create RLS policies
ALTER TABLE gbp_resultados_eleitorais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company's resultados"
    ON gbp_resultados_eleitorais FOR SELECT
    USING (auth.uid() IN (
        SELECT id FROM gbp_usuarios WHERE empresa_id = gbp_resultados_eleitorais.empresa_id
    ));

CREATE POLICY "Users can insert resultados for their company"
    ON gbp_resultados_eleitorais FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT id FROM gbp_usuarios WHERE empresa_id = gbp_resultados_eleitorais.empresa_id
    ));

CREATE POLICY "Users can update their company's resultados"
    ON gbp_resultados_eleitorais FOR UPDATE
    USING (auth.uid() IN (
        SELECT id FROM gbp_usuarios WHERE empresa_id = gbp_resultados_eleitorais.empresa_id
    ))
    WITH CHECK (auth.uid() IN (
        SELECT id FROM gbp_usuarios WHERE empresa_id = gbp_resultados_eleitorais.empresa_id
    ));

CREATE POLICY "Users can delete their company's resultados"
    ON gbp_resultados_eleitorais FOR DELETE
    USING (auth.uid() IN (
        SELECT id FROM gbp_usuarios WHERE empresa_id = gbp_resultados_eleitorais.empresa_id
    ));
