-- Tabela de afiliados
CREATE TABLE IF NOT EXISTS gbp_afiliados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_uid UUID NOT NULL REFERENCES gbp_usuarios(uid) ON DELETE CASCADE,
  codigo_afiliado VARCHAR(20) UNIQUE NOT NULL,
  comissao_percentual DECIMAL(5,2) DEFAULT 10.00, -- 10% padrão
  saldo_comissoes DECIMAL(10,2) DEFAULT 0.00,
  total_comissoes DECIMAL(10,2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, blocked
  data_criacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de indicações
CREATE TABLE IF NOT EXISTS gbp_indicacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id UUID NOT NULL REFERENCES gbp_afiliados(id) ON DELETE CASCADE,
  empresa_uid UUID REFERENCES gbp_empresas(uid) ON DELETE SET NULL,
  codigo_afiliado VARCHAR(20) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, confirmed, cancelled
  comissao_valor DECIMAL(10,2) DEFAULT 0.00,
  data_indicacao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  data_confirmacao TIMESTAMP WITH TIME ZONE,
  data_cancelamento TIMESTAMP WITH TIME ZONE
);

-- Tabela de saques de comissões
CREATE TABLE IF NOT EXISTS gbp_saques_comissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id UUID NOT NULL REFERENCES gbp_afiliados(id) ON DELETE CASCADE,
  valor DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, paid, rejected
  dados_bancarios JSONB,
  solicitacao_data TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  aprovacao_data TIMESTAMP WITH TIME ZONE,
  pagamento_data TIMESTAMP WITH TIME ZONE,
  observacao TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_afiliados_usuario ON gbp_afiliados(usuario_uid);
CREATE INDEX IF NOT EXISTS idx_afiliados_codigo ON gbp_afiliados(codigo_afiliado);
CREATE INDEX IF NOT EXISTS idx_indicacoes_afiliado ON gbp_indicacoes(afiliado_id);
CREATE INDEX IF NOT EXISTS idx_indicacoes_empresa ON gbp_indicacoes(empresa_uid);
CREATE INDEX IF NOT EXISTS idx_indicacoes_codigo ON gbp_indicacoes(codigo_afiliado);
CREATE INDEX IF NOT EXISTS idx_indicacoes_status ON gbp_indicacoes(status);
CREATE INDEX IF NOT EXISTS idx_saques_afiliado ON gbp_saques_comissoes(afiliado_id);
CREATE INDEX IF NOT EXISTS idx_saques_status ON gbp_saques_comissoes(status);

-- Adiciona coluna de afiliado na tabela de empresas (para rastreamento)
ALTER TABLE gbp_empresas ADD COLUMN IF NOT EXISTS afiliado_codigo VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_empresas_afiliado_codigo ON gbp_empresas(afiliado_codigo);
