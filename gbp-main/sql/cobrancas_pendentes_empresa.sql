-- Lança as mensalidades em aberto (05/09/2026 e 05/10/2026) para a empresa
-- 8a6af4b0-47ca-4c43-9b12-f676036dec61.
-- Idempotente: só insere o mês que ainda NÃO existir em gbp_pagamentos
-- (se um dos dois já está lançado, ele não duplica).
-- Execute no Supabase SQL Editor.

WITH a AS (
  -- assinatura mais recente da empresa
  SELECT id
  FROM public.gbp_assinaturas
  WHERE empresa_uid = '8a6af4b0-47ca-4c43-9b12-f676036dec61'
  ORDER BY data_fim DESC NULLS LAST
  LIMIT 1
)
INSERT INTO public.gbp_pagamentos
  (assinatura_id, valor, tipo_pagamento, status, data_vencimento)
SELECT
  a.id,
  -- valor: replica a última cobrança da assinatura; senão usa o valor do plano
  COALESCE(
    (SELECT p.valor FROM public.gbp_pagamentos p
     WHERE p.assinatura_id = a.id ORDER BY p.created_at DESC LIMIT 1),
    (SELECT pl.valor FROM public.gbp_planos pl
     JOIN public.gbp_assinaturas a2 ON a2.plano_id = pl.id
     WHERE a2.id = a.id)
  ),
  'pix',
  'pending',
  v
FROM a,
     (VALUES (DATE '2026-09-05'), (DATE '2026-10-05')) AS x(v)
WHERE NOT EXISTS (
  SELECT 1 FROM public.gbp_pagamentos p
  WHERE p.assinatura_id = a.id
    AND p.data_vencimento::date = v
    AND p.status IN ('pending', 'paid')
);

-- Conferir o resultado:
SELECT p.data_vencimento::date AS vencimento, p.valor, p.status, p.tipo_pagamento
FROM public.gbp_pagamentos p
JOIN public.gbp_assinaturas a ON a.id = p.assinatura_id
WHERE a.empresa_uid = '8a6af4b0-47ca-4c43-9b12-f676036dec61'
ORDER BY p.data_vencimento;
