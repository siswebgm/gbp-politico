-- Adiciona coluna 'ativa' em gbp_empresas
-- true  = empresa segue conosco (padrão)
-- false = empresa que não está mais conosco
-- Todas as empresas existentes recebem true automaticamente pelo DEFAULT.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'gbp_empresas'
      AND column_name = 'ativa'
  ) THEN
    ALTER TABLE gbp_empresas
      ADD COLUMN ativa BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Garante que qualquer registro antigo sem valor fique ativo
UPDATE gbp_empresas SET ativa = true WHERE ativa IS NULL;

COMMENT ON COLUMN gbp_empresas.ativa IS 'Indica se a empresa continua credenciada conosco (true) ou encerrou o vínculo (false)';
