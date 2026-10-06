-- Adicionar coluna numero à tabela gbp_eleitores se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'gbp_eleitores' 
        AND column_name = 'numero'
    ) THEN
        ALTER TABLE gbp_eleitores
        ADD COLUMN IF NOT EXISTS numero TEXT;
        
        RAISE NOTICE 'Coluna numero adicionada à tabela gbp_eleitores';
    ELSE
        RAISE NOTICE 'Coluna numero já existe na tabela gbp_eleitores';
    END IF;
END $$;

-- Criar índice para melhorar performance
CREATE INDEX IF NOT EXISTS idx_eleitores_numero ON gbp_eleitores(numero);
