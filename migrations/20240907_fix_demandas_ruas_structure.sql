-- 1. Primeiro, vamos adicionar a coluna requerente_uid se ela não existir
ALTER TABLE public.gbp_demandas_ruas 
ADD COLUMN IF NOT EXISTS requerente_uid UUID 
  REFERENCES public.gbp_requerentes_demanda_rua(uid) 
  ON DELETE SET NULL;

-- 2. Migrar os dados existentes para a tabela de requerentes
-- Inserir na tabela de requerentes se não existir
INSERT INTO public.gbp_requerentes_demanda_rua (
    nome, cpf, whatsapp, genero, 
    cep, logradouro, numero, bairro, cidade, uf, referencia, 
    empresa_uid, criado_em, atualizado_em
)
SELECT DISTINCT ON (requerente_cpf)
    requerente_nome, 
    requerente_cpf, 
    requerente_whatsapp, 
    NULL as genero, -- Adicionado para compatibilidade
    cep, 
    logradouro, 
    numero, 
    bairro, 
    cidade, 
    uf, 
    referencia,
    empresa_uid,
    NOW(),
    NOW()
FROM 
    public.gbp_demandas_ruas d
WHERE 
    NOT EXISTS (
        SELECT 1 FROM public.gbp_requerentes_demanda_rua r 
        WHERE r.cpf = d.requerente_cpf
    )
    AND requerente_cpf IS NOT NULL;

-- 3. Atualizar os requerente_uid nas demandas existentes
UPDATE public.gbp_demandas_ruas d
SET requerente_uid = r.uid
FROM public.gbp_requerentes_demanda_rua r
WHERE d.requerente_cpf = r.cpf
AND d.requerente_uid IS NULL;

-- 4. Remover a restrição NOT NULL das colunas antigas
ALTER TABLE public.gbp_demandas_ruas 
  ALTER COLUMN requerente_nome DROP NOT NULL,
  ALTER COLUMN requerente_cpf DROP NOT NULL,
  ALTER COLUMN requerente_whatsapp DROP NOT NULL;

-- 5. Tornar requerente_uid obrigatório
ALTER TABLE public.gbp_demandas_ruas 
  ALTER COLUMN requerente_uid SET NOT NULL;

-- 6. Adicionar índice para melhorar o desempenho
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_requerente_uid 
  ON public.gbp_demandas_ruas(requerente_uid);

-- 7. (OPCIONAL) Remover as colunas antigas após confirmar que tudo está funcionando
-- ALTER TABLE public.gbp_demandas_ruas
--   DROP COLUMN requerente_nome,
--   DROP COLUMN requerente_cpf,
--   DROP COLUMN requerente_whatsapp;
