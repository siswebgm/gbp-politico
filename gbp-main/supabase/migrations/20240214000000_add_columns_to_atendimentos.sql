-- Add new columns to gbp_atendimentos table
ALTER TABLE gbp_atendimentos
ADD COLUMN IF NOT EXISTS bairro text,
ADD COLUMN IF NOT EXISTS cidade text,
ADD COLUMN IF NOT EXISTS logradouro text,
ADD COLUMN IF NOT EXISTS cep text,
ADD COLUMN IF NOT EXISTS uf text,
ADD COLUMN IF NOT EXISTS whatsapp text,
ADD COLUMN IF NOT EXISTS indicado_uid uuid REFERENCES gbp_eleitores(uid);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_atendimentos_cidade ON gbp_atendimentos(cidade);
CREATE INDEX IF NOT EXISTS idx_atendimentos_bairro ON gbp_atendimentos(bairro);
CREATE INDEX IF NOT EXISTS idx_atendimentos_indicado_uid ON gbp_atendimentos(indicado_uid);
