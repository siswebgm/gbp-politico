-- Liberação condicionada a quitação total:
-- A empresa só é reativada quando o pagamento confirmado for o
-- ÚLTIMO pendente da assinatura. Se ainda houver outras cobranças
-- pending/overdue, a empresa permanece bloqueada.
-- Execute no Supabase SQL Editor.

CREATE OR REPLACE FUNCTION atualizar_status_empresa()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    -- Só libera se não houver outra pendência na mesma assinatura
    -- (NEW já está 'paid', então não é contado aqui)
    IF NOT EXISTS (
      SELECT 1
      FROM gbp_pagamentos p
      WHERE p.assinatura_id = NEW.assinatura_id
        AND p.status IN ('pending', 'overdue')
    ) THEN
      UPDATE gbp_empresas e
      SET status = 'active',
          data_expiracao = a.data_fim
      FROM gbp_assinaturas a
      WHERE a.id = NEW.assinatura_id
        AND e.uid = a.empresa_uid;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- O trigger existente 'pagamento_confirmado' continua apontando
-- para a função atualizada — não precisa recriar.

NOTIFY pgrst, 'reload schema';
