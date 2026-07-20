-- Tabela para personalizar/treinar respostas do assistente GBia (global)
CREATE TABLE IF NOT EXISTS public.gbp_assistente_treinamento (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  palavras_chave TEXT NOT NULL DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_assistente_treinamento_ativo
  ON public.gbp_assistente_treinamento (ativo, ordem);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assistente_treinamento_updated_at
  ON public.gbp_assistente_treinamento;

CREATE TRIGGER trg_assistente_treinamento_updated_at
  BEFORE UPDATE ON public.gbp_assistente_treinamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS: acesso restrito a usuários donos do sistema (adm_empresa = true)
ALTER TABLE public.gbp_assistente_treinamento ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
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
END $$;
