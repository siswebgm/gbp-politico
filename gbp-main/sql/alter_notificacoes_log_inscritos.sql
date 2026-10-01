-- Permite registrar logs de notificações enviadas a inscritos (link de convite),
-- que não são usuários do sistema.
ALTER TABLE public.gbp_notificacoes_log
  ALTER COLUMN usuario_uid DROP NOT NULL;

ALTER TABLE public.gbp_notificacoes_log
  ADD COLUMN IF NOT EXISTS inscrito_uid uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_notificacoes_inscrito'
  ) THEN
    ALTER TABLE public.gbp_notificacoes_log
      ADD CONSTRAINT fk_notificacoes_inscrito
      FOREIGN KEY (inscrito_uid)
      REFERENCES public.gbp_notificacoes_inscritos(uid)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notificacoes_inscrito
  ON public.gbp_notificacoes_log (inscrito_uid);
