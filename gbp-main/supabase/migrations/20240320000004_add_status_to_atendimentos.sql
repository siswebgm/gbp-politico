-- Add status column to gbp_atendimentos table
ALTER TABLE gbp_atendimentos
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente'
CHECK (status IN ('encaminhado', 'pendente', 'resolvido', 'outros'));