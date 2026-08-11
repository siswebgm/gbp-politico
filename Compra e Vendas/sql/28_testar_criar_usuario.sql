-- ============================================================================
-- Testar função criar_usuario diretamente
-- ============================================================================

-- Testar criação de usuário
SELECT * FROM public.criar_usuario(
  'novo@exemplo.com',
  'Senha123',
  'Novo Usuário',
  '(11) 98888-8888',
  NULL,
  NULL,
  'Rio de Janeiro',
  'RJ',
  '20000-000'
);

-- Verificar se foi criado
SELECT 
  a.uid as auth_uid,
  a.email,
  u.id as user_id,
  u.nome,
  u.cidade
FROM marketplace.autenticacao a
LEFT JOIN marketplace.usuarios u ON u.autenticacao_uid = a.uid
WHERE a.email = 'novo@exemplo.com';
