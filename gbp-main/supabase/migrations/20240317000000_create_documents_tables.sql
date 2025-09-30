-- Create document tags table
CREATE TABLE gbp_documentos_tags (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  cor VARCHAR(7) NOT NULL,
  empresa_id BIGINT NOT NULL REFERENCES gbp_empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(nome, empresa_id)
);

-- Create documents table
CREATE TABLE gbp_documentos (
  id BIGSERIAL PRIMARY KEY,
  titulo VARCHAR(255) NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('law_project', 'office', 'requirement')),
  descricao TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'rejected', 'archived')),
  responsavel_id BIGINT NOT NULL REFERENCES gbp_usuarios(id),
  empresa_id BIGINT NOT NULL REFERENCES gbp_empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create document tags relationship table
CREATE TABLE gbp_documentos_tags_rel (
  documento_id BIGINT NOT NULL REFERENCES gbp_documentos(id) ON DELETE CASCADE,
  tag_id BIGINT NOT NULL REFERENCES gbp_documentos_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (documento_id, tag_id)
);

-- Create document updates table
CREATE TABLE gbp_documentos_updates (
  id BIGSERIAL PRIMARY KEY,
  documento_id BIGINT NOT NULL REFERENCES gbp_documentos(id) ON DELETE CASCADE,
  usuario_id BIGINT NOT NULL REFERENCES gbp_usuarios(id),
  descricao TEXT NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('draft', 'review', 'approved', 'rejected', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create document messages table
CREATE TABLE gbp_documentos_messages (
  id BIGSERIAL PRIMARY KEY,
  documento_id BIGINT NOT NULL REFERENCES gbp_documentos(id) ON DELETE CASCADE,
  usuario_id BIGINT NOT NULL REFERENCES gbp_usuarios(id),
  mensagem TEXT NOT NULL,
  lida BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create document approvals table
CREATE TABLE gbp_documentos_approvals (
  id BIGSERIAL PRIMARY KEY,
  documento_id BIGINT NOT NULL REFERENCES gbp_documentos(id) ON DELETE CASCADE,
  etapa INTEGER NOT NULL,
  usuario_id BIGINT NOT NULL REFERENCES gbp_usuarios(id),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comentario TEXT,
  data_aprovacao TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(documento_id, etapa, usuario_id)
);

-- Create indexes
CREATE INDEX idx_documentos_empresa_id ON gbp_documentos(empresa_id);
CREATE INDEX idx_documentos_responsavel_id ON gbp_documentos(responsavel_id);
CREATE INDEX idx_documentos_status ON gbp_documentos(status);
CREATE INDEX idx_documentos_tipo ON gbp_documentos(tipo);
CREATE INDEX idx_documentos_tags_empresa_id ON gbp_documentos_tags(empresa_id);
CREATE INDEX idx_documentos_updates_documento_id ON gbp_documentos_updates(documento_id);
CREATE INDEX idx_documentos_messages_documento_id ON gbp_documentos_messages(documento_id);
CREATE INDEX idx_documentos_messages_lida ON gbp_documentos_messages(lida);
CREATE INDEX idx_documentos_approvals_documento_id ON gbp_documentos_approvals(documento_id);
CREATE INDEX idx_documentos_approvals_status ON gbp_documentos_approvals(status);

-- Create realtime subscriptions
ALTER TABLE gbp_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_documentos_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_documentos_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_documentos_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_documentos_approvals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for users in same company" ON gbp_documentos
  FOR SELECT
  USING (empresa_id IN (
    SELECT empresa_id FROM gbp_usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "Enable write access for users in same company" ON gbp_documentos
  FOR INSERT
  WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM gbp_usuarios WHERE id = auth.uid()
  ));

-- Repeat similar policies for other tables