-- 1. Contagem total de demandas
SELECT 
    'Total de Demandas' AS metrica,
    COUNT(*) AS valor
FROM 
    public.gbp_demandas_ruas
WHERE
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'

UNION ALL

-- 2. Demandas por status
SELECT 
    'Status: ' || status AS metrica,
    COUNT(*) AS valor
FROM 
    public.gbp_demandas_ruas
WHERE
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
GROUP BY 
    status

UNION ALL

-- 3. Demandas com documento protocolado
SELECT 
    'Com Documento Protocolado' AS metrica,
    COUNT(*) AS valor
FROM 
    public.gbp_demandas_ruas
WHERE
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce' AND
    documento_protocolado IS NOT NULL

UNION ALL

-- 4. Demandas concluídas
SELECT 
    'Demandas Concluídas' AS metrica,
    COUNT(*) AS valor
FROM 
    public.gbp_demandas_ruas
WHERE
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce' AND
    status = 'concluido'

UNION ALL

-- 5. Nível de urgência
SELECT 
    'Urgência: ' || nivel_de_urgencia AS metrica,
    COUNT(*) AS valor
FROM 
    public.gbp_demandas_ruas
WHERE
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
GROUP BY 
    nivel_de_urgencia

ORDER BY 
    CASE 
        WHEN metrica LIKE 'Total%' THEN 1
        WHEN metrica LIKE 'Status%' THEN 2
        WHEN metrica LIKE 'Com Documento%' THEN 3
        WHEN metrica LIKE 'Demandas Conclu%' THEN 4
        ELSE 5 
    END,
    metrica;
