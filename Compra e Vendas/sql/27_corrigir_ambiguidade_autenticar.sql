-- ============================================================================
-- Corrigir ambiguidade na função autenticar_usuario
-- ============================================================================

CREATE OR REPLACE FUNCTION marketplace.autenticar_usuario(
  p_email TEXT,
  p_senha TEXT
)
RETURNS TABLE(
  autenticado BOOLEAN,
  usuario_uid UUID,
  autenticacao_uid UUID,
  email TEXT,
  nome TEXT,
  papel TEXT,
  email_confirmado BOOLEAN
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_auth RECORD;
  v_usuario RECORD;
  v_senha_hash TEXT;
BEGIN
  -- Gerar hash da senha fornecida
  v_senha_hash := md5(p_senha || p_email);
  
  -- Buscar autenticação
  SELECT * INTO v_auth
  FROM marketplace.autenticacao
  WHERE autenticacao.email = p_email;
  
  -- Se não encontrou ou senha incorreta
  IF v_auth IS NULL OR v_auth.senha_hash != v_senha_hash THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
    RETURN;
  END IF;
  
  -- Atualizar último login
  UPDATE marketplace.autenticacao
  SET ultimo_login = now()
  WHERE uid = v_auth.uid;
  
  -- Buscar dados do usuário (usando alias para evitar ambiguidade)
  SELECT * INTO v_usuario
  FROM marketplace.usuarios u
  WHERE u.autenticacao_uid = v_auth.uid;
  
  -- Retornar dados
  RETURN QUERY
  SELECT 
    TRUE,
    v_usuario.id,
    v_auth.uid,
    v_auth.email,
    v_usuario.nome,
    v_usuario.papel,
    v_auth.email_confirmado;
END;
$$;

-- Verificação
SELECT 'Função autenticar_usuario corrigida!' as status;
