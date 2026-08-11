-- ============================================================================
-- Migração Completa e Segura: Renomear para Português
-- Este script verifica o estado atual antes de executar cada alteração
-- ============================================================================

-- PARTE 1: Renomear COLUNAS (se ainda estiverem em inglês)
DO $$
BEGIN
  -- USUARIOS
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='auth_id') THEN
    ALTER TABLE marketplace.users RENAME COLUMN auth_id TO id_autenticacao;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='name') THEN
    ALTER TABLE marketplace.users RENAME COLUMN name TO nome;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='phone') THEN
    ALTER TABLE marketplace.users RENAME COLUMN phone TO telefone;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='condominium') THEN
    ALTER TABLE marketplace.users RENAME COLUMN condominium TO condominio;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='address') THEN
    ALTER TABLE marketplace.users RENAME COLUMN address TO endereco;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='city') THEN
    ALTER TABLE marketplace.users RENAME COLUMN city TO cidade;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='state') THEN
    ALTER TABLE marketplace.users RENAME COLUMN state TO estado;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='zip') THEN
    ALTER TABLE marketplace.users RENAME COLUMN zip TO cep;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='photo_url') THEN
    ALTER TABLE marketplace.users RENAME COLUMN photo_url TO foto_url;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='bio') THEN
    ALTER TABLE marketplace.users RENAME COLUMN bio TO biografia;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='rating') THEN
    ALTER TABLE marketplace.users RENAME COLUMN rating TO avaliacao;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='total_reviews') THEN
    ALTER TABLE marketplace.users RENAME COLUMN total_reviews TO total_avaliacoes;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='total_ads') THEN
    ALTER TABLE marketplace.users RENAME COLUMN total_ads TO total_anuncios;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='total_sold') THEN
    ALTER TABLE marketplace.users RENAME COLUMN total_sold TO total_vendidos;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='role') THEN
    ALTER TABLE marketplace.users RENAME COLUMN role TO papel;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='status') THEN
    ALTER TABLE marketplace.users RENAME COLUMN status TO situacao;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='email_confirmed') THEN
    ALTER TABLE marketplace.users RENAME COLUMN email_confirmed TO email_confirmado;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='created_at') THEN
    ALTER TABLE marketplace.users RENAME COLUMN created_at TO criado_em;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='updated_at') THEN
    ALTER TABLE marketplace.users RENAME COLUMN updated_at TO atualizado_em;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='marketplace' AND table_name='users' AND column_name='last_access') THEN
    ALTER TABLE marketplace.users RENAME COLUMN last_access TO ultimo_acesso;
  END IF;
END $$;

-- PARTE 2: Renomear TABELA users para usuarios
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='marketplace' AND table_name='users') THEN
    ALTER TABLE marketplace.users RENAME TO usuarios;
  END IF;
END $$;

-- PARTE 3: Recriar função de trigger com nomes corretos
CREATE OR REPLACE FUNCTION marketplace.tratar_novo_usuario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, auth, public AS $$
BEGIN
  INSERT INTO marketplace.usuarios (id_autenticacao, email, nome, foto_url, email_confirmado, situacao, papel, ultimo_acesso)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(nullif(NEW.raw_user_meta_data ->> 'name', ''), split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'photo_url',
    NEW.email_confirmed_at IS NOT NULL,
    'ativo',
    coalesce(NEW.raw_user_meta_data ->> 'role', 'usuario'),
    now()
  ) ON CONFLICT (id_autenticacao) DO NOTHING;
  RETURN NEW;
END; $$;

-- PARTE 4: Recriar trigger
DROP TRIGGER IF EXISTS trg_auth_users_insert ON auth.users;
CREATE TRIGGER trg_auth_users_insert 
  AFTER INSERT ON auth.users 
  FOR EACH ROW 
  EXECUTE FUNCTION marketplace.tratar_novo_usuario();

-- PARTE 5: Recriar view ponte no public
DROP VIEW IF EXISTS public.usuarios CASCADE;
CREATE OR REPLACE VIEW public.usuarios WITH (security_invoker = true) AS 
  SELECT * FROM marketplace.usuarios;

-- PARTE 6: Permissões
GRANT SELECT ON public.usuarios TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.usuarios TO authenticated;

-- Verificação final
SELECT 
  'Migração concluída!' as status,
  (SELECT count(*) FROM marketplace.usuarios) as total_usuarios,
  (SELECT trigger_name FROM information_schema.triggers 
   WHERE trigger_schema='auth' AND event_object_table='users' 
   AND trigger_name='trg_auth_users_insert') as trigger_status;
