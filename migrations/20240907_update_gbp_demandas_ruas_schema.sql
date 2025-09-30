-- Atualiza a tabela gbp_demandas_ruas para remover colunas movidas para a tabela de requerentes
-- e garantir que o campo requerente_uid seja NOT NULL

-- 1. Primeiro, garante que todas as demandas tenham um requerente_uid válido
-- Se houver demandas sem requerente_uid, isso irá falhar
ALTER TABLE public.gbp_demandas_ruas 
  ALTER COLUMN requerente_uid SET NOT NULL;

-- 2. Remove as colunas que foram movidas para a tabela de requerentes
ALTER TABLE public.gbp_demandas_ruas
  DROP COLUMN IF EXISTS requerente_nome,
  DROP COLUMN IF EXISTS requerente_cpf,
  DROP COLUMN IF EXISTS requerente_whatsapp,
  DROP COLUMN IF EXISTS genero;

-- 3. Adiciona uma restrição de chave estrangeira mais rigorosa
ALTER TABLE public.gbp_demandas_ruas
  DROP CONSTRAINT IF EXISTS gbp_demandas_ruas_requerente_uid_fkey,
  ADD CONSTRAINT gbp_demandas_ruas_requerente_uid_fkey 
    FOREIGN KEY (requerente_uid) 
    REFERENCES public.gbp_requerentes_demanda_rua(uid) 
    ON DELETE RESTRICT;  -- Impede a exclusão de um requerente com demandas associadas

-- 4. Atualiza os comentários para refletir as mudanças
COMMENT ON COLUMN public.gbp_demandas_ruas.requerente_uid IS 'Referência ao requerente da demanda na tabela gbp_requerentes_demanda_rua';

-- 5. Atualiza as permissões se necessário
GRANT ALL ON TABLE public.gbp_demandas_ruas TO authenticated, service_role;
