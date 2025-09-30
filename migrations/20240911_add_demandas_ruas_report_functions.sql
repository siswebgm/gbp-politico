-- Função para contar demandas por mês
CREATE OR REPLACE FUNCTION public.contar_demandas_por_mes(
  empresa_id uuid,
  data_inicio date,
  data_fim date
)
RETURNS TABLE(
  mes date,
  total bigint
)
LANGUAGE sql
AS $$
  SELECT 
    date_trunc('month', criado_em) as mes,
    COUNT(*) as total
  FROM 
    gbp_demandas_ruas
  WHERE 
    empresa_uid = empresa_id
    AND criado_em BETWEEN data_inicio AND data_fim
  GROUP BY 
    date_trunc('month', criado_em)
  ORDER BY 
    mes;
$$;

-- Função para calcular o tempo médio de resolução
CREATE OR REPLACE FUNCTION public.calcular_tempo_medio_resolucao(
  empresa_id uuid
)
RETURNS interval
LANGUAGE sql
AS $$
  SELECT 
    AVG(demanda_concluida_data - criado_em) as tempo_medio
  FROM 
    gbp_demandas_ruas
  WHERE 
    empresa_uid = empresa_id
    AND demanda_concluida = true
    AND demanda_concluida_data IS NOT NULL;
$$;

-- Conceder permissões para o usuário anônimo (se necessário)
GRANT EXECUTE ON FUNCTION public.contar_demandas_por_mes(uuid, date, date) TO anon;
GRANT EXECUTE ON FUNCTION public.calcular_tempo_medio_resolucao(uuid) TO anon;

-- Adicionar políticas de segurança para as funções (se necessário)
ALTER FUNCTION public.contar_demandas_por_mes(uuid, date, date) SECURITY DEFINER;
ALTER FUNCTION public.calcular_tempo_medio_resolucao(uuid) SECURITY DEFINER;
