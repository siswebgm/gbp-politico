-- Novos planos (linha Básico Plus e linha Pró)
-- Execute no Supabase SQL Editor.
-- Não remove os planos existentes (Inter/Premium/Personalizado).
-- Guard contra duplicidade: só insere se ainda não existir plano
-- global (empresa_uid IS NULL) com o mesmo nome.

INSERT INTO gbp_planos (id, nome, descricao, valor, periodo_dias, empresa_uid, created_at)
SELECT gen_random_uuid(), v.nome, v.descricao, v.valor, 30, NULL, now()
FROM (
  VALUES
    (
      'Básico Plus 0.3.1',
      'Linha Básico Plus 0.3.1',
      700.00
    ),
    (
      'Plano Inter 2.0',
      'Linha Plano Inter 2.0',
      500.00
    ),
    (
      'Básico Plus 0.4',
      'Linha Básico Plus 0.4',
      2000.00
    ),
    (
      'Básico Plus 0.4.1',
      'Linha Básico Plus 0.4.1',
      2250.00
    ),
    (
      'Básico Plus 0.4.2',
      'Linha Básico Plus 0.4.2',
      2500.00
    ),
    (
      'Pró 3.0',
      'Linha Pró 3.0',
      350.00
    ),
    (
      'Pró 2.0',
      'Linha Pró 2.0',
      250.00
    ),
    (
      'Pró 1.0',
      'Linha Pró 1.0',
      200.00
    )
) AS v(nome, descricao, valor)
WHERE NOT EXISTS (
  SELECT 1 FROM gbp_planos p
  WHERE p.nome = v.nome AND p.empresa_uid IS NULL
);
