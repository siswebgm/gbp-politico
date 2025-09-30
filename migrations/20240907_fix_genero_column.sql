-- Script para corrigir o nome da coluna 'gereno' para 'genero' na tabela gbp_demandas_ruas
DO $$
BEGIN
    -- Verifica se a coluna 'gereno' existe e se a coluna 'genero' não existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'gbp_demandas_ruas' 
        AND column_name = 'gereno'
    ) AND NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'gbp_demandas_ruas' 
        AND column_name = 'genero'
    ) THEN
        -- Renomeia a coluna de 'gereno' para 'genero'
        ALTER TABLE public.gbp_demandas_ruas RENAME COLUMN gereno TO genero;
        RAISE NOTICE 'Coluna renomeada de "gereno" para "genero" na tabela gbp_demandas_ruas';
    ELSE
        RAISE NOTICE 'A coluna "gereno" não existe ou a coluna "genero" já existe. Nenhuma alteração necessária.';
    END IF;
END $$;
