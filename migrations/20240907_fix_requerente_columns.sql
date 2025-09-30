-- 1. Primeiro, vamos garantir que todas as demandas tenham um requerente_uid válido
-- Vamos usar os dados existentes para preencher a tabela de requerentes

-- Inserir requerentes baseados nos dados atuais das demandas
INSERT INTO public.gbp_requerentes_demanda_rua (
    uid, nome, cpf, whatsapp, genero, 
    cep, logradouro, numero, bairro, cidade, uf, referencia, 
    empresa_uid, criado_em, atualizado_em
)
SELECT 
    gen_random_uuid(),
    requerente_nome, 
    requerente_cpf, 
    requerente_whatsapp, 
    genero, 
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
    public.gbp_demandas_ruas
WHERE 
    requerente_uid IS NULL
    AND requerente_cpf IS NOT NULL
ON CONFLICT (cpf) DO NOTHING;

-- Atualizar os requerente_uid nas demandas com base no CPF
UPDATE public.gbp_demandas_ruas d
SET requerente_uid = r.uid
FROM public.gbp_requerentes_demanda_rua r
WHERE d.requerente_cpf = r.cpf
AND d.requerente_uid IS NULL;

-- 2. Remover a restrição NOT NULL das colunas que serão removidas
ALTER TABLE public.gbp_demandas_ruas 
  ALTER COLUMN requerente_nome DROP NOT NULL,
  ALTER COLUMN requerente_cpf DROP NOT NULL,
  ALTER COLUMN requerente_whatsapp DROP NOT NULL;

-- 3. Adicionar NOT NULL ao requerente_uid
ALTER TABLE public.gbp_demandas_ruas 
  ALTER COLUMN requerente_uid SET NOT NULL;

-- 4. (Opcional) Remover as colunas antigas após confirmar que a migração foi bem-sucedida
-- ALTER TABLE public.gbp_demandas_ruas
--   DROP COLUMN requerente_nome,
--   DROP COLUMN requerente_cpf,
--   DROP COLUMN requerente_whatsapp,
--   DROP COLUMN genero;
