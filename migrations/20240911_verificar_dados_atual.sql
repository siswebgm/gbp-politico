-- Verificar estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns 
WHERE 
    table_name = 'gbp_demandas_ruas';

-- Verificar total de registros
SELECT 
    COUNT(*) AS total_registros 
FROM 
    public.gbp_demandas_ruas;

-- Verificar registros da empresa específica
SELECT 
    uid,
    tipo_de_demanda,
    status,
    demanda_concluida,
    demanda_concluida_data,
    criado_em,
    atualizado_em
FROM 
    public.gbp_demandas_ruas
WHERE 
    empresa_uid = '9475af96-553b-4a90-accb-39d46aedc6ce'
ORDER BY 
    criado_em DESC;

-- Verificar se existem políticas RLS ativas
SELECT * FROM pg_policies 
WHERE tablename = 'gbp_demandas_ruas';

-- Verificar permissões da tabela
SELECT 
    grantee,
    privilege_type
FROM 
    information_schema.role_table_grants
WHERE 
    table_name = 'gbp_demandas_ruas'
    AND table_schema = 'public';
