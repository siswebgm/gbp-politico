-- Função para buscar estatísticas de todos os usuários de uma empresa de uma vez
-- Isso é muito mais eficiente que fazer queries individuais para cada usuário

CREATE OR REPLACE FUNCTION get_users_stats(p_empresa_uid UUID)
RETURNS TABLE (
  usuario_uid UUID,
  total_eleitores BIGINT,
  total_atendimentos BIGINT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH eleitores_count AS (
    SELECT 
      e.usuario_uid,
      COUNT(*) as total
    FROM gbp_eleitores e
    WHERE e.empresa_uid = p_empresa_uid
    GROUP BY e.usuario_uid
  ),
  atendimentos_count AS (
    SELECT 
      a.usuario_uid,
      COUNT(*) as total
    FROM gbp_atendimentos a
    WHERE a.empresa_uid = p_empresa_uid
    GROUP BY a.usuario_uid
  ),
  all_users AS (
    SELECT DISTINCT u.uid as usuario_uid
    FROM gbp_usuarios u
    WHERE u.empresa_uid = p_empresa_uid
  )
  SELECT 
    au.usuario_uid,
    COALESCE(ec.total, 0) as total_eleitores,
    COALESCE(ac.total, 0) as total_atendimentos
  FROM all_users au
  LEFT JOIN eleitores_count ec ON ec.usuario_uid = au.usuario_uid
  LEFT JOIN atendimentos_count ac ON ac.usuario_uid = au.usuario_uid;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION get_users_stats(UUID) IS 'Retorna estatísticas de eleitores e atendimentos para todos os usuários de uma empresa em uma única query otimizada';
