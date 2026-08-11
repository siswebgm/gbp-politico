-- ============================================================================
-- Criar usuário de teste manualmente para verificar o sistema
-- ============================================================================

-- 1. Verificar se há algum usuário cadastrado
SELECT 'Usuários na tabela autenticacao:' as info;
SELECT * FROM marketplace.autenticacao;

SELECT 'Usuários na tabela usuarios:' as info;
SELECT * FROM marketplace.usuarios;

-- 2. Criar usuário de teste manualmente
DO $$
DECLARE
  v_auth_uid UUID;
  v_user_uid UUID;
BEGIN
  -- Criar autenticação
  INSERT INTO marketplace.autenticacao (email, senha_hash)
  VALUES ('teste@exemplo.com', md5('Senha123' || 'teste@exemplo.com'))
  RETURNING uid INTO v_auth_uid;
  
  RAISE NOTICE 'Autenticação criada com UID: %', v_auth_uid;
  
  -- Criar usuário
  INSERT INTO marketplace.usuarios (
    autenticacao_uid,
    email,
    nome,
    telefone,
    cidade,
    estado,
    cep,
    situacao,
    papel
  )
  VALUES (
    v_auth_uid,
    'teste@exemplo.com',
    'Usuário Teste',
    '(11) 99999-9999',
    'São Paulo',
    'SP',
    '01234-567',
    'ativo',
    'usuario'
  )
  RETURNING id INTO v_user_uid;
  
  RAISE NOTICE 'Usuário criado com ID: %', v_user_uid;
END $$;

-- 3. Verificar se foi criado
SELECT 
  a.uid as auth_uid,
  a.email,
  a.senha_hash,
  u.id as user_id,
  u.nome,
  u.autenticacao_uid
FROM marketplace.autenticacao a
LEFT JOIN marketplace.usuarios u ON u.autenticacao_uid = a.uid
WHERE a.email = 'teste@exemplo.com';

-- 4. Testar autenticação
SELECT * FROM public.autenticar_usuario(
  'teste@exemplo.com',
  'Senha123'
);
