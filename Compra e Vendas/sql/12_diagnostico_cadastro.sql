-- ============================================================================
-- Diagnóstico: Verificar por que o cadastro de usuário não está funcionando
-- ============================================================================

-- 1. Verificar se o trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'auth' 
  AND event_object_table = 'users'
  AND trigger_name LIKE '%auth_users%';

-- 2. Verificar se a função existe
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'marketplace'
  AND routine_name LIKE '%novo_usuario%';

-- 3. Verificar estrutura da tabela usuarios
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'marketplace'
  AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- 4. Verificar se há usuários cadastrados
SELECT 
  id,
  id_autenticacao,
  email,
  nome,
  criado_em
FROM marketplace.usuarios
ORDER BY criado_em DESC
LIMIT 5;

-- 5. Verificar constraints da tabela
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'c' THEN 'CHECK'
  END AS constraint_description
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE nsp.nspname = 'marketplace'
  AND rel.relname = 'usuarios';
