-- Add empresa_id column to gbp_atendimentos table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'gbp_atendimentos' 
                  AND column_name = 'empresa_id') THEN
        ALTER TABLE gbp_atendimentos
        ADD COLUMN empresa_id bigint REFERENCES gbp_empresas(id);
        
        -- Create index for empresa_id
        CREATE INDEX idx_atendimentos_empresa_id ON gbp_atendimentos(empresa_id);
        
        -- Add foreign key constraint
        ALTER TABLE gbp_atendimentos
        ADD CONSTRAINT fk_atendimentos_empresa
        FOREIGN KEY (empresa_id)
        REFERENCES gbp_empresas(id)
        ON DELETE CASCADE;
        
        -- Make empresa_id NOT NULL
        ALTER TABLE gbp_atendimentos ALTER COLUMN empresa_id SET NOT NULL;
    END IF;
END $$;