-- Add empresa_id column to gbp_categorias_eleitor table
ALTER TABLE gbp_categorias_eleitor
ADD COLUMN empresa_id bigint REFERENCES gbp_empresas(id);

-- Create index for empresa_id on gbp_categorias_eleitor
CREATE INDEX idx_categorias_empresa_id ON gbp_categorias_eleitor(empresa_id);

-- Add empresa_id column to gbp_atendimentos table
ALTER TABLE gbp_atendimentos
ADD COLUMN empresa_id bigint REFERENCES gbp_empresas(id);

-- Create index for empresa_id on gbp_atendimentos
CREATE INDEX idx_atendimentos_empresa_id ON gbp_atendimentos(empresa_id);

-- Add empresa_id column to gbp_eleitores table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'gbp_eleitores' 
                  AND column_name = 'empresa_id') THEN
        ALTER TABLE gbp_eleitores
        ADD COLUMN empresa_id bigint REFERENCES gbp_empresas(id);
        
        CREATE INDEX idx_eleitores_empresa_id ON gbp_eleitores(empresa_id);
    END IF;
END $$;

-- Update existing records to set empresa_id (if needed)
UPDATE gbp_categorias_eleitor SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE gbp_atendimentos SET empresa_id = 1 WHERE empresa_id IS NULL;
UPDATE gbp_eleitores SET empresa_id = 1 WHERE empresa_id IS NULL;

-- Make empresa_id NOT NULL after setting default values
ALTER TABLE gbp_categorias_eleitor ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE gbp_atendimentos ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE gbp_eleitores ALTER COLUMN empresa_id SET NOT NULL;

-- Add foreign key constraints
ALTER TABLE gbp_categorias_eleitor
ADD CONSTRAINT fk_categorias_empresa
FOREIGN KEY (empresa_id)
REFERENCES gbp_empresas(id)
ON DELETE CASCADE;

ALTER TABLE gbp_atendimentos
ADD CONSTRAINT fk_atendimentos_empresa
FOREIGN KEY (empresa_id)
REFERENCES gbp_empresas(id)
ON DELETE CASCADE;

ALTER TABLE gbp_eleitores
ADD CONSTRAINT fk_eleitores_empresa
FOREIGN KEY (empresa_id)
REFERENCES gbp_empresas(id)
ON DELETE CASCADE;