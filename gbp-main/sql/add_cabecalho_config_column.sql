-- Adiciona coluna cabecalho_config na tabela gbp_demanda_tipo
-- Esta coluna armazena a configuração de personalização visual do formulário público

DO $$
BEGIN
    -- Verifica se a coluna já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'gbp_demanda_tipo' 
        AND column_name = 'cabecalho_config'
    ) THEN
        ALTER TABLE gbp_demanda_tipo 
        ADD COLUMN cabecalho_config JSONB;
        
        RAISE NOTICE 'Coluna cabecalho_config adicionada com sucesso à tabela gbp_demanda_tipo';
    ELSE
        RAISE NOTICE 'Coluna cabecalho_config já existe na tabela gbp_demanda_tipo';
    END IF;
END $$;
