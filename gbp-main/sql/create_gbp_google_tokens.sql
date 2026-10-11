-- ============================================================
-- Tokens do Google Calendar — UMA conta por empresa (empresa_uid).
-- A conexão é feita por um admin da empresa; todos os usuários dela
-- se beneficiam da sincronização.
--
-- SEGURANÇA: a tabela NÃO é acessível pelo frontend. Não há policies
-- RLS para anon/authenticated — só o push-api (SUPABASE_SERVICE_ROLE_KEY)
-- lê/escreve tokens. Isso impede que refresh tokens vazem para o browser.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gbp_google_tokens (
  empresa_uid    UUID PRIMARY KEY REFERENCES public.gbp_empresas(uid) ON DELETE CASCADE,
  google_email   TEXT,
  google_name    TEXT,
  -- Calendar a sincronizar ('primary' = agenda principal da conta conectada)
  calendar_id    TEXT NOT NULL DEFAULT 'primary',
  access_token   TEXT NOT NULL,
  refresh_token  TEXT,
  token_expiry   TIMESTAMPTZ,
  scopes         TEXT,
  -- Token de sincronização incremental (events.list)
  sync_token     TEXT,
  -- Usuário admin que fez a conexão (auditoria)
  connected_by   UUID REFERENCES public.gbp_usuarios(uid),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gbp_google_tokens ENABLE ROW LEVEL SECURITY;

-- Sem policies: anon/authenticated não têm acesso nenhum à tabela.
-- O push-api acessa com service_role, que ignora RLS.
REVOKE ALL ON public.gbp_google_tokens FROM anon, authenticated;

-- updated_at automático
CREATE OR REPLACE FUNCTION public.gbp_google_tokens_touch()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gbp_google_tokens_touch ON public.gbp_google_tokens;
CREATE TRIGGER trg_gbp_google_tokens_touch
  BEFORE UPDATE ON public.gbp_google_tokens
  FOR EACH ROW EXECUTE FUNCTION public.gbp_google_tokens_touch();
