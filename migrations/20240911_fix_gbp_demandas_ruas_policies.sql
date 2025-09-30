-- Remover políticas existentes
DROP POLICY IF EXISTS "Permitir leitura das próprias demandas" ON public.gbp_demandas_ruas;
DROP POLICY IF EXISTS "Permitir atualização pelo dono" ON public.gbp_demandas_ruas;
DROP POLICY IF EXISTS "Permitir deleção pelo dono" ON public.gbp_demandas_ruas;

-- Adicionar políticas corrigidas
-- Política para permitir leitura das demandas da empresa do usuário
CREATE POLICY "Permitir leitura das demandas da empresa" 
ON public.gbp_demandas_ruas
FOR SELECT 
TO authenticated
USING (empresa_uid::text IN (
  SELECT uid::text FROM public.gbp_empresas 
  WHERE uid::text = empresa_uid::text
));

-- Política para permitir atualização apenas por usuários da empresa
CREATE POLICY "Permitir atualização por usuários da empresa" 
ON public.gbp_demandas_ruas
FOR UPDATE 
TO authenticated
USING (empresa_uid::text IN (
  SELECT uid::text FROM public.gbp_empresas 
  WHERE uid::text = empresa_uid::text
))
WITH CHECK (empresa_uid::text IN (
  SELECT uid::text FROM public.gbp_empresas 
  WHERE uid::text = empresa_uid::text
));

-- Política para permitir deleção apenas por usuários da empresa
CREATE POLICY "Permitir deleção por usuários da empresa" 
ON public.gbp_demandas_ruas
FOR DELETE 
TO authenticated
USING (empresa_uid::text IN (
  SELECT uid::text FROM public.gbp_empresas 
  WHERE uid::text = empresa_uid::text
));

-- Garantir que o usuário autenticado tenha acesso à tabela de empresas
GRANT SELECT ON public.gbp_empresas TO authenticated;
