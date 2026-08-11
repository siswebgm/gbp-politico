-- ============================================================================
-- Diagnóstico Completo: Por que o cadastro não funciona
-- ============================================================================

-- 1. Verificar se a tabela usuarios existe e sua estrutura
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'marketplace' 
  AND table_name = 'usuarios'
ORDER BY ordinal_position;

-- 2. Verificar se o trigger existe e está ativo
SELECT 
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 3. Verificar se a função do trigger existe
SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_schema = 'marketplace'
  AND routine_name = 'tratar_novo_usuario';

-- 4. Testar criação manual de usuário
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Simular o que o trigger deveria fazer
  test_user_id := gen_random_uuid();
  
  INSERT INTO marketplace.usuarios (
    id_autenticacao, 
    email, 
    nome, 
    email_confirmado, 
    situacao, 
    papel, 
    ultimo_acesso
  )
  VALUES (
    test_user_id,
    'teste@exemplo.com',
    'Usuário Teste',
    false,
    'ativo',
    'usuario',
    now()
  )
  ON CONFLICT (id_autenticacao) DO NOTHING;
  
  RAISE NOTICE 'Teste de inserção concluído. ID: %', test_user_id;
END $$;

-- 5. Verificar se o usuário de teste foi criado
SELECT 
  id,
  id_autenticacao,
  email,
  nome,
  situacao,
  criado_em
FROM marketplace.usuarios
WHERE email = 'teste@exemplo.com';

-- 6. Verificar permissões RLS na tabela usuarios
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'marketplace'
  AND tablename = 'usuarios';

-- 7. Verificar políticas RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'marketplace'
  AND tablename = 'usuarios';

-- 8. Limpar usuário de teste
DELETE FROM marketplace.usuarios WHERE email = 'teste@exemplo.com';
