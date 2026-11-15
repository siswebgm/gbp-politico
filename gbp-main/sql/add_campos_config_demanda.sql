-- Adiciona coluna campos_config (jsonb) na tabela gbp_demanda_tipo
-- Armazena a configuração de visibilidade dos campos do formulário público de demanda
-- Formato: { "requerente_cpf": true, "requerente_nome": true, ... }
-- Campos ausentes ou true = visível; false = oculto no formulário público

ALTER TABLE gbp_demanda_tipo
ADD COLUMN IF NOT EXISTS campos_config jsonb DEFAULT NULL;

COMMENT ON COLUMN gbp_demanda_tipo.campos_config IS 'Configuração de visibilidade dos campos do formulário público de demanda (jsonb: {campo: boolean})';
