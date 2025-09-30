-- Adicionar política para permitir leitura pública das demandas
CREATE POLICY "Permitir leitura pública das demandas" 
ON public.gbp_demandas_ruas
FOR SELECT 
USING (true);

-- Conceder permissão de leitura para usuários anônimos
GRANT SELECT ON public.gbp_demandas_ruas TO anon;
