-- Adiciona coluna para configurar quais empresas podem ser verificadas na consulta de CPF
-- Se null ou vazio, não faz verificação cruzada entre empresas

ALTER TABLE gbp_empresas
ADD COLUMN IF NOT EXISTS empresas_verificacao_cpf UUID[] DEFAULT NULL;

COMMENT ON COLUMN gbp_empresas.empresas_verificacao_cpf IS 'Lista de UIDs de empresas autorizadas para verificação cruzada de CPF. Se null ou vazio, não verifica outras empresas.';
