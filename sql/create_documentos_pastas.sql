-- Pastas personalizadas de documentos (criadas pelo usuário na página /app/documentos)
-- 100% aditivo: não altera nenhuma tabela existente.
--
-- gbp_documentos_pastas: a pasta em si (nome, cor, ícone)
-- gbp_documentos_pasta_itens: vínculo N:N entre a pasta e documentos de qualquer
-- módulo (ofício, projeto de lei, requerimento, emenda)

-- 1. Tabela de pastas
CREATE TABLE IF NOT EXISTS gbp_documentos_pastas (
  uid UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  empresa_uid UUID NOT NULL,
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  cor VARCHAR(20) DEFAULT 'blue',      -- chave de cor usada no card (blue, emerald, violet, amber, rose, cyan...)
  icone VARCHAR(50) DEFAULT 'folder',  -- chave de ícone usada no card (folder, mapPin, tag, star, archive...)
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT gbp_documentos_pastas_empresa_fkey
    FOREIGN KEY (empresa_uid) REFERENCES gbp_empresas(uid)
);

CREATE INDEX IF NOT EXISTS idx_documentos_pastas_empresa
  ON gbp_documentos_pastas(empresa_uid);

-- 2. Itens da pasta (vínculo documento <-> pasta)
CREATE TABLE IF NOT EXISTS gbp_documentos_pasta_itens (
  uid UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  pasta_uid UUID NOT NULL,
  empresa_uid UUID NOT NULL,
  documento_tipo VARCHAR(30) NOT NULL
    CHECK (documento_tipo IN ('oficio', 'projeto_lei', 'requerimento', 'emenda', 'livre')),
  documento_uid UUID,              -- NULL = documento livre criado na pasta
  titulo TEXT,                     -- documento livre: título informado pelo usuário
  observacao TEXT,                 -- documento livre: observações/anotações
  arquivo_url TEXT,                -- legado: URL pública (migrado para arquivos)
  arquivo_nome TEXT,               -- legado: nome original (migrado para arquivos)
  arquivo_path TEXT,               -- legado: path no bucket (migrado para arquivos)
  arquivos JSONB DEFAULT '[]'::jsonb,  -- anexos: [{url, nome, path}] até 3 por item
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT gbp_documentos_pasta_itens_pasta_fkey
    FOREIGN KEY (pasta_uid) REFERENCES gbp_documentos_pastas(uid) ON DELETE CASCADE,
  CONSTRAINT gbp_documentos_pasta_itens_empresa_fkey
    FOREIGN KEY (empresa_uid) REFERENCES gbp_empresas(uid),
  CONSTRAINT gbp_documentos_pasta_itens_unique
    UNIQUE (pasta_uid, documento_tipo, documento_uid)
);

CREATE INDEX IF NOT EXISTS idx_documentos_pasta_itens_pasta
  ON gbp_documentos_pasta_itens(pasta_uid);
CREATE INDEX IF NOT EXISTS idx_documentos_pasta_itens_empresa
  ON gbp_documentos_pasta_itens(empresa_uid);

-- Observação: sem RLS, seguindo o padrão das demais tabelas gbp_*
-- (o isolamento por empresa é feito nas queries com empresa_uid).

-- 3. Realtime: publica mudanças das tabelas para o app atualizar em tempo real
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'gbp_documentos_pastas'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE gbp_documentos_pastas;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'gbp_documentos_pasta_itens'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE gbp_documentos_pasta_itens;
    END IF;
  END IF;
END $$;
