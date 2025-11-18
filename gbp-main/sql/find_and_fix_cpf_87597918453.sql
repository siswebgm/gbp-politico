-- Script para identificar e corrigir o CPF duplicado específico: 87597918453
-- Empresa: 2e0500a3-fff8-4061-9a1f-39ef4bd8ca1f

-- 1. Verificar os registros duplicados
SELECT 
    uid,
    nome,
    cpf,
    empresa_uid,
    created_at,
    updated_at,
    responsavel,
    categoria_uid,
    indicado_uid
FROM gbp_eleitores
WHERE cpf = '87597918453'
  AND empresa_uid = '2e0500a3-fff8-4061-9a1f-39ef4bd8ca1f'
ORDER BY created_at ASC;

-- 2. Verificar se há atendimentos vinculados a cada registro
SELECT 
    e.uid as eleitor_uid,
    e.nome,
    e.created_at as eleitor_criado_em,
    COUNT(a.uid) as total_atendimentos
FROM gbp_eleitores e
LEFT JOIN gbp_atendimentos a ON a.eleitor_uid = e.uid
WHERE e.cpf = '87597918453'
  AND e.empresa_uid = '2e0500a3-fff8-4061-9a1f-39ef4bd8ca1f'
GROUP BY e.uid, e.nome, e.created_at
ORDER BY e.created_at ASC;

-- 3. DECISÃO: Qual registro manter?
-- Opção A: Manter o mais antigo (primeiro cadastrado)
-- Opção B: Manter o mais recente (último cadastrado)
-- Opção C: Manter o que tem mais atendimentos

-- 4. EXEMPLO: Deletar o registro MAIS RECENTE (manter o mais antigo)
-- ATENÇÃO: Revise os UIDs antes de executar!
/*
-- Passo 1: Anotar o UID do registro que você quer MANTER
-- Passo 2: Deletar os outros

DELETE FROM gbp_eleitores
WHERE uid IN (
    SELECT uid 
    FROM gbp_eleitores
    WHERE cpf = '87597918453'
      AND empresa_uid = '2e0500a3-fff8-4061-9a1f-39ef4bd8ca1f'
    ORDER BY created_at DESC
    LIMIT 1  -- Deleta apenas o mais recente
);
*/

-- 5. Verificar resultado após deletar
SELECT 
    uid,
    nome,
    cpf,
    empresa_uid,
    created_at
FROM gbp_eleitores
WHERE cpf = '87597918453'
  AND empresa_uid = '2e0500a3-fff8-4061-9a1f-39ef4bd8ca1f';

-- 6. Buscar TODAS as duplicatas no banco (não só este CPF)
SELECT 
    empresa_uid,
    cpf,
    COUNT(*) as quantidade,
    STRING_AGG(nome, ' | ') as nomes,
    STRING_AGG(uid::text, ' | ') as uids,
    STRING_AGG(created_at::text, ' | ') as datas_criacao
FROM gbp_eleitores
WHERE cpf IS NOT NULL AND cpf != ''
GROUP BY empresa_uid, cpf
HAVING COUNT(*) > 1
ORDER BY quantidade DESC, cpf;
