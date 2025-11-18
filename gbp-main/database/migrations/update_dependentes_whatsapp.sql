-- Atualizar tabela gbp_dependentes: remover idade e adicionar whatsapp

-- Remover coluna idade se existir
ALTER TABLE gbp_dependentes 
  DROP COLUMN IF EXISTS idade;

-- Adicionar coluna whatsapp
ALTER TABLE gbp_dependentes 
  ADD COLUMN IF NOT EXISTS whatsapp TEXT;

-- Adicionar comentário
COMMENT ON COLUMN gbp_dependentes.whatsapp IS 'Número de WhatsApp do dependente';

-- Criar índice para busca por whatsapp (opcional)
CREATE INDEX IF NOT EXISTS idx_dependentes_whatsapp 
  ON gbp_dependentes(whatsapp) 
  WHERE whatsapp IS NOT NULL;
