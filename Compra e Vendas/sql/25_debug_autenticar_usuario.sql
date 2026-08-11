-- ============================================================================
-- Versão com debug da função autenticar_usuario
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
  
  RAISE NOTICE 'Email: %, Hash gerado: %', p_email, v_senha_hash;
  
  -- Buscar autenticação
  SELECT * INTO v_auth
  FROM marketplace.autenticacao
  WHERE autenticacao.email = p_email;
  
  IF v_auth IS NULL THEN
    RAISE NOTICE 'Usuário não encontrado';
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Hash armazenado: %', v_auth.senha_hash;
  
  -- Se senha incorreta
  IF v_auth.senha_hash != v_senha_hash THEN
    RAISE NOTICE 'Senha incorreta';
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Senha correta, buscando usuário';
  
  -- Atualizar último login
  UPDATE marketplace.autenticacao
  SET ultimo_login = now()
  WHERE uid = v_auth.uid;
  
  -- Buscar dados do usuário
  SELECT * INTO v_usuario
  FROM marketplace.usuarios
  WHERE autenticacao_uid = v_auth.uid;
  
  IF v_usuario IS NULL THEN
    RAISE NOTICE 'Usuário não encontrado na tabela usuarios';
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
    RETURN;
  END IF;
  
  RAISE NOTICE 'Usuário encontrado: %', v_usuario.nome;
  
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

-- Testar novamente
SELECT * FROM public.autenticar_usuario(
  'joao@exemplo.com',
  'Senha123'
);
