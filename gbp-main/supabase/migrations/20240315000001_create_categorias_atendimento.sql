-- Create categories table for attendances
CREATE TABLE IF NOT EXISTS gbp_categorias_atendimento (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    empresa_id BIGINT NOT NULL REFERENCES gbp_empresas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nome, empresa_id)
);

-- Create index for empresa_id
CREATE INDEX IF NOT EXISTS idx_categorias_atendimento_empresa_id ON gbp_categorias_atendimento(empresa_id);

-- Update attendance table to reference the new categories table
ALTER TABLE gbp_atendimentos 
DROP CONSTRAINT IF EXISTS fk_atendimentos_categoria;

ALTER TABLE gbp_atendimentos
ADD CONSTRAINT fk_atendimentos_categoria
FOREIGN KEY (categoria_id)
REFERENCES gbp_categorias_atendimento(id)
ON DELETE SET NULL;