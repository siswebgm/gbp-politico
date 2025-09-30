-- Tabela de Planos
CREATE TABLE gbp_planos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(255) NOT NULL,
  descricao TEXT,
  valor DECIMAL(10,2) NOT NULL,
  periodo_dias INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Assinaturas
CREATE TABLE gbp_assinaturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_uid UUID REFERENCES gbp_empresas(uid),
  plano_id UUID REFERENCES gbp_planos(id),
  status VARCHAR(50) NOT NULL, -- 'active', 'pending', 'cancelled', 'overdue'
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  data_vencimento TIMESTAMP WITH TIME ZONE NOT NULL,
  dias_tolerancia INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Pagamentos
CREATE TABLE gbp_pagamentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assinatura_id UUID REFERENCES gbp_assinaturas(id),
  valor DECIMAL(10,2) NOT NULL,
  tipo_pagamento VARCHAR(50) NOT NULL, -- 'pix', 'boleto'
  status VARCHAR(50) NOT NULL, -- 'pending', 'paid', 'cancelled', 'failed'
  gateway_id VARCHAR(255), -- ID do pagamento no gateway
  gateway_url VARCHAR(255), -- URL do boleto ou QR code do PIX
  data_pagamento TIMESTAMP WITH TIME ZONE,
  data_vencimento TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Função para atualizar o status da empresa baseado no pagamento
CREATE OR REPLACE FUNCTION atualizar_status_empresa()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o pagamento foi confirmado
  IF NEW.status = 'paid' THEN
    -- Busca a assinatura e empresa
    WITH assinatura AS (
      SELECT a.*, e.uid as empresa_uid
      FROM gbp_assinaturas a
      JOIN gbp_empresas e ON e.uid = a.empresa_uid
      WHERE a.id = NEW.assinatura_id
    )
    -- Atualiza o status da empresa
    UPDATE gbp_empresas
    SET 
      status = 'active',
      data_expiracao = (SELECT data_fim FROM assinatura)
    WHERE uid = (SELECT empresa_uid FROM assinatura);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar status da empresa quando um pagamento é confirmado
CREATE TRIGGER pagamento_confirmado
AFTER UPDATE ON gbp_pagamentos
FOR EACH ROW
WHEN (OLD.status != 'paid' AND NEW.status = 'paid')
EXECUTE FUNCTION atualizar_status_empresa();

-- Função para verificar assinaturas vencidas diariamente
CREATE OR REPLACE FUNCTION verificar_assinaturas_vencidas()
RETURNS void AS $$
BEGIN
  -- Atualiza status das empresas com assinaturas vencidas
  UPDATE gbp_empresas e
  SET status = 'blocked'
  FROM gbp_assinaturas a
  WHERE e.uid = a.empresa_uid
  AND a.status = 'active'
  AND e.status = 'active'
  AND CURRENT_TIMESTAMP > (a.data_vencimento + (a.dias_tolerancia * INTERVAL '1 day'));
END;
$$ LANGUAGE plpgsql;

-- Adiciona coluna para ID do cliente no Asaas
ALTER TABLE gbp_empresas
ADD COLUMN IF NOT EXISTS asaas_customer_id VARCHAR(255); 