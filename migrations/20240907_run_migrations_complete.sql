-- Script para executar todas as migrações necessárias

-- 1. Criar a tabela de requerentes se não existir
\i migrations/20240907_create_gbp_requerentes_demanda_rua.sql

-- 2. Atualizar a estrutura da tabela gbp_demandas_ruas
\i migrations/20240907_update_gbp_demandas_ruas_schema.sql

-- 3. Verificar se as alterações foram aplicadas
\d gbp_demandas_ruas

-- 4. Verificar as permissões
\dp gbp_demandas_ruas

-- 5. Verificar a tabela de requerentes
\d gbp_requerentes_demanda_rua

-- 6. Verificar as relações entre as tabelas
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND (tc.table_name = 'gbp_demandas_ruas' OR tc.table_name = 'gbp_requerentes_demanda_rua');
