-- Verifica os valores distintos de status na tabela
SELECT DISTINCT status, COUNT(*) as total
FROM public.gbp_demandas_ruas 
GROUP BY status
ORDER BY total DESC;

-- Verifica se há valores nulos
SELECT COUNT(*) as total_nulos
FROM public.gbp_demandas_ruas 
WHERE status IS NULL;
