-- ============================================================================
-- Criar funções ponte no schema public para as funções de autenticação
-- ============================================================================

-- 1. Função ponte para criar_usuario
CREATE OR REPLACE FUNCTION public.criar_usuario(
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
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM marketplace.criar_usuario(
    p_email,
    p_senha,
    p_nome,
    p_telefone,
    p_condominio,
    p_endereco,
    p_cidade,
    p_estado,
    p_cep
  );
$$;

-- 2. Função ponte para autenticar_usuario
CREATE OR REPLACE FUNCTION public.autenticar_usuario(
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
) LANGUAGE sql SECURITY DEFINER AS $$
  SELECT * FROM marketplace.autenticar_usuario(p_email, p_senha);
$$;

-- 3. Permissões
GRANT EXECUTE ON FUNCTION public.criar_usuario TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.autenticar_usuario TO anon, authenticated;

-- 4. Verificação
SELECT 
  'Funções ponte criadas no schema public!' as status,
  (SELECT count(*) FROM pg_proc p 
   JOIN pg_namespace n ON p.pronamespace = n.oid 
   WHERE n.nspname = 'public' AND p.proname IN ('criar_usuario', 'autenticar_usuario')) as total_funcoes;
