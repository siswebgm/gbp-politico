-- 1. Primeiro, desativa temporariamente os gatilhos
ALTER TABLE public.gbp_demandas_ruas DISABLE TRIGGER ALL;

-- 2. Remove a restrição de verificação se existir
ALTER TABLE public.gbp_demandas_ruas 
DROP CONSTRAINT IF EXISTS gbp_demandas_ruas_status_check;

-- 3. Cria uma tabela temporária com os dados atuais
CREATE TEMP TABLE temp_demandas_status AS
SELECT uid, status FROM public.gbp_demandas_ruas;

-- 4. Mostra os valores distintos de status atuais
SELECT 'Status atuais antes da migração:', status, COUNT(*) as total
FROM temp_demandas_status
GROUP BY status;

-- 5. Atualiza os status na tabela temporária
UPDATE temp_demandas_status
SET status = CASE 
    WHEN status = 'pendente' THEN 'recebido'
    WHEN status = 'em_andamento' THEN 'aguardando'
    WHEN status IS NULL THEN 'recebido'
    ELSE status
END;

-- 6. Verifica se ainda existem status inválidos
SELECT 'Status inválidos encontrados:', status, COUNT(*) as total
FROM temp_demandas_status
WHERE status NOT IN ('recebido', 'feito_oficio', 'protocolado', 'aguardando', 'concluido', 'cancelado')
GROUP BY status;

-- 7. Força a atualização para 'recebido' para qualquer status inválido restante
UPDATE temp_demandas_status
SET status = 'recebido'
WHERE status NOT IN ('recebido', 'feito_oficio', 'protocolado', 'aguardando', 'concluido', 'cancelado');

-- 8. Atualiza a tabela original com os valores corrigidos
UPDATE public.gbp_demandas_ruas d
SET status = t.status
FROM temp_demandas_status t
WHERE d.uid = t.uid;

-- 9. Remove a tabela temporária
DROP TABLE temp_demandas_status;

-- 10. Adiciona a nova restrição de verificação
ALTER TABLE public.gbp_demandas_ruas
ADD CONSTRAINT gbp_demandas_ruas_status_check 
CHECK (status IN ('recebido', 'feito_oficio', 'protocolado', 'aguardando', 'concluido', 'cancelado'));

-- 11. Define o valor padrão
ALTER TABLE public.gbp_demandas_ruas 
ALTER COLUMN status SET DEFAULT 'recebido';

-- 12. Atualiza o comentário
COMMENT ON COLUMN public.gbp_demandas_ruas.status 
IS 'Status atual da demanda (recebido, feito_oficio, protocolado, aguardando, concluido, cancelado)';

-- 13. Reativa os gatilhos
ALTER TABLE public.gbp_demandas_ruas ENABLE TRIGGER ALL;

-- 14. Verifica o resultado final
SELECT 'Status após migração:', status, COUNT(*) as total
FROM public.gbp_demandas_ruas
GROUP BY status
ORDER BY total DESC;
