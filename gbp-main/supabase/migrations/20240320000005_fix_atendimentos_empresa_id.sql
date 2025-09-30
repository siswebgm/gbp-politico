-- Fix empresa_id column type in gbp_atendimentos
ALTER TABLE gbp_atendimentos
ALTER COLUMN empresa_id TYPE bigint USING empresa_id::bigint;

-- Make empresa_id NOT NULL and add foreign key constraint
ALTER TABLE gbp_atendimentos
ALTER COLUMN empresa_id SET NOT NULL,
ADD CONSTRAINT fk_atendimentos_empresa
FOREIGN KEY (empresa_id)
REFERENCES gbp_empresas(id)
ON DELETE CASCADE;