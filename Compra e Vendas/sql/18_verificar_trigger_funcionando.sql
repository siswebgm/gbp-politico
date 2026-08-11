-- ============================================================================
-- Verificar se o trigger está funcionando
-- ============================================================================

-- 1. Verificar se o trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users'
  AND trigger_name = 'trg_auth_users_insert';

-- 2. Verificar a função do trigger
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'marketplace'
  AND routine_name = 'tratar_novo_usuario';

-- 3. Verificar permissões da função
SELECT 
  proname as function_name,
  prosecdef as security_definer,
  provolatile as volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'marketplace'
  AND p.proname = 'tratar_novo_usuario';

-- 4. Testar inserção direta (bypass do trigger)
INSERT INTO marketplace.usuarios (
  id_autenticacao,
  email,
  nome,
  situacao,
  papel
)
VALUES (
  gen_random_uuid(),
  'teste_direto@exemplo.com',
  'Teste Direto',
  'ativo',
  'usuario'
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email, nome, situacao, papel;

-- 5. Verificar se foi criado
SELECT 
  id,
  email,
  nome,
  papel,
  situacao,
  criado_em
FROM marketplace.usuarios
ORDER BY criado_em DESC
LIMIT 3;
