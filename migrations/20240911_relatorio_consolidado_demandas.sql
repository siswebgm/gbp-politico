-- Relatório Consolidado de Demandas
-- Data de geração: 11/09/2025

-- Primeiro, criamos uma tabela temporária para armazenar os parâmetros
CREATE TEMP TABLE IF NOT EXISTS temp_parametros AS
SELECT 
  '2025-01-01'::date AS data_inicio,
  '2025-12-31'::date AS data_fim;

-- Consulta principal
WITH dados AS (
  SELECT 
    *,
    (SELECT data_inicio FROM temp_parametros) AS inicio_periodo,
    (SELECT data_fim FROM temp_parametros) AS fim_periodo
  FROM public.gbp_demandas_ruas
  WHERE criado_em BETWEEN (SELECT data_inicio FROM temp_parametros) AND (SELECT data_fim FROM temp_parametros)
)

SELECT 
  -- Total de demandas no período
  (SELECT COUNT(*) FROM dados) AS total_demandas_periodo,
  
  -- Demandas por status
  (SELECT COUNT(*) FROM dados WHERE status = 'pendente') AS pendentes,
  (SELECT COUNT(*) FROM dados WHERE status = 'em_andamento') AS em_andamento,
  (SELECT COUNT(*) FROM dados WHERE status = 'concluido') AS concluidas,
  (SELECT COUNT(*) FROM dados WHERE status = 'cancelado') AS canceladas,
  
  -- Documentos protocolados
  (SELECT COUNT(*) FROM dados WHERE documento_protocolado IS NOT NULL) AS com_documento_protocolado,
  (SELECT COUNT(*) FROM dados WHERE documento_protocolado IS NULL OR documento_protocolado = '') AS sem_documento_protocolado,
  
  -- Nível de urgência
  (SELECT COUNT(*) FROM dados WHERE nivel_de_urgencia = 'baixa') AS baixa_urgencia,
  (SELECT COUNT(*) FROM dados WHERE nivel_de_urgencia = 'média') AS media_urgencia,
  (SELECT COUNT(*) FROM dados WHERE nivel_de_urgencia = 'alta') AS alta_urgencia,
  
  -- Média de conclusão
  (SELECT ROUND(AVG(EXTRACT(DAY FROM (demanda_concluida_data - criado_em))), 1) 
   FROM dados 
   WHERE demanda_concluida = true) AS media_dias_conclusao,
  
  -- Total geral (independente do período)
  (SELECT COUNT(*) FROM public.gbp_demandas_ruas) AS total_geral_demandas;

-- Detalhamento por status
WITH dados AS (
  SELECT * FROM public.gbp_demandas_ruas
  WHERE criado_em BETWEEN (SELECT data_inicio FROM temp_parametros) AND (SELECT data_fim FROM temp_parametros)
),
total AS (
  SELECT COUNT(*) as total FROM dados
)
SELECT 
  status AS status_demanda,
  COUNT(*) AS quantidade,
  ROUND(COUNT(*) * 100.0 / (SELECT total FROM total), 1) AS percentual
FROM dados
GROUP BY status
ORDER BY quantidade DESC;

-- Evolução mensal de demandas
WITH dados AS (
  SELECT * FROM public.gbp_demandas_ruas
  WHERE criado_em BETWEEN (SELECT data_inicio FROM temp_parametros) AND (SELECT data_fim FROM temp_parametros)
)
SELECT 
  TO_CHAR(DATE_TRUNC('month', criado_em), 'MM/YYYY') AS mes_ano,
  COUNT(*) AS total_demandas,
  COUNT(*) FILTER (WHERE status = 'concluido') AS concluidas,
  COUNT(*) FILTER (WHERE documento_protocolado IS NOT NULL) AS com_protocolo
FROM dados
GROUP BY mes_ano
ORDER BY MIN(criado_em);

-- Top 5 cidades com mais demandas
WITH dados AS (
  SELECT * FROM public.gbp_demandas_ruas
  WHERE criado_em BETWEEN (SELECT data_inicio FROM temp_parametros) AND (SELECT data_fim FROM temp_parametros)
),
total AS (
  SELECT COUNT(*) as total FROM dados
)
SELECT 
  cidade,
  uf,
  COUNT(*) AS total_demandas,
  ROUND(COUNT(*) * 100.0 / (SELECT total FROM total), 1) AS percentual
FROM dados
GROUP BY cidade, uf
ORDER BY total_demandas DESC
LIMIT 5;

-- Limpa a tabela temporária
DROP TABLE IF EXISTS temp_parametros;
