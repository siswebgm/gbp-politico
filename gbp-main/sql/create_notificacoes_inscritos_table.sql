-- Inscritos em notificações push por empresa (via link de convite público)
CREATE TABLE IF NOT EXISTS public.gbp_notificacoes_inscritos (
  uid uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_uid uuid NOT NULL,
  nome text,
  telefone text,
  token text,
  permissao text NOT NULL DEFAULT 'default', -- granted | denied | default
  plataforma text,
  user_agent text,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notif_inscritos_empresa
  ON public.gbp_notificacoes_inscritos (empresa_uid);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_inscritos_empresa_token
  ON public.gbp_notificacoes_inscritos (empresa_uid, token)
  WHERE token IS NOT NULL;

-- A página de convite é pública (sem login): libera INSERT para anon.
-- Ajuste conforme sua política de RLS. Se a tabela não usa RLS, ignore.
ALTER TABLE public.gbp_notificacoes_inscritos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notif_inscritos_insert_publico ON public.gbp_notificacoes_inscritos;
CREATE POLICY notif_inscritos_insert_publico
  ON public.gbp_notificacoes_inscritos
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS notif_inscritos_select_autenticado ON public.gbp_notificacoes_inscritos;
CREATE POLICY notif_inscritos_select_autenticado
  ON public.gbp_notificacoes_inscritos
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS notif_inscritos_update_autenticado ON public.gbp_notificacoes_inscritos;
CREATE POLICY notif_inscritos_update_autenticado
  ON public.gbp_notificacoes_inscritos
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
