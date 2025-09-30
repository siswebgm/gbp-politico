-- Fix empresa_id column type in gbp_atendimentos table
ALTER TABLE gbp_atendimentos 
ALTER COLUMN empresa_id TYPE bigint USING empresa_id::bigint;

-- Add NOT NULL constraint
ALTER TABLE gbp_atendimentos 
ALTER COLUMN empresa_id SET NOT NULL;

-- Add foreign key constraint
ALTER TABLE gbp_atendimentos
ADD CONSTRAINT fk_atendimentos_empresa
FOREIGN KEY (empresa_id)
REFERENCES gbp_empresas(id)
ON DELETE CASCADE;

-- Make other required columns NOT NULL
ALTER TABLE gbp_atendimentos
ALTER COLUMN eleitor_id SET NOT NULL,
ALTER COLUMN usuario_id SET NOT NULL,
ALTER COLUMN descricao SET NOT NULL;