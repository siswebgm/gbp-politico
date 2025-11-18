-- Tabela de Empreendimentos
CREATE TABLE IF NOT EXISTS gbp_empreendimentos (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cidade TEXT NOT NULL,
  endereco TEXT,
  cep TEXT,
  total_blocos INTEGER DEFAULT 0,
  total_apartamentos INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Blocos do Empreendimento
CREATE TABLE IF NOT EXISTS gbp_blocos (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empreendimento_uid UUID NOT NULL REFERENCES gbp_empreendimentos(uid) ON DELETE CASCADE,
  nome TEXT NOT NULL, -- Ex: A, B, C, Torre 1, Torre 2
  total_andares INTEGER DEFAULT 0,
  apartamentos_por_andar INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(empreendimento_uid, nome)
);

-- Tabela de Apartamentos
CREATE TABLE IF NOT EXISTS gbp_apartamentos (
  uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bloco_uid UUID NOT NULL REFERENCES gbp_blocos(uid) ON DELETE CASCADE,
  numero TEXT NOT NULL, -- Ex: 101, 102, 201, 202
  andar INTEGER,
  metragem DECIMAL(10,2),
  quartos INTEGER,
  ocupado BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bloco_uid, numero)
);

-- Atualizar tabela de moradores para usar referências
ALTER TABLE gbp_moradores 
  DROP COLUMN IF EXISTS empreendimento,
  DROP COLUMN IF EXISTS bloco,
  DROP COLUMN IF EXISTS apartamento,
  ADD COLUMN IF NOT EXISTS apartamento_uid UUID REFERENCES gbp_apartamentos(uid) ON DELETE SET NULL;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_empreendimentos_cidade ON gbp_empreendimentos(cidade);
CREATE INDEX IF NOT EXISTS idx_empreendimentos_ativo ON gbp_empreendimentos(ativo);
CREATE INDEX IF NOT EXISTS idx_blocos_empreendimento ON gbp_blocos(empreendimento_uid);
CREATE INDEX IF NOT EXISTS idx_apartamentos_bloco ON gbp_apartamentos(bloco_uid);
CREATE INDEX IF NOT EXISTS idx_apartamentos_ocupado ON gbp_apartamentos(ocupado);
CREATE INDEX IF NOT EXISTS idx_moradores_apartamento ON gbp_moradores(apartamento_uid);

-- Comentários nas tabelas
COMMENT ON TABLE gbp_empreendimentos IS 'Tabela de empreendimentos/condomínios';
COMMENT ON TABLE gbp_blocos IS 'Tabela de blocos/torres dos empreendimentos';
COMMENT ON TABLE gbp_apartamentos IS 'Tabela de apartamentos dos blocos';

-- Habilitar RLS (Row Level Security)
ALTER TABLE gbp_empreendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_blocos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_apartamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para leitura (permitir consulta pública)
CREATE POLICY "Permitir leitura pública de empreendimentos ativos"
  ON gbp_empreendimentos
  FOR SELECT
  TO anon
  USING (ativo = true);

CREATE POLICY "Permitir leitura pública de blocos"
  ON gbp_blocos
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Permitir leitura pública de apartamentos"
  ON gbp_apartamentos
  FOR SELECT
  TO anon
  USING (true);

-- Políticas de escrita (apenas usuários autenticados)
CREATE POLICY "Permitir todas operações para usuários autenticados - empreendimentos"
  ON gbp_empreendimentos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir todas operações para usuários autenticados - blocos"
  ON gbp_blocos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir todas operações para usuários autenticados - apartamentos"
  ON gbp_apartamentos
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_empreendimentos_updated_at
  BEFORE UPDATE ON gbp_empreendimentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_blocos_updated_at
  BEFORE UPDATE ON gbp_blocos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apartamentos_updated_at
  BEFORE UPDATE ON gbp_apartamentos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo
INSERT INTO gbp_empreendimentos (nome, cidade, endereco, total_blocos, total_apartamentos, ativo)
VALUES 
  ('Residencial Jardim das Flores', 'São Paulo', 'Rua das Flores, 123', 3, 120, true),
  ('Condomínio Vista Verde', 'Rio de Janeiro', 'Av. Principal, 456', 2, 80, true),
  ('Edifício Solar', 'Belo Horizonte', 'Rua do Sol, 789', 1, 40, true)
ON CONFLICT DO NOTHING;

-- Inserir blocos de exemplo para o primeiro empreendimento
INSERT INTO gbp_blocos (empreendimento_uid, nome, total_andares, apartamentos_por_andar)
SELECT uid, 'Bloco A', 10, 4 FROM gbp_empreendimentos WHERE nome = 'Residencial Jardim das Flores'
ON CONFLICT DO NOTHING;

INSERT INTO gbp_blocos (empreendimento_uid, nome, total_andares, apartamentos_por_andar)
SELECT uid, 'Bloco B', 10, 4 FROM gbp_empreendimentos WHERE nome = 'Residencial Jardim das Flores'
ON CONFLICT DO NOTHING;

INSERT INTO gbp_blocos (empreendimento_uid, nome, total_andares, apartamentos_por_andar)
SELECT uid, 'Bloco C', 10, 4 FROM gbp_empreendimentos WHERE nome = 'Residencial Jardim das Flores'
ON CONFLICT DO NOTHING;
