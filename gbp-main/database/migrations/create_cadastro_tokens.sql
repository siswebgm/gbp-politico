-- Tabela de tokens para cadastro de moradores
CREATE TABLE IF NOT EXISTS gbp_cadastro_tokens (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  empreendimento_uid UUID REFERENCES gbp_empreendimentos(uid) ON DELETE CASCADE,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'usado', 'expirado')),
  usado_em TIMESTAMP WITH TIME ZONE,
  expira_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_cadastro_tokens_token ON gbp_cadastro_tokens(token);
CREATE INDEX IF NOT EXISTS idx_cadastro_tokens_status ON gbp_cadastro_tokens(status);
CREATE INDEX IF NOT EXISTS idx_cadastro_tokens_empreendimento ON gbp_cadastro_tokens(empreendimento_uid);

-- RLS
ALTER TABLE gbp_cadastro_tokens ENABLE ROW LEVEL SECURITY;

-- Política de leitura pública (para validar tokens)
CREATE POLICY "Permitir leitura pública de tokens"
  ON gbp_cadastro_tokens
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Política de inserção pública (para criar tokens)
CREATE POLICY "Permitir inserção pública de tokens"
  ON gbp_cadastro_tokens
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política de atualização pública (para marcar como usado)
CREATE POLICY "Permitir atualização pública de tokens"
  ON gbp_cadastro_tokens
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Política para usuários autenticados (todas operações)
CREATE POLICY "Permitir todas operações para usuários autenticados - tokens"
  ON gbp_cadastro_tokens
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_cadastro_tokens_updated_at
  BEFORE UPDATE ON gbp_cadastro_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON TABLE gbp_cadastro_tokens IS 'Tokens únicos para cadastro de moradores via link';
COMMENT ON COLUMN gbp_cadastro_tokens.token IS 'Token único gerado para o link de cadastro';
COMMENT ON COLUMN gbp_cadastro_tokens.status IS 'Status do token: pendente, usado ou expirado';
COMMENT ON COLUMN gbp_cadastro_tokens.usado_em IS 'Data e hora em que o token foi usado';
COMMENT ON COLUMN gbp_cadastro_tokens.expira_em IS 'Data e hora de expiração do token (opcional)';
