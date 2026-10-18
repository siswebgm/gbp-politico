-- Cria automaticamente um bucket de storage ao cadastrar empresa em gbp_empresas.
-- Execute no Supabase SQL Editor.
--
-- id do bucket  = slug_id        (ex.: luiz_eust_quio_15 — mesmo de .storage)
-- name do bucket= slug_id        (mesmo padrão)
-- public        = true           (arquivos acessíveis por URL pública)
--
-- IMPORTANTE: o app faz storage.from(empresa.storage), que usa o ID do bucket.
-- Por isso id = slug_id (e não uid), senão daria 'Bucket not found'.
--
-- Também preenche na linha da empresa (BEFORE INSERT):
--   storage   = slug_id          (mesmo 'name' do bucket)
--   instancia = slug_id          (mesmo padrão de storage)
--
-- Ao EXCLUIR a empresa, uid + nome são registrados em log e o bucket é apagado
-- junto com os objetos dentro dele.

CREATE OR REPLACE FUNCTION public.gbp_create_empresa_bucket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER          -- roda como owner (postgres): bypassa RLS do storage.buckets
SET search_path = public, storage
AS $$
DECLARE
  grupo_uid  uuid;
  tipo_doc   uuid;
  tipo_curso uuid;
BEGIN
  -- NEW.storage foi preenchido pelo trigger BEFORE INSERT com slug_id.
  -- id do bucket = slug_id: é o valor que o app usa em storage.from().
  INSERT INTO storage.buckets (id, name, public)
  VALUES (
    COALESCE(NULLIF(NEW.storage, ''), NEW.uid::text),
    COALESCE(NULLIF(NEW.storage, ''), NEW.uid::text),
    true
  )
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- ------------------------------------------------------------------
  -- Dados padrão da nova empresa (tudo atrelado a NEW.uid = empresa_uid)
  -- ------------------------------------------------------------------

  -- 1) Grupo padrão
  INSERT INTO public.gbp_categoria_grupos (nome, empresa_uid)
  VALUES ('Gabinete', NEW.uid)
  ON CONFLICT (nome, empresa_uid) DO UPDATE SET nome = EXCLUDED.nome
  RETURNING uid INTO grupo_uid;

  -- 2) Tipos padrão, vinculados ao grupo
  INSERT INTO public.gbp_categoria_tipos (nome, empresa_uid, grupo_uid)
  VALUES ('Documentos', NEW.uid, grupo_uid)
  ON CONFLICT (nome, empresa_uid) DO UPDATE SET grupo_uid = EXCLUDED.grupo_uid
  RETURNING uid INTO tipo_doc;

  INSERT INTO public.gbp_categoria_tipos (nome, empresa_uid, grupo_uid)
  VALUES ('Cursos', NEW.uid, grupo_uid)
  ON CONFLICT (nome, empresa_uid) DO UPDATE SET grupo_uid = EXCLUDED.grupo_uid
  RETURNING uid INTO tipo_curso;

  -- 3) Categorias padrão vinculadas ao tipo correspondente
  INSERT INTO public.gbp_categorias (nome, empresa_uid, tipo_uid)
  SELECT v.nome, NEW.uid, tipo_curso
    FROM (VALUES
      ('Informática'),
      ('Maquiagem')
    ) AS v(nome)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.gbp_categorias c
     WHERE c.empresa_uid = NEW.uid AND c.nome = v.nome
  );

  INSERT INTO public.gbp_categorias (nome, empresa_uid, tipo_uid)
  SELECT v.nome, NEW.uid, tipo_doc
    FROM (VALUES
      ('2ª via RG'),
      ('Transferência de Título')
    ) AS v(nome)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.gbp_categorias c
     WHERE c.empresa_uid = NEW.uid AND c.nome = v.nome
  );

  -- 4) Indicado padrão
  INSERT INTO public.gbp_indicado (nome, cidade, bairro, whatsapp, empresa_uid)
  SELECT 'Josuel', 'Paulista', 'Aurora', '81979146126', NEW.uid
  WHERE NOT EXISTS (
    SELECT 1 FROM public.gbp_indicado i
     WHERE i.empresa_uid = NEW.uid AND i.nome = 'Josuel'
  );

  RETURN NEW;
END;
$$;

-- Recria o trigger de forma idempotente
DROP TRIGGER IF EXISTS trg_empresa_bucket ON public.gbp_empresas;

CREATE TRIGGER trg_empresa_bucket
  AFTER INSERT ON public.gbp_empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.gbp_create_empresa_bucket();

-- ---------------------------------------------------------------------------
-- Preenche storage (nome do bucket) e instancia (slug do nome + uid) no INSERT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gbp_fill_empresa_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  slug text;
BEGIN
  -- nome -> slug minúsculo sem acentos especiais/pontuação (a-z0-9 e '_')
  slug := lower(NEW.nome);
  slug := regexp_replace(slug, '[^a-z0-9]+', '_', 'g');
  slug := trim(both '_' from slug);
  IF slug IS NULL OR slug = '' THEN
    slug := 'empresa';
  END IF;

  -- diferencia empresas com nomes iguais: sufixo = coluna id
  slug := slug || '_' || NEW.id::text;

  -- só preenche se vier vazio (não sobrescreve valor explícito)
  -- storage, instancia e name do bucket seguem o mesmo padrão (slug_id)
  NEW.storage := COALESCE(NULLIF(NEW.storage, ''), slug);
  NEW.instancia := COALESCE(NULLIF(NEW.instancia, ''), left(slug, 63));

  -- assinatura: nome da empresa no final do texto de aniversário padrão
  IF NEW.texto_aniversario IS NOT NULL AND NEW.nome IS NOT NULL THEN
    NEW.texto_aniversario := NEW.texto_aniversario || E'\n\nAtt. ' || NEW.nome;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresa_fill ON public.gbp_empresas;

CREATE TRIGGER trg_empresa_fill
  BEFORE INSERT ON public.gbp_empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.gbp_fill_empresa_fields();

-- ---------------------------------------------------------------------------
-- Log de empresas excluídas (uid + nome, antes do DELETE)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gbp_empresas_removidas (
  id bigint generated by default as identity primary key,
  empresa_uid uuid not null,
  nome text,
  removido_em timestamptz not null default now()
);

-- Registra uid/nome no log e remove o bucket (e os arquivos) da empresa
CREATE OR REPLACE FUNCTION public.gbp_drop_empresa_bucket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage
AS $$
BEGIN
  -- 1) log do que foi removido
  INSERT INTO public.gbp_empresas_removidas (empresa_uid, nome)
  VALUES (OLD.uid, OLD.nome);

  -- 2) apaga os arquivos e o bucket; se o bucket não existir, não faz nada
  -- bucket_id/id = valor de OLD.storage (slug_id), c/ fallback para uid legado
  DELETE FROM storage.objects
   WHERE bucket_id IN (OLD.storage, OLD.uid::text);
  DELETE FROM storage.buckets
   WHERE id IN (OLD.storage, OLD.uid::text);

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresa_bucket_delete ON public.gbp_empresas;

CREATE TRIGGER trg_empresa_bucket_delete
  AFTER DELETE ON public.gbp_empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.gbp_drop_empresa_bucket();

-- ---------------------------------------------------------------------------
-- CORREÇÃO ÚNICA: empresas criadas antes desta versão têm bucket id = uid,
-- enquanto gbp_empresas.storage = slug_id → "Bucket not found" no app.
-- Renomeia o id do bucket para o slug e atualiza os objetos dentro dele.
-- Pode rodar quantas vezes precisar; só mexe em buckets com id = uid da empresa.
-- ---------------------------------------------------------------------------
UPDATE storage.objects o
   SET bucket_id = e.storage
  FROM public.gbp_empresas e
 WHERE o.bucket_id = e.uid::text
   AND e.storage IS NOT NULL AND e.storage <> '';

UPDATE storage.buckets b
   SET id = e.storage, name = e.storage
  FROM public.gbp_empresas e
 WHERE b.id = e.uid::text
   AND e.storage IS NOT NULL AND e.storage <> '';

-- Empresas antigas sem coluna storage preenchida: preenche com slug_id
-- e cria o bucket correspondente.
UPDATE public.gbp_empresas e
   SET storage = lower(regexp_replace(
                 regexp_replace(coalesce(e.nome, 'empresa'), '[^a-zA-Z0-9]+', '_', 'g'),
                 '^_+|_+$', '', 'g')) || '_' || e.id,
     instancia = COALESCE(NULLIF(e.instancia, ''),
                 lower(regexp_replace(
                   regexp_replace(coalesce(e.nome, 'empresa'), '[^a-zA-Z0-9]+', '_', 'g'),
                   '^_+|_+$', '', 'g')) || '_' || e.id)
 WHERE e.storage IS NULL OR e.storage = '';

INSERT INTO storage.buckets (id, name, public)
SELECT e.storage, e.storage, true
  FROM public.gbp_empresas e
 WHERE e.storage IS NOT NULL AND e.storage <> ''
   AND NOT EXISTS (SELECT 1 FROM storage.buckets b WHERE b.id = e.storage);
