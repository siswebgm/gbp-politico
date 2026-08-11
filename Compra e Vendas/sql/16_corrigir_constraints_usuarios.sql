-- ============================================================================
-- Corrigir constraints e defaults da tabela usuarios
-- ============================================================================

-- 1. Remover trigger duplicado
DROP TRIGGER IF EXISTS trg_users_updated_at ON marketplace.usuarios;

-- 2. Corrigir valores padrão para português
ALTER TABLE marketplace.usuarios ALTER COLUMN papel SET DEFAULT 'usuario';
ALTER TABLE marketplace.usuarios ALTER COLUMN situacao SET DEFAULT 'ativo';

-- 3. Atualizar registros existentes (se houver)
UPDATE marketplace.usuarios SET papel = 'usuario' WHERE papel = 'user';
UPDATE marketplace.usuarios SET situacao = 'ativo' WHERE situacao = 'active';

-- 4. Verificar se a função do trigger existe
CREATE OR REPLACE FUNCTION marketplace.definir_slug_usuario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS NULL THEN 
    NEW.id := gen_random_uuid(); 
  END IF;
  
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := marketplace.slugify(coalesce(NULLIF(NEW.nome, ''), 'usuario')) || '-' || substring(NEW.id::text, 1, 8);
  END IF;
  
  RETURN NEW;
END; $$;

-- 5. Recriar função slugify (remover versão antiga primeiro)
DROP FUNCTION IF EXISTS marketplace.slugify(text);
CREATE OR REPLACE FUNCTION marketplace.slugify(text_to_slugify TEXT)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(
        translate(
          text_to_slugify,
          'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
          'aaaaaeeeeiiiiooooouuuucnAAAAAEEEEIIIIOOOOOUUUUCN'
        ),
        '[^a-z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    )
  );
END; $$;

-- 6. Recriar trigger de cadastro automático
DROP TRIGGER IF EXISTS trg_auth_users_insert ON auth.users;

CREATE OR REPLACE FUNCTION marketplace.tratar_novo_usuario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, auth, public AS $$
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
    coalesce(nullif(NEW.raw_user_meta_data ->> 'name', ''), split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'photo_url',
    NEW.email_confirmed_at IS NOT NULL,
    'ativo',
    'usuario',
    now()
  ) 
  ON CONFLICT (id_autenticacao) DO UPDATE SET
    email_confirmado = NEW.email_confirmed_at IS NOT NULL,
    ultimo_acesso = now();
    
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_auth_users_insert 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION marketplace.tratar_novo_usuario();

-- 7. Habilitar RLS mas permitir inserções do trigger
ALTER TABLE marketplace.usuarios ENABLE ROW LEVEL SECURITY;

-- Política para permitir que o trigger insira
DROP POLICY IF EXISTS usuarios_insert_via_trigger ON marketplace.usuarios;
CREATE POLICY usuarios_insert_via_trigger ON marketplace.usuarios
  FOR INSERT
  WITH CHECK (true);

-- Política para leitura pública de perfis ativos
DROP POLICY IF EXISTS usuarios_select_public ON marketplace.usuarios;
CREATE POLICY usuarios_select_public ON marketplace.usuarios
  FOR SELECT
  USING (situacao = 'ativo');

-- Política para usuários atualizarem seus próprios dados
DROP POLICY IF EXISTS usuarios_update_own ON marketplace.usuarios;
CREATE POLICY usuarios_update_own ON marketplace.usuarios
  FOR UPDATE
  USING (id_autenticacao = auth.uid())
  WITH CHECK (id_autenticacao = auth.uid());

-- 8. Verificação final
SELECT 
  'Correções aplicadas!' as status,
  (SELECT count(*) FROM marketplace.usuarios) as total_usuarios,
  (SELECT trigger_name FROM information_schema.triggers 
   WHERE trigger_schema='auth' AND event_object_table='users' 
   AND trigger_name='trg_auth_users_insert') as trigger_ativo;
