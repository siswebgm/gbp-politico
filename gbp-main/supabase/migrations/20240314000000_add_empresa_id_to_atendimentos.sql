-- Add empresa_id column to gbp_atendimentos table
ALTER TABLE gbp_atendimentos
ADD COLUMN empresa_id bigint NOT NULL REFERENCES gbp_empresas(id);

-- Create index for empresa_id
CREATE INDEX idx_atendimentos_empresa_id ON gbp_atendimentos(empresa_id);

-- Add foreign key constraint
ALTER TABLE gbp_atendimentos
ADD CONSTRAINT fk_atendimentos_empresa
FOREIGN KEY (empresa_id)
REFERENCES gbp_empresas(id)
ON DELETE CASCADE;