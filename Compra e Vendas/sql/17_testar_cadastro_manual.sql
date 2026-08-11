-- ============================================================================
-- Teste Manual de Cadastro - Simular o que a aplicação faz
-- ============================================================================

-- 1. Criar um usuário de teste no auth.users (simula Supabase Auth)
DO $$
DECLARE
  test_auth_id UUID := gen_random_uuid();
BEGIN
  -- Inserir no auth.users (isso dispara o trigger)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    instance_id,
    aud,
    role
  )
  VALUES (
    test_auth_id,
    'teste' || floor(random() * 10000) || '@exemplo.com',
    crypt('senha123', gen_salt('bf')),
    now(),
    jsonb_build_object('name', 'Usuário Teste'),
    now(),
    now(),
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated'
  );
  
  RAISE NOTICE 'Usuário de teste criado com ID: %', test_auth_id;
  
  -- Aguardar um momento para o trigger executar
  PERFORM pg_sleep(1);
  
  -- Verificar se foi criado na tabela usuarios
  IF EXISTS (SELECT 1 FROM marketplace.usuarios WHERE id_autenticacao = test_auth_id) THEN
    RAISE NOTICE 'SUCCESS: Usuário foi criado na tabela marketplace.usuarios!';
  ELSE
    RAISE WARNING 'FALHA: Usuário NÃO foi criado na tabela marketplace.usuarios!';
  END IF;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'ERRO ao criar usuário: % - %', SQLERRM, SQLSTATE;
END $$;

-- 2. Verificar usuários criados
SELECT 
  u.id,
  u.id_autenticacao,
  u.email,
  u.nome,
  u.papel,
  u.situacao,
  u.criado_em,
  au.email as auth_email
FROM marketplace.usuarios u
LEFT JOIN auth.users au ON au.id = u.id_autenticacao
ORDER BY u.criado_em DESC
LIMIT 5;

-- 3. Verificar se há erros nos logs (se disponível)
-- Nota: Isso pode não funcionar dependendo das permissões
SELECT 
  'Verificar logs do Supabase Dashboard para mais detalhes' as nota;
