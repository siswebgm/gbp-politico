-- Migração: torna a tabela gbp_assistente_treinamento global (sem vínculo por empresa)
-- Execute este script no Supabase SQL Editor se a tabela já tiver sido criada com a coluna empresa_uid.

-- Remove política RLS que depende de empresa_uid
DROP POLICY IF EXISTS assistente_treinamento_owner_policy ON public.gbp_assistente_treinamento;

-- Remove índices antigos baseados em empresa_uid antes de dropar a coluna
DROP INDEX IF EXISTS idx_assistente_treinamento_empresa;
DROP INDEX IF EXISTS idx_assistente_treinamento_ativo;

DO $$
BEGIN
  -- Remove a coluna empresa_uid se existir
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'gbp_assistente_treinamento'
      AND column_name = 'empresa_uid'
  ) THEN
    EXECUTE 'ALTER TABLE public.gbp_assistente_treinamento DROP COLUMN empresa_uid';
  END IF;
END $$;

-- Recria índice útil para buscar intenções ativas
CREATE INDEX IF NOT EXISTS idx_assistente_treinamento_ativo
  ON public.gbp_assistente_treinamento (ativo, ordem);

-- Atualiza RLS: acesso restrito a qualquer usuário adm_empresa = true (independente de empresa)
ALTER TABLE public.gbp_assistente_treinamento ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assistente_treinamento_owner_policy ON public.gbp_assistente_treinamento;

CREATE POLICY assistente_treinamento_owner_policy ON public.gbp_assistente_treinamento
  USING (
    EXISTS (
      SELECT 1
      FROM public.gbp_usuarios u
      WHERE u.uid = auth.uid()
        AND u.adm_empresa = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.gbp_usuarios u
      WHERE u.uid = auth.uid()
        AND u.adm_empresa = true
    )
  );
