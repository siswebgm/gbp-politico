-- Adiciona coluna de documento (CPF ou CNPJ) na empresa.
-- Obrigatória para gerar cobranças no Asaas (o customer precisa de cpfCnpj).
-- Execute no Supabase SQL Editor.

ALTER TABLE gbp_empresas
  ADD COLUMN IF NOT EXISTS cpf_cnpj VARCHAR(20);

COMMENT ON COLUMN gbp_empresas.cpf_cnpj IS 'CPF ou CNPJ usado nas cobranças (Asaas)';

CREATE INDEX IF NOT EXISTS idx_empresas_cpf_cnpj ON gbp_empresas(cpf_cnpj);

-- Recarrega o schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
