-- Adicionar coluna tema na tabela gbp_usuarios
-- Valores possíveis: 'light' (dia) ou 'dark' (noite)

ALTER TABLE gbp_usuarios 
ADD COLUMN IF NOT EXISTS tema VARCHAR(10) DEFAULT 'light';

-- Adicionar comentário na coluna
COMMENT ON COLUMN gbp_usuarios.tema IS 'Preferência de tema do usuário: light (dia) ou dark (noite)';

-- Adicionar constraint para validar valores
ALTER TABLE gbp_usuarios 
ADD CONSTRAINT check_tema_valido 
CHECK (tema IN ('light', 'dark'));

-- Criar índice para melhorar performance de consultas por tema
CREATE INDEX IF NOT EXISTS idx_gbp_usuarios_tema 
ON gbp_usuarios(tema);
