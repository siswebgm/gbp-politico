-- Adicionar coluna responsavel à tabela gbp_eleitores
ALTER TABLE gbp_eleitores 
ADD COLUMN IF NOT EXISTS responsavel VARCHAR(255) NULL;

-- Adicionar coluna responsavel_uid para referência ao usuário
ALTER TABLE gbp_eleitores 
ADD COLUMN IF NOT EXISTS responsavel_uid UUID NULL 
REFERENCES gbp_usuarios(uid) ON DELETE SET NULL;

-- Criar índice para responsavel_uid
CREATE INDEX IF NOT EXISTS idx_eleitores_responsavel_uid 
ON gbp_eleitores(responsavel_uid);