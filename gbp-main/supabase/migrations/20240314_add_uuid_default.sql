-- Adiciona a extensão uuid-ossp se ainda não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Altera a coluna upload_history_uid para ter um valor default usando uuid_generate_v4()
ALTER TABLE gbp_upload_history
ALTER COLUMN upload_history_uid SET DEFAULT uuid_generate_v4();
