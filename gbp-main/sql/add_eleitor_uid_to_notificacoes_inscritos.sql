-- Vincula o inscrito em notificações a um eleitor cadastrado.
-- O link de convite público já aceita /notificacoes/aceitar/:empresa_uid/:eleitor_uid
ALTER TABLE public.gbp_notificacoes_inscritos
  ADD COLUMN IF NOT EXISTS eleitor_uid uuid;

-- Índice para consultas por eleitor
CREATE INDEX IF NOT EXISTS idx_notif_inscritos_eleitor
  ON public.gbp_notificacoes_inscritos (eleitor_uid);

-- Garante unicidade: mesmo eleitor não duplica inscrição na mesma empresa
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_inscritos_empresa_eleitor
  ON public.gbp_notificacoes_inscritos (empresa_uid, eleitor_uid)
  WHERE eleitor_uid IS NOT NULL;

-- Opcional: integridade referencial (descomente se desejar)
-- ALTER TABLE public.gbp_notificacoes_inscritos
--   ADD CONSTRAINT fk_notif_inscritos_eleitor
--   FOREIGN KEY (eleitor_uid) REFERENCES public.gbp_eleitores(uid)
--   ON DELETE SET NULL;
