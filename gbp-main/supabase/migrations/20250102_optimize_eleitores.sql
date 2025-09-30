-- Adiciona índices para otimizar as buscas mais comuns
CREATE INDEX IF NOT EXISTS idx_eleitores_empresa_id ON gbp_eleitores(empresa_id);
CREATE INDEX IF NOT EXISTS idx_eleitores_nome ON gbp_eleitores(nome);
CREATE INDEX IF NOT EXISTS idx_eleitores_cpf ON gbp_eleitores(cpf);
CREATE INDEX IF NOT EXISTS idx_eleitores_bairro ON gbp_eleitores(bairro);
CREATE INDEX IF NOT EXISTS idx_eleitores_categoria_id ON gbp_eleitores(categoria_id);
CREATE INDEX IF NOT EXISTS idx_eleitores_indicado_por ON gbp_eleitores(indicado_por);
CREATE INDEX IF NOT EXISTS idx_eleitores_created_at ON gbp_eleitores(created_at DESC);

-- Otimiza a busca por texto completo
ALTER TABLE gbp_eleitores ADD COLUMN IF NOT EXISTS fts tsvector 
  GENERATED ALWAYS AS (
    setweight(to_tsvector('portuguese', coalesce(nome, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(bairro, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(cidade, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_eleitores_fts ON gbp_eleitores USING gin(fts);
