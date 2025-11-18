-- Tabela de Moradores
CREATE TABLE IF NOT EXISTS gbp_moradores (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento TEXT NOT NULL,
  bloco TEXT NOT NULL,
  apartamento TEXT NOT NULL,
  nome_responsavel TEXT NOT NULL,
  telefone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Dependentes
CREATE TABLE IF NOT EXISTS gbp_dependentes (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  morador_uid UUID NOT NULL REFERENCES gbp_moradores(uid) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  parentesco TEXT,
  idade INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_moradores_empreendimento ON gbp_moradores(empreendimento);
CREATE INDEX IF NOT EXISTS idx_moradores_bloco ON gbp_moradores(bloco);
CREATE INDEX IF NOT EXISTS idx_moradores_apartamento ON gbp_moradores(apartamento);
CREATE INDEX IF NOT EXISTS idx_moradores_created_at ON gbp_moradores(created_at);
CREATE INDEX IF NOT EXISTS idx_dependentes_morador_uid ON gbp_dependentes(morador_uid);

-- Comentários nas tabelas
COMMENT ON TABLE gbp_moradores IS 'Tabela de cadastro de moradores de empreendimentos';
COMMENT ON TABLE gbp_dependentes IS 'Tabela de dependentes/residentes vinculados aos moradores';

-- Habilitar RLS (Row Level Security)
ALTER TABLE gbp_moradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_dependentes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para inserção (permitir cadastro público)
CREATE POLICY "Permitir inserção pública de moradores"
  ON gbp_moradores
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Permitir inserção pública de dependentes"
  ON gbp_dependentes
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Políticas de leitura (apenas usuários autenticados)
CREATE POLICY "Permitir leitura de moradores para usuários autenticados"
  ON gbp_moradores
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir leitura de dependentes para usuários autenticados"
  ON gbp_dependentes
  FOR SELECT
  TO authenticated
  USING (true);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar updated_at
CREATE TRIGGER update_moradores_updated_at
  BEFORE UPDATE ON gbp_moradores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dependentes_updated_at
  BEFORE UPDATE ON gbp_dependentes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
