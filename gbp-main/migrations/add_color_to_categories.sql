-- Adiciona campo de cor às categorias
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gbp_categorias' AND column_name = 'cor'
  ) THEN
    ALTER TABLE gbp_categorias ADD COLUMN cor VARCHAR(7) DEFAULT '#3B82F6';
  END IF;
END $$;

-- Atualiza categorias existentes com cores padrão se estiverem nulas
UPDATE gbp_categorias 
SET cor = '#3B82F6'
WHERE cor IS NULL OR cor = '';
