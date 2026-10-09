-- ============================================================
-- Funde inscritos duplicados em gbp_notificacoes_inscritos
-- (mesma pessoa que ganhou um "novo cadastro" quando o token
-- FCM rotacionou). O histórico de conversas
-- (gbp_notificacoes_log.inscrito_uid) é transferido para o
-- registro canônico — o mais recente — e as linhas excedentes
-- são removidas.
--
-- Execute no SQL Editor do Supabase. Idempotente: pode rodar
-- mais de uma vez sem efeito colateral.
-- ============================================================

-- ------------------------------------------------------------
-- 1) Duplicados por eleitor_uid (mesma pessoa, mesma empresa)
-- ------------------------------------------------------------
WITH d AS (
  SELECT
    empresa_uid,
    eleitor_uid,
    (ARRAY_AGG(uid ORDER BY atualizado_em DESC NULLS LAST, criado_em DESC))[1] AS canonico_uid,
    (ARRAY_AGG(token ORDER BY (token IS NULL), atualizado_em DESC NULLS LAST, criado_em DESC))[1] AS melhor_token,
    (ARRAY_AGG(nome ORDER BY (nome IS NULL), atualizado_em DESC NULLS LAST, criado_em DESC))[1] AS melhor_nome,
    (ARRAY_AGG(telefone ORDER BY (telefone IS NULL), atualizado_em DESC NULLS LAST, criado_em DESC))[1] AS melhor_telefone,
    ARRAY_AGG(uid) AS uids
  FROM gbp_notificacoes_inscritos
  WHERE eleitor_uid IS NOT NULL
  GROUP BY empresa_uid, eleitor_uid
  HAVING COUNT(*) > 1
),
mover_logs AS (
  UPDATE gbp_notificacoes_log l
  SET inscrito_uid = d.canonico_uid
  FROM d
  WHERE l.inscrito_uid = ANY(d.uids)
    AND l.inscrito_uid <> d.canonico_uid
  RETURNING l.uid
),
completar AS (
  UPDATE gbp_notificacoes_inscritos i
  SET
    token    = COALESCE(i.token, d.melhor_token),
    nome     = COALESCE(i.nome, d.melhor_nome),
    telefone = COALESCE(i.telefone, d.melhor_telefone),
    atualizado_em = now()
  FROM d
  WHERE i.uid = d.canonico_uid
  RETURNING i.uid
)
DELETE FROM gbp_notificacoes_inscritos i
USING d
WHERE i.uid = ANY(d.uids)
  AND i.uid <> d.canonico_uid;

-- ------------------------------------------------------------
-- 2) Duplicados por telefone (últimos 9 dígitos), mesma empresa
-- ------------------------------------------------------------
WITH d AS (
  SELECT
    empresa_uid,
    RIGHT(regexp_replace(telefone, '\D', '', 'g'), 9) AS fone9,
    (ARRAY_AGG(uid ORDER BY atualizado_em DESC NULLS LAST, criado_em DESC))[1] AS canonico_uid,
    (ARRAY_AGG(token ORDER BY (token IS NULL), atualizado_em DESC NULLS LAST, criado_em DESC))[1] AS melhor_token,
    (ARRAY_AGG(nome ORDER BY (nome IS NULL), atualizado_em DESC NULLS LAST, criado_em DESC))[1] AS melhor_nome,
    ARRAY_AGG(uid) AS uids
  FROM gbp_notificacoes_inscritos
  WHERE telefone IS NOT NULL
    AND length(regexp_replace(telefone, '\D', '', 'g')) >= 8
  GROUP BY empresa_uid, RIGHT(regexp_replace(telefone, '\D', '', 'g'), 9)
  HAVING COUNT(*) > 1
),
mover_logs AS (
  UPDATE gbp_notificacoes_log l
  SET inscrito_uid = d.canonico_uid
  FROM d
  WHERE l.inscrito_uid = ANY(d.uids)
    AND l.inscrito_uid <> d.canonico_uid
  RETURNING l.uid
),
completar AS (
  UPDATE gbp_notificacoes_inscritos i
  SET
    token    = COALESCE(i.token, d.melhor_token),
    nome     = COALESCE(i.nome, d.melhor_nome),
    atualizado_em = now()
  FROM d
  WHERE i.uid = d.canonico_uid
  RETURNING i.uid
)
DELETE FROM gbp_notificacoes_inscritos i
USING d
WHERE i.uid = ANY(d.uids)
  AND i.uid <> d.canonico_uid;

-- ------------------------------------------------------------
-- 3) Duplicados por token idêntico, mesma empresa
-- ------------------------------------------------------------
WITH d AS (
  SELECT
    empresa_uid,
    token,
    (ARRAY_AGG(uid ORDER BY atualizado_em DESC NULLS LAST, criado_em DESC))[1] AS canonico_uid,
    (ARRAY_AGG(nome ORDER BY (nome IS NULL), atualizado_em DESC NULLS LAST, criado_em DESC))[1] AS melhor_nome,
    (ARRAY_AGG(telefone ORDER BY (telefone IS NULL), atualizado_em DESC NULLS LAST, criado_em DESC))[1] AS melhor_telefone,
    (ARRAY_AGG(eleitor_uid ORDER BY (eleitor_uid IS NULL), atualizado_em DESC NULLS LAST, criado_em DESC))[1] AS melhor_eleitor,
    ARRAY_AGG(uid) AS uids
  FROM gbp_notificacoes_inscritos
  WHERE token IS NOT NULL
  GROUP BY empresa_uid, token
  HAVING COUNT(*) > 1
),
mover_logs AS (
  UPDATE gbp_notificacoes_log l
  SET inscrito_uid = d.canonico_uid
  FROM d
  WHERE l.inscrito_uid = ANY(d.uids)
    AND l.inscrito_uid <> d.canonico_uid
  RETURNING l.uid
),
completar AS (
  UPDATE gbp_notificacoes_inscritos i
  SET
    nome        = COALESCE(i.nome, d.melhor_nome),
    telefone    = COALESCE(i.telefone, d.melhor_telefone),
    eleitor_uid = COALESCE(i.eleitor_uid, d.melhor_eleitor),
    atualizado_em = now()
  FROM d
  WHERE i.uid = d.canonico_uid
  RETURNING i.uid
)
DELETE FROM gbp_notificacoes_inscritos i
USING d
WHERE i.uid = ANY(d.uids)
  AND i.uid <> d.canonico_uid;

-- ------------------------------------------------------------
-- Conferir o resultado: deve retornar 0 grupos com >1 linha
-- ------------------------------------------------------------
SELECT 'por_eleitor' AS criterio, empresa_uid, eleitor_uid::text AS chave, COUNT(*)
FROM gbp_notificacoes_inscritos
WHERE eleitor_uid IS NOT NULL
GROUP BY empresa_uid, eleitor_uid
HAVING COUNT(*) > 1
UNION ALL
SELECT 'por_telefone', empresa_uid, RIGHT(regexp_replace(telefone, '\D', '', 'g'), 9), COUNT(*)
FROM gbp_notificacoes_inscritos
WHERE telefone IS NOT NULL AND length(regexp_replace(telefone, '\D', '', 'g')) >= 8
GROUP BY empresa_uid, RIGHT(regexp_replace(telefone, '\D', '', 'g'), 9)
HAVING COUNT(*) > 1;
