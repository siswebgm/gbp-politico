-- Primeiro, atualiza todos os registros com status antigos para 'recebido'
UPDATE public.gbp_demandas_ruas 
SET status = 'recebido' 
WHERE status NOT IN ('recebido', 'feito_oficio', 'protocolado', 'aguardando', 'concluido', 'cancelado');

-- Verifica se ainda existem registros com status inválidos
SELECT uid, status 
FROM public.gbp_demandas_ruas 
WHERE status NOT IN ('recebido', 'feito_oficio', 'protocolado', 'aguardando', 'concluido', 'cancelado');

-- Se a consulta acima retornar linhas, você pode precisar de uma abordagem mais específica
-- para esses registros antes de prosseguir com a alteração da restrição.
