-- ============================================================================
-- Marketplace - Funções e Triggers
-- ============================================================================
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helpers gerais
-- ----------------------------------------------------------------------------

-- Slugify: converte um texto em slug URL-friendly
CREATE OR REPLACE FUNCTION marketplace.slugify(input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(
    regexp_replace(
      regexp_replace(trim(both ' ' from input), '[^a-zA-Z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    ),
    '(^-|-$)', '', 'g'
  ));
$$;

COMMENT ON FUNCTION marketplace.slugify(text) IS 'Gera um slug amigável a partir de um texto';

-- ----------------------------------------------------------------------------
-- Atualização automática de atualizado_em
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION marketplace.atualizar_coluna_atualizado_em()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION marketplace.atualizar_coluna_atualizado_em() IS 'Atualiza a coluna atualizado_em em modificações';

-- Aplica o trigger em todas as tabelas que possuem atualizado_em
DO $$
DECLARE
  tabela text;
BEGIN
  FOR tabela IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'marketplace'
      AND tablename IN (
        'usuarios', 'categorias', 'subcategorias', 'anuncios', 'anuncio_imagens',
        'anuncio_videos', 'favoritos', 'conversas', 'mensagens',
        'anuncio_visualizacoes', 'denuncias', 'banners', 'notificacoes', 'configuracoes'
      )
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_%I_updated_at ON marketplace.%I;',
      tabela, tabela
    );
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON marketplace.%I
       FOR EACH ROW EXECUTE FUNCTION marketplace.atualizar_coluna_atualizado_em();',
      tabela, tabela
    );
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- Slugs automáticos
-- ----------------------------------------------------------------------------

-- Slug do usuário
CREATE OR REPLACE FUNCTION marketplace.definir_slug_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := marketplace.slugify(coalesce(NULLIF(NEW.nome, ''), 'usuario'))
                || '-' || substring(NEW.id::text, 1, 8);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_users_before_insert
BEFORE INSERT ON marketplace.usuarios
FOR EACH ROW EXECUTE FUNCTION marketplace.definir_slug_usuario();

-- Slug do produto
CREATE OR REPLACE FUNCTION marketplace.definir_slug_anuncio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := marketplace.slugify(coalesce(NULLIF(NEW.titulo, ''), 'produto'))
                || '-' || substring(NEW.id::text, 1, 8);
  END IF;

  IF NEW.situacao IS NULL
     OR NEW.situacao NOT IN ('ativo', 'pausado', 'vendido', 'removido') THEN
    NEW.situacao := 'ativo';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_products_before_insert
BEFORE INSERT ON marketplace.anuncios
FOR EACH ROW EXECUTE FUNCTION marketplace.definir_slug_anuncio();

-- ----------------------------------------------------------------------------
-- Criação automática do perfil ao criar usuário no Supabase Auth
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION marketplace.tratar_novo_usuario()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, auth, public
AS $$
BEGIN
  INSERT INTO marketplace.usuarios (
    id_autenticacao,
    email,
    nome,
    foto_url,
    email_confirmado,
    situacao,
    papel,
    ultimo_acesso
  )
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(
      nullif(NEW.raw_user_meta_data ->> 'nome', ''),
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data ->> 'foto_url',
    NEW.email_confirmed_at IS NOT NULL,
    'ativo',
    coalesce(NEW.raw_user_meta_data ->> 'papel', 'usuario'),
    now()
  )
  ON CONFLICT (id_autenticacao) DO NOTHING;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION marketplace.tratar_novo_usuario() IS 'Cria automaticamente o perfil no marketplace quando um auth.usuarios é inserido';

-- Trigger no auth.usuarios (requer papel postgres)
DROP TRIGGER IF EXISTS trg_auth_users_insert ON auth.usuarios;
CREATE TRIGGER trg_auth_users_insert
AFTER INSERT ON auth.usuarios
FOR EACH ROW EXECUTE FUNCTION marketplace.tratar_novo_usuario();

-- ----------------------------------------------------------------------------
-- Helpers de RLS
-- ----------------------------------------------------------------------------

-- Retorna o id (marketplace) do usuário logado
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

-- Verifica se o usuário logado é admin
CREATE OR REPLACE FUNCTION marketplace.eh_administrador()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT exists(
    SELECT 1
    FROM marketplace.usuarios u
    WHERE u.id = (nullif(current_setting('request.headers::x-user-id', true), '')::uuid)
      AND u.papel = 'administrador'
      AND u.situacao = 'ativo'
  );
$$;

COMMENT ON FUNCTION marketplace.eh_administrador() IS 'Retorna true se o usuário logado é administrador ativo';

-- ----------------------------------------------------------------------------
-- Incremento seguro de visualizações
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION marketplace.incrementar_visualizacoes_anuncio(p_anuncio_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketplace, auth
AS $$
BEGIN
  INSERT INTO marketplace.anuncio_visualizacoes (anuncio_id, visitante_id, endereco_ip, user_agent)
  VALUES (
    p_anuncio_id,
    marketplace.obter_id_usuario_atual(),
    current_setting('request.headers::x-forwarded-for', true),
    current_setting('request.headers::user-agent', true)
  );

  UPDATE marketplace.anuncios
  SET visualizacoes = visualizacoes + 1
  WHERE id = p_anuncio_id;
END;
$$;

COMMENT ON FUNCTION marketplace.incrementar_visualizacoes_anuncio(uuid) IS 'Registra uma visualização e incrementa o contador do produto';

-- Permite chamadas de usuários anônimos e autenticados
GRANT EXECUTE ON FUNCTION marketplace.incrementar_visualizacoes_anuncio(uuid) TO anon, authenticated;
