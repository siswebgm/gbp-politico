-- Remove o workflow do n8n quando a empresa é deletada.
-- 1) coluna que guarda o id do workflow clonado (usada como fallback de nome tb)
-- 2) trigger AFTER DELETE que chama POST /n8n/remover-empresa da push-api
-- Execute no Supabase SQL Editor.

ALTER TABLE public.gbp_empresas
  ADD COLUMN IF NOT EXISTS n8n_workflow_id text;

CREATE OR REPLACE FUNCTION public.gbp_empresa_n8n_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- só chama se a empresa tinha workflow vinculado
  IF OLD.fila IS NOT NULL OR OLD.n8n_workflow_id IS NOT NULL THEN
    PERFORM net.http_post(
      url     := 'https://app.gbppolitico.com/push/n8n/remover-empresa',
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'x-webhook-secret', '9abe015717f642e589365e82a2147802'),
      body    := jsonb_build_object('record', row_to_json(OLD))
    );
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresa_n8n_delete ON public.gbp_empresas;

CREATE TRIGGER trg_empresa_n8n_delete
  AFTER DELETE ON public.gbp_empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.gbp_empresa_n8n_delete();
