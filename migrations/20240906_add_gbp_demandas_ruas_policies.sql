-- Habilitar RLS (Row Level Security) na tabela
ALTER TABLE public.gbp_demandas_ruas ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de qualquer usuário autenticado
CREATE POLICY "Permitir inserção de demandas por qualquer usuário autenticado" 
ON public.gbp_demandas_ruas
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Política para permitir leitura das próprias demandas
CREATE POLICY "Permitir leitura das próprias demandas" 
ON public.gbp_demandas_ruas
FOR SELECT 
TO authenticated
USING (auth.uid() = empresa_uid::text);

-- Política para permitir atualização apenas pelo dono
CREATE POLICY "Permitir atualização pelo dono" 
ON public.gbp_demandas_ruas
FOR UPDATE 
TO authenticated
USING (auth.uid() = empresa_uid::text)
WITH CHECK (auth.uid() = empresa_uid::text);

-- Política para permitir deleção apenas pelo dono
CREATE POLICY "Permitir deleção pelo dono" 
ON public.gbp_demandas_ruas
FOR DELETE 
TO authenticated
USING (auth.uid() = empresa_uid::text);

-- Conceder permissões para o serviço
GRANT ALL ON public.gbp_demandas_ruas TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
