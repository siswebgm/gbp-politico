-- Add genero column to gbp_demandas_ruas table
ALTER TABLE public.gbp_demandas_ruas 
ADD COLUMN genero TEXT 
CONSTRAINT gbp_demandas_ruas_genero_check 
CHECK (genero IS NULL OR genero IN ('masculino', 'feminino', 'outro', 'prefiro_nao_informar'));

-- Add a comment to explain the column
COMMENT ON COLUMN public.gbp_demandas_ruas.genero IS 'Gênero do requerente: masculino, feminino, outro, prefiro_nao_informar';
