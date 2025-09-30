-- Verificar se a tabela gbp_demandas_ruas existe
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE  table_schema = 'public'
   AND    table_name   = 'gbp_demandas_ruas'
) AS tabela_existe;

-- Verificar se existem dados na tabela
SELECT COUNT(*) AS total_registros FROM public.gbp_demandas_ruas;

-- Verificar as primeiras 5 linhas da tabela
SELECT * FROM public.gbp_demandas_ruas LIMIT 5;

-- Verificar se a tabela de empresas contém a empresa de teste
SELECT * FROM public.gbp_empresas WHERE uid = '9475af96-553b-4a90-accb-39d46aedc6ce';

-- Verificar as políticas da tabela
SELECT * FROM pg_policies WHERE tablename = 'gbp_demandas_ruas';
