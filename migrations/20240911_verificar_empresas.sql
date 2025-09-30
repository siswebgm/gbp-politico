-- 1. Ver empresas existentes
SELECT uid, nome, criado_em 
FROM public.gbp_empresas 
ORDER BY criado_em DESC
LIMIT 5;

-- 2. Ver permissões da tabela de empresas
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'gbp_empresas';

-- 3. Ver políticas RLS da tabela de empresas
SELECT * FROM pg_policies 
WHERE tablename = 'gbp_empresas';
