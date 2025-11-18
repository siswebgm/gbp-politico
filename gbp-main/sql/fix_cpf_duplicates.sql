-- Script para identificar e corrigir CPFs duplicados
-- Adiciona constraint única para prevenir duplicatas futuras

-- 1. Backup dos dados antes da alteração (opcional, mas recomendado)
-- CREATE TABLE gbp_eleitores_backup AS SELECT * FROM gbp_eleitores;

-- 2. Verificar se existem CPFs duplicados na mesma empresa
SELECT 
    empresa_uid,
    cpf,
    COUNT(*) as quantidade,
    STRING_AGG(nome, ', ') as nomes,
    STRING_AGG(uid::text, ', ') as uids
FROM gbp_eleitores
WHERE cpf IS NOT NULL AND cpf != ''
GROUP BY empresa_uid, cpf
HAVING COUNT(*) > 1
ORDER BY quantidade DESC;

-- 3. Caso existam duplicatas, você pode decidir qual manter
-- Este é um exemplo de como manter apenas o registro mais recente
-- ATENÇÃO: Execute apenas após revisar as duplicatas acima!
/*
WITH duplicates AS (
    SELECT 
        uid,
        ROW_NUMBER() OVER (
            PARTITION BY empresa_uid, cpf 
            ORDER BY created_at DESC NULLS LAST
        ) as rn
    FROM gbp_eleitores
    WHERE cpf IS NOT NULL AND cpf != ''
)
DELETE FROM gbp_eleitores
WHERE uid IN (
    SELECT uid FROM duplicates WHERE rn > 1
);
*/

-- 4. Adicionar constraint única para CPF + empresa_uid
-- Isso impedirá futuras duplicatas
ALTER TABLE gbp_eleitores
DROP CONSTRAINT IF EXISTS unique_cpf_empresa;

ALTER TABLE gbp_eleitores
ADD CONSTRAINT unique_cpf_empresa 
UNIQUE (cpf, empresa_uid);

-- 5. Criar índice para melhorar performance de buscas por CPF
CREATE INDEX IF NOT EXISTS idx_gbp_eleitores_cpf 
ON gbp_eleitores(cpf);

CREATE INDEX IF NOT EXISTS idx_gbp_eleitores_cpf_empresa 
ON gbp_eleitores(cpf, empresa_uid);

-- 6. Verificar resultado
SELECT 
    COUNT(*) as total_eleitores,
    COUNT(DISTINCT cpf) as cpfs_unicos,
    COUNT(*) - COUNT(DISTINCT cpf) as possíveis_duplicatas
FROM gbp_eleitores
WHERE cpf IS NOT NULL AND cpf != '';
