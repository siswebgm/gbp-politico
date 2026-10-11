-- Vincula lembretes a agendamentos (gbp_agendamentos)
-- Permite que o switch "Lembrete" da Nova Agenda crie um lembrete
-- que dispara via useNotifications / push-api.

-- 1. atendimento_uid passa a ser opcional (lembrete pode ser de agendamento)
ALTER TABLE gbp_lembretes
  ALTER COLUMN atendimento_uid DROP NOT NULL;

-- 2. Coluna agendamento_uid (nullable)
ALTER TABLE gbp_lembretes
  ADD COLUMN IF NOT EXISTS agendamento_uid UUID;

-- 3. FK para gbp_agendamentos com cascade (apaga lembrete junto com a agenda)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gbp_lembretes_agendamento_uid_fkey'
  ) THEN
    ALTER TABLE gbp_lembretes
      ADD CONSTRAINT gbp_lembretes_agendamento_uid_fkey
      FOREIGN KEY (agendamento_uid) REFERENCES gbp_agendamentos(uid)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Índice para consultas por agendamento
CREATE INDEX IF NOT EXISTS idx_gbp_lembretes_agendamento_uid
  ON gbp_lembretes (agendamento_uid);
