-- Marca atendimentos como "ocultos" quando o eleitor é movido para deletados.
-- Oculto ≠ deletado: permite restauração futura do eleitor + seus atendimentos.

ALTER TABLE gbp_atendimentos
  ADD COLUMN IF NOT EXISTS oculto BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_atendimentos_oculto
  ON gbp_atendimentos(oculto);

-- Garante que registros antigos fiquem com oculto = false
UPDATE gbp_atendimentos SET oculto = false WHERE oculto IS NULL;

-- (Opcional) Limpa o cache do PostgREST se a coluna não aparecer de imediato:
-- NOTIFY pgrst, 'reload schema';
