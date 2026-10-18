-- Dispara o endpoint POST /n8n/nova-empresa da push-api a cada empresa criada.
-- A push-api clona o workflow template no n8n e grava o path em gbp_empresas.fila.
-- Usa a extensão pg_net (chamada HTTP assíncrona a partir do Postgres).
-- Execute no Supabase SQL Editor.
--
-- ANTES DE RODAR: substitua <N8N_HOOK_SECRET> pelo mesmo valor configurado
-- na variável de ambiente N8N_HOOK_SECRET do push-api.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.gbp_empresa_n8n_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM net.http_post(
    url     := 'https://app.gbppolitico.com/push/n8n/nova-empresa',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-webhook-secret', '9abe015717f642e589365e82a2147802'),
    body    := jsonb_build_object('record', row_to_json(NEW))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresa_n8n ON public.gbp_empresas;

CREATE TRIGGER trg_empresa_n8n
  AFTER INSERT ON public.gbp_empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.gbp_empresa_n8n_workflow();
