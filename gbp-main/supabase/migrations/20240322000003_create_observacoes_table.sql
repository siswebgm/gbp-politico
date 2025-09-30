-- Create observacoes table
CREATE TABLE IF NOT EXISTS gbp_observacoes (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    atendimento_uid UUID NOT NULL REFERENCES gbp_atendimentos(uid) ON DELETE CASCADE,
    empresa_uid UUID NOT NULL REFERENCES gbp_empresas(uid) ON DELETE CASCADE,
    responsavel UUID NOT NULL REFERENCES gbp_usuarios(uid) ON DELETE CASCADE,
    observacao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_observacoes_atendimento_uid ON gbp_observacoes(atendimento_uid);
CREATE INDEX idx_observacoes_empresa_uid ON gbp_observacoes(empresa_uid);
CREATE INDEX idx_observacoes_responsavel ON gbp_observacoes(responsavel);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_observacoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_observacoes_timestamp
    BEFORE UPDATE ON gbp_observacoes
    FOR EACH ROW
    EXECUTE FUNCTION update_observacoes_updated_at(); 