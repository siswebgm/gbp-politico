-- Relatório de Demandas para a Empresa Atual (9475af96-553b-4a90-accb-39d46aedc6ce)

-- 1. Total de Demandas
SELECT 
    COUNT(*) AS total_demandas
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce';

-- 2. Demandas por Status
SELECT 
    status,
    COUNT(*) AS quantidade
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
GROUP BY 
    status
ORDER BY 
    quantidade DESC;

-- 3. Demandas com Documento Protocolado
SELECT 
    COUNT(*) AS total_com_documento
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
    AND documento_protocolado IS NOT NULL;

-- 4. Análise Detalhada das Demandas Concluídas
-- Verificar valores distintos nos campos relevantes
SELECT 
    'total_demandas' AS metric,
    COUNT(*) AS value
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'

UNION ALL

-- Verificar demandas com status 'concluido'
SELECT 
    'status_concluido' AS metric,
    COUNT(*) AS value
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
    AND status = 'concluido'

UNION ALL

-- Verificar demandas com demanda_concluida = true
SELECT 
    'demanda_concluida_true' AS metric,
    COUNT(*) AS value
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
    AND demanda_concluida = true

UNION ALL

-- Verificar demandas com data de conclusão preenchida
SELECT 
    'com_data_conclusao' AS metric,
    COUNT(*) AS value
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
    AND demanda_concluida_data IS NOT NULL;

-- Listar todas as demandas com seus status e datas
SELECT 
    uid,
    tipo_de_demanda,
    status,
    demanda_concluida,
    demanda_concluida_data,
    criado_em,
    atualizado_em
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
ORDER BY 
    criado_em DESC;

-- 5. Evolução Mensal (últimos 6 meses)
SELECT 
    TO_CHAR(DATE_TRUNC('month', criado_em), 'YYYY-MM') AS mes,
    COUNT(*) AS total
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
    AND criado_em >= DATE_TRUNC('month', NOW() - INTERVAL '6 months')
GROUP BY 
    DATE_TRUNC('month', criado_em)
ORDER BY 
    mes;

-- 6. Tipos de Demanda Mais Comuns
SELECT 
    tipo_de_demanda,
    COUNT(*) AS quantidade
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
GROUP BY 
    tipo_de_demanda
ORDER BY 
    quantidade DESC
LIMIT 5;

-- 7. Nível de Urgência
SELECT 
    nivel_de_urgencia,
    COUNT(*) AS quantidade
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
GROUP BY 
    nivel_de_urgencia
ORDER BY 
    CASE nivel_de_urgencia
        WHEN 'alta' THEN 1
        WHEN 'média' THEN 2
        WHEN 'baixa' THEN 3
    END;
