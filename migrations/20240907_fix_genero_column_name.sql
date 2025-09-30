-- Corrige o nome da coluna gereno para genero na tabela gbp_demandas_ruas
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'gbp_demandas_ruas' AND column_name = 'gereno') THEN
        ALTER TABLE public.gbp_demandas_ruas RENAME COLUMN gereno TO genero;
    END IF;
END $$;
