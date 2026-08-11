-- ============================================================================
-- Corrigir função criar_usuario para usar gen_salt corretamente
-- ============================================================================

-- Recriar função criar_usuario com tipo correto para gen_salt
CREATE OR REPLACE FUNCTION marketplace.criar_usuario(
  p_email TEXT,
  p_senha TEXT,
  p_nome TEXT,
  p_telefone TEXT DEFAULT NULL,
  p_condominio TEXT DEFAULT NULL,
  p_endereco TEXT DEFAULT NULL,
  p_cidade TEXT DEFAULT NULL,
  p_estado TEXT DEFAULT NULL,
  p_cep TEXT DEFAULT NULL
)
RETURNS TABLE(
  usuario_uid UUID,
  autenticacao_uid UUID,
  email TEXT,
  nome TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_autenticacao_uid UUID;
  v_usuario_uid UUID;
  v_senha_hash TEXT;
BEGIN
  -- Gerar hash da senha (usando crypt do pgcrypto com tipo TEXT explícito)
  v_senha_hash := crypt(p_senha, gen_salt('bf'::text));
  
  -- Criar registro de autenticação
  INSERT INTO marketplace.autenticacao (email, senha_hash)
  VALUES (p_email, v_senha_hash)
  RETURNING uid INTO v_autenticacao_uid;
  
  -- Criar perfil do usuário
  INSERT INTO marketplace.usuarios (
    autenticacao_uid,
    email,
    nome,
    telefone,
    condominio,
    endereco,
    cidade,
    estado,
    cep,
    situacao,
    papel
  )
  VALUES (
    v_autenticacao_uid,
    p_email,
    p_nome,
    p_telefone,
    p_condominio,
    p_endereco,
    p_cidade,
    p_estado,
    p_cep,
    'ativo',
    'usuario'
  )
  RETURNING id INTO v_usuario_uid;
  
  -- Retornar dados do usuário criado
  RETURN QUERY
  SELECT 
    v_usuario_uid,
    v_autenticacao_uid,
    p_email,
    p_nome;
END;
$$;

-- Recriar função autenticar_usuario com tipo correto
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
BEGIN
  -- Buscar autenticação
  SELECT * INTO v_auth
  FROM marketplace.autenticacao
  WHERE autenticacao.email = p_email;
  
  -- Se não encontrou ou senha incorreta
  IF v_auth IS NULL OR v_auth.senha_hash != crypt(p_senha, v_auth.senha_hash) THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, FALSE;
    RETURN;
  END IF;
  
  -- Atualizar último login
  UPDATE marketplace.autenticacao
  SET ultimo_login = now()
  WHERE uid = v_auth.uid;
  
  -- Buscar dados do usuário
  SELECT * INTO v_usuario
  FROM marketplace.usuarios
  WHERE autenticacao_uid = v_auth.uid;
  
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
SELECT 'Funções corrigidas com sucesso!' as status;
