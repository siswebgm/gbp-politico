-- Drop existing constraints if they exist
ALTER TABLE IF EXISTS gbp_atendimentos 
DROP CONSTRAINT IF EXISTS fk_atendimentos_empresa,
DROP CONSTRAINT IF EXISTS fk_atendimentos_categoria;

-- Add empresa_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'gbp_atendimentos' 
                  AND column_name = 'empresa_id') THEN
        ALTER TABLE gbp_atendimentos
        ADD COLUMN empresa_id bigint REFERENCES gbp_empresas(id);
    END IF;
END $$;

-- Create attendance categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS gbp_categorias_atendimento (
    id BIGSERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    empresa_id BIGINT NOT NULL REFERENCES gbp_empresas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(nome, empresa_id)
);

-- Update attendance table structure
ALTER TABLE gbp_atendimentos
ALTER COLUMN empresa_id SET NOT NULL,
ALTER COLUMN data_atendimento SET DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_atendimentos_empresa_id ON gbp_atendimentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_atendimento_empresa_id ON gbp_categorias_atendimento(empresa_id);

-- Add foreign key constraints
ALTER TABLE gbp_atendimentos
ADD CONSTRAINT fk_atendimentos_empresa
FOREIGN KEY (empresa_id)
REFERENCES gbp_empresas(id)
ON DELETE CASCADE;

ALTER TABLE gbp_atendimentos
ADD CONSTRAINT fk_atendimentos_categoria
FOREIGN KEY (categoria_id)
REFERENCES gbp_categorias_atendimento(id)
ON DELETE SET NULL;