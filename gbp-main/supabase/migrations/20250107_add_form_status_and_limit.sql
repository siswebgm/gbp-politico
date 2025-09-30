-- Adiciona coluna de status do formulário (ativo/inativo)
ALTER TABLE gbp_form_config
ADD COLUMN form_status boolean DEFAULT true;

-- Adiciona comentário na coluna para documentação
COMMENT ON COLUMN gbp_form_config.form_status IS 'Status do formulário (true = ativo, false = inativo)';

-- Atualiza registros existentes para terem status ativo por padrão
UPDATE gbp_form_config
SET form_status = true
WHERE form_status IS NULL;
