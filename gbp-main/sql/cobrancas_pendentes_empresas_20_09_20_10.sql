-- Lança as mensalidades em aberto (20/09/2026 e 20/10/2026) para as empresas:
--   a44daa62-3608-40f3-842d-7a7cbd8d46ad
--   eb61b8bc-fc50-43b5-a783-e10633b05185
-- Idempotente: só insere o mês que ainda NÃO existir em gbp_pagamentos
-- (se algum já está lançado, ele não duplica).
-- Execute no Supabase SQL Editor.

WITH e(empresa_uid) AS (
  VALUES
    ('a44daa62-3608-40f3-842d-7a7cbd8d46ad'::uuid),
    ('eb61b8bc-fc50-43b5-a783-e10633b05185'::uuid)
),
a AS (
  -- assinatura mais recente de cada empresa
  SELECT DISTINCT ON (s.empresa_uid) s.id, s.empresa_uid
  FROM public.gbp_assinaturas s
  JOIN e ON e.empresa_uid = s.empresa_uid
  ORDER BY s.empresa_uid, s.data_fim DESC NULLS LAST
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
     (VALUES (DATE '2026-09-20'), (DATE '2026-10-20')) AS x(v)
WHERE NOT EXISTS (
  SELECT 1 FROM public.gbp_pagamentos p
  WHERE p.assinatura_id = a.id
    AND p.data_vencimento::date = v
    AND p.status IN ('pending', 'paid')
);

-- Conferir o resultado:
SELECT a.empresa_uid, p.data_vencimento::date AS vencimento, p.valor, p.status, p.tipo_pagamento
FROM public.gbp_pagamentos p
JOIN public.gbp_assinaturas a ON a.id = p.assinatura_id
WHERE a.empresa_uid IN (
  'a44daa62-3608-40f3-842d-7a7cbd8d46ad',
  'eb61b8bc-fc50-43b5-a783-e10633b05185'
)
ORDER BY a.empresa_uid, p.data_vencimento;
