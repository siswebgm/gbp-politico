-- Vincula agendamentos do app ao evento correspondente no Google Calendar.
-- Quando um agendamento é criado/editado no app com a empresa conectada,
-- o push-api cria/atualiza o evento no Google e guarda o id aqui.

ALTER TABLE gbp_agendamentos
  ADD COLUMN IF NOT EXISTS google_event_id text;

CREATE INDEX IF NOT EXISTS idx_agendamentos_google_event
  ON gbp_agendamentos (google_event_id)
  WHERE google_event_id IS NOT NULL;
