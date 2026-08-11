-- ============================================================================
-- Corrigir RLS para reconhecer o usuário logado via header X-User-Id
-- ============================================================================
-- O app usa autenticação própria (cookie marketplace_session). O client Supabase
-- em server.ts passa o marketplace.usuarios.id no header x-user-id.
-- Essas funções são usadas pelas policies de RLS do marketplace.
--
-- Importante: se o seu banco já usa Supabase Auth com auth.uid(), você pode
-- manter as funções antigas, mas elas não funcionarão enquanto o login for feito
-- via marketplace.autenticar_usuario().
-- ============================================================================

CREATE OR REPLACE FUNCTION marketplace.obter_id_usuario_atual()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT u.id
  FROM marketplace.usuarios u
  WHERE u.id = (nullif(current_setting('request.headers::x-user-id', true), '')::uuid)
  LIMIT 1;
$$;

COMMENT ON FUNCTION marketplace.obter_id_usuario_atual() IS 'Retorna o marketplace.usuarios.id a partir do header x-user-id enviado pelo client.';

CREATE OR REPLACE FUNCTION marketplace.eh_administrador()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM marketplace.usuarios u
    WHERE u.id = (nullif(current_setting('request.headers::x-user-id', true), '')::uuid)
      AND u.papel = 'administrador'
      AND u.situacao = 'ativo'
  );
$$;

COMMENT ON FUNCTION marketplace.eh_administrador() IS 'Verifica se o usuário logado (via header x-user-id) é administrador ativo.';
