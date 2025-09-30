-- Função para comparar participantes com eleitores
CREATE OR REPLACE FUNCTION public.comparar_participantes_eleitores(
  empresa_id UUID,
  pesquisa_uid UUID DEFAULT NULL
)
RETURNS TABLE (
  total_participantes BIGINT,
  total_eleitores BIGINT,
  correspondencias BIGINT,
  sem_correspondencia BIGINT,
  taxa_correspondencia NUMERIC
) AS $$
DECLARE
  v_total_participantes BIGINT;
  v_total_eleitores BIGINT;
  v_correspondencias BIGINT;
  v_pesquisa_condition TEXT;
BEGIN
  -- Construir condição de pesquisa
  IF pesquisa_uid IS NOT NULL THEN
    v_pesquisa_condition := 'AND ps_gbp_pesquisas = ''' || pesquisa_uid::TEXT || '''';
  ELSE
    v_pesquisa_condition := '';
  END IF;

  -- Contar participantes únicos por telefone, filtrando por pesquisa se fornecido
  EXECUTE format(''
    SELECT COUNT(DISTINCT telefone)
    FROM public.ps_gbp_participantes
    WHERE empresa_uid = %L
    AND telefone IS NOT NULL
    AND telefone != ''''
    %s',
    empresa_id,
    v_pesquisa_condition
  ) INTO v_total_participantes;

  -- Contar eleitores únicos por whatsapp
  SELECT COUNT(DISTINCT whatsapp) INTO v_total_eleitores
  FROM public.gbp_eleitores
  WHERE empresa_uid = empresa_id
  AND whatsapp IS NOT NULL
  AND whatsapp != '';

  -- Contar correspondências, filtrando por pesquisa se fornecido
  EXECUTE format(''
    SELECT COUNT(DISTINCT p.telefone)
    FROM public.ps_gbp_participantes p
    INNER JOIN public.gbp_eleitores e ON p.telefone = e.whatsapp
    WHERE p.empresa_uid = %L
    AND e.empresa_uid = %L
    AND p.telefone IS NOT NULL
    AND p.telefone != ''''
    AND e.whatsapp IS NOT NULL
    AND e.whatsapp != ''''
    %s',
    empresa_id,
    empresa_id,
    v_pesquisa_condition
  ) INTO v_correspondencias;

  -- Retornar resultados
  RETURN QUERY
  SELECT 
    v_total_participantes,
    v_total_eleitores,
    v_correspondencias,
    GREATEST(0, v_total_participantes - v_correspondencias) AS sem_correspondencia,
    CASE 
      WHEN v_total_participantes > 0 
      THEN ROUND((v_correspondencias::NUMERIC / v_total_participantes) * 100, 2)
      ELSE 0 
    END AS taxa_correspondencia;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
