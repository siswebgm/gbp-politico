-- Adiciona a coluna pesquisa_uid na tabela ps_gbp_candidatos
ALTER TABLE ps_gbp_candidatos 
ADD COLUMN IF NOT EXISTS pesquisa_uid UUID REFERENCES ps_gbp_pesquisas(uid) ON DELETE CASCADE;

-- Atualiza os registros existentes para vincular aos pais corretos
-- Isso é necessário apenas se você tiver dados existentes que precisam ser migrados
-- UPDATE ps_gbp_candidatos c
-- SET pesquisa_uid = pc.pesquisa_uid
-- FROM ps_gbp_pesquisa_candidatos pc
-- WHERE c.uid = pc.candidato_uid;

-- Cria um índice para melhorar o desempenho das consultas
CREATE INDEX IF NOT EXISTS idx_ps_gbp_candidatos_pesquisa_uid 
ON ps_gbp_candidatos(pesquisa_uid);

-- Comentário explicativo
COMMENT ON COLUMN ps_gbp_candidatos.pesquisa_uid IS 'Referência à pesquisa à qual este candidato pertence';

-- Atualiza as políticas de segurança se necessário
-- Certifique-se de que o RLS (Row Level Security) está configurado corretamente
-- para a nova coluna, se aplicável ao seu caso de uso.
