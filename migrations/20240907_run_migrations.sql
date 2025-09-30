-- Script para executar as migrações necessárias

-- 1. Primeiro, garantir que a tabela de requerentes existe
\i migrations/20240907_create_gbp_requerentes_demanda_rua.sql

-- 2. Atualizar a estrutura da tabela gbp_demandas_ruas
\i migrations/20240907_update_gbp_demandas_ruas_schema.sql

-- 3. Verificar se as alterações foram aplicadas
\d gbp_demandas_ruas

-- 4. Verificar as permissões
\dp gbp_demandas_ruas
