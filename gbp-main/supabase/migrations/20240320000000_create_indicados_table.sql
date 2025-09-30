-- Create table for indicados
CREATE TABLE IF NOT EXISTS gbp_indicados (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cpf VARCHAR(11) UNIQUE,
  cidade VARCHAR(255),
  bairro VARCHAR(255),
  empresa_id BIGINT NOT NULL REFERENCES gbp_empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_indicados_empresa_id ON gbp_indicados(empresa_id);
CREATE INDEX idx_indicados_cpf ON gbp_indicados(cpf);

-- Add foreign key to eleitores table
ALTER TABLE gbp_eleitores
ADD COLUMN indicado_id BIGINT REFERENCES gbp_indicados(id) ON DELETE SET NULL;