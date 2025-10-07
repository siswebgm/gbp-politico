-- Adicionar índices para otimizar as queries de estatísticas
-- Isso vai acelerar MUITO as contagens de eleitores e atendimentos

-- Índice composto para gbp_eleitores (empresa_uid + usuario_uid)
CREATE INDEX IF NOT EXISTS idx_gbp_eleitores_empresa_usuario 
ON gbp_eleitores(empresa_uid, usuario_uid);

-- Índice composto para gbp_atendimentos (empresa_uid + usuario_uid)
CREATE INDEX IF NOT EXISTS idx_gbp_atendimentos_empresa_usuario 
ON gbp_atendimentos(empresa_uid, usuario_uid);

-- Comentários
COMMENT ON INDEX idx_gbp_eleitores_empresa_usuario IS 'Otimiza contagem de eleitores por usuário e empresa';
COMMENT ON INDEX idx_gbp_atendimentos_empresa_usuario IS 'Otimiza contagem de atendimentos por usuário e empresa';
