-- Add empresa_id column to gbp_categorias_eleitor table
ALTER TABLE gbp_categorias_eleitor
ADD COLUMN empresa_id bigint NOT NULL REFERENCES gbp_empresas(id);

-- Create index for empresa_id
CREATE INDEX idx_categorias_empresa_id ON gbp_categorias_eleitor(empresa_id);

-- Add foreign key constraint
ALTER TABLE gbp_categorias_eleitor
ADD CONSTRAINT fk_categorias_empresa
FOREIGN KEY (empresa_id)
REFERENCES gbp_empresas(id)
ON DELETE CASCADE;