-- Adiciona coluna grupo_uid na tabela gbp_categoria_tipos
-- Permite agrupar tipos de categoria dentro de um grupo (gbp_categoria_grupos) por empresa.
-- O agrupamento só é exibido (ex.: dropdown de categoria) quando a empresa possui
-- tipos vinculados a grupos.

-- 1. Coluna grupo_uid (nulo = tipo sem grupo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gbp_categoria_tipos'
      AND column_name = 'grupo_uid'
  ) THEN
    ALTER TABLE public.gbp_categoria_tipos
      ADD COLUMN grupo_uid uuid NULL;
  END IF;
END $$;

-- 2. Foreign key nomeada (necessária para embed/join via PostgREST)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'gbp_categoria_tipos_grupo_uid_fkey'
  ) THEN
    ALTER TABLE public.gbp_categoria_tipos
      ADD CONSTRAINT gbp_categoria_tipos_grupo_uid_fkey
      FOREIGN KEY (grupo_uid)
      REFERENCES public.gbp_categoria_grupos (uid)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Índice para performance
CREATE INDEX IF NOT EXISTS idx_categoria_tipos_grupo_uid
  ON public.gbp_categoria_tipos USING btree (grupo_uid);

-- 4. Comentário
COMMENT ON COLUMN public.gbp_categoria_tipos.grupo_uid IS
  'UID do grupo (gbp_categoria_grupos) ao qual o tipo pertence. Nulo = tipo sem grupo.';
