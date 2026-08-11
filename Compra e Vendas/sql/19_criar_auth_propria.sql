-- ============================================================================
-- Criar sistema de autenticação próprio (sem depender de auth.users)
-- ============================================================================

-- 1. Criar tabela de autenticação própria
CREATE TABLE IF NOT EXISTS marketplace.autenticacao (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  email_confirmado BOOLEAN NOT NULL DEFAULT false,
  token_confirmacao TEXT,
  token_recuperacao TEXT,
  token_expira_em TIMESTAMPTZ,
  ultimo_login TIMESTAMPTZ,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Adicionar índices
CREATE INDEX IF NOT EXISTS idx_autenticacao_email ON marketplace.autenticacao(email);
CREATE INDEX IF NOT EXISTS idx_autenticacao_token_confirmacao ON marketplace.autenticacao(token_confirmacao);
CREATE INDEX IF NOT EXISTS idx_autenticacao_token_recuperacao ON marketplace.autenticacao(token_recuperacao);

-- 3. Remover políticas RLS que dependem de id_autenticacao
DROP POLICY IF EXISTS users_select_public ON marketplace.usuarios;
DROP POLICY IF EXISTS users_insert_self ON marketplace.usuarios;
DROP POLICY IF EXISTS users_update_self_or_admin ON marketplace.usuarios;
DROP POLICY IF EXISTS usuarios_update_own ON marketplace.usuarios;
DROP POLICY IF EXISTS banners_admin_write ON storage.objects;

-- Remover views que dependem de id_autenticacao
DROP VIEW IF EXISTS public.users CASCADE;
DROP VIEW IF EXISTS public.usuarios CASCADE;

-- 4. Modificar tabela usuarios para usar a nova autenticação
ALTER TABLE marketplace.usuarios DROP CONSTRAINT IF EXISTS users_auth_id_fkey;
ALTER TABLE marketplace.usuarios DROP COLUMN IF EXISTS id_autenticacao CASCADE;
ALTER TABLE marketplace.usuarios ADD COLUMN IF NOT EXISTS autenticacao_uid UUID REFERENCES marketplace.autenticacao(uid) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_autenticacao_uid_key ON marketplace.usuarios(autenticacao_uid);

-- 5. Recriar view ponte no public
DROP VIEW IF EXISTS public.usuarios CASCADE;
CREATE OR REPLACE VIEW public.usuarios WITH (security_invoker = true) AS 
  SELECT * FROM marketplace.usuarios;

-- 6. Recriar políticas RLS
ALTER TABLE marketplace.usuarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_select_public ON marketplace.usuarios;
CREATE POLICY usuarios_select_public ON marketplace.usuarios
  FOR SELECT
  USING (situacao = 'ativo');

DROP POLICY IF EXISTS usuarios_insert_via_function ON marketplace.usuarios;
CREATE POLICY usuarios_insert_via_function ON marketplace.usuarios
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS usuarios_update_own ON marketplace.usuarios;
CREATE POLICY usuarios_update_own ON marketplace.usuarios
  FOR UPDATE
  USING (autenticacao_uid IN (
    SELECT uid FROM marketplace.autenticacao WHERE email = current_user
  ))
  WITH CHECK (autenticacao_uid IN (
    SELECT uid FROM marketplace.autenticacao WHERE email = current_user
  ));

-- 7. Recriar política de storage para banners
DROP POLICY IF EXISTS banners_admin_write ON storage.objects;
CREATE POLICY banners_admin_write ON storage.objects 
  FOR ALL
  USING (
    bucket_id = 'banners' 
    AND EXISTS (
      SELECT 1 FROM marketplace.usuarios u
      JOIN marketplace.autenticacao a ON a.uid = u.autenticacao_uid
      WHERE a.email = current_user AND u.papel = 'administrador'
    )
  )
  WITH CHECK (
    bucket_id = 'banners'
    AND EXISTS (
      SELECT 1 FROM marketplace.usuarios u
      JOIN marketplace.autenticacao a ON a.uid = u.autenticacao_uid
      WHERE a.email = current_user AND u.papel = 'administrador'
    )
  );

-- 8. Função para criar usuário completo (autenticação + perfil)
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
  -- Gerar hash da senha (usando crypt do pgcrypto)
  v_senha_hash := crypt(p_senha, gen_salt('bf'));
  
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

-- 9. Função para autenticar usuário
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

-- 10. Criar view de autenticacao no public
DROP VIEW IF EXISTS public.autenticacao CASCADE;
CREATE OR REPLACE VIEW public.autenticacao WITH (security_invoker = true) AS 
  SELECT uid, email, email_confirmado, ultimo_login, criado_em 
  FROM marketplace.autenticacao;

-- 7. Permissões
GRANT EXECUTE ON FUNCTION marketplace.criar_usuario TO anon, authenticated;
GRANT EXECUTE ON FUNCTION marketplace.autenticar_usuario TO anon, authenticated;
GRANT SELECT ON public.autenticacao TO authenticated;

-- 12. Habilitar extensão pgcrypto se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 13. Verificação final
SELECT 
  'Sistema de autenticação próprio criado!' as status,
  (SELECT count(*) FROM marketplace.autenticacao) as total_auth,
  (SELECT count(*) FROM marketplace.usuarios) as total_usuarios;
