-- Corrige a função do trigger pagamento_confirmado.
-- Bug: o CTE usava "SELECT a.*, e.uid as empresa_uid" — a.* já traz
-- empresa_uid, gerando "column reference empresa_uid is ambiguous"
-- e fazendo TODO update de status='paid' em gbp_pagamentos falhar.
-- Execute no Supabase SQL Editor.

CREATE OR REPLACE FUNCTION atualizar_status_empresa()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o pagamento foi confirmado, ativa a empresa e
  -- estende a expiração até o fim da assinatura
  IF NEW.status = 'paid' THEN
    UPDATE gbp_empresas e
    SET status = 'active',
        data_expiracao = a.data_fim
    FROM gbp_assinaturas a
    WHERE a.id = NEW.assinatura_id
      AND e.uid = a.empresa_uid;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- O trigger existente continua apontando para a função corrigida.
