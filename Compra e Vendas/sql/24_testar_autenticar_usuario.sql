-- ============================================================================
-- Testar função autenticar_usuario diretamente
-- ============================================================================

-- Testar com o usuário que foi cadastrado
SELECT * FROM public.autenticar_usuario(
  'joao@exemplo.com',
  'Senha123'
);

-- Verificar se o usuário existe na tabela autenticacao
SELECT 
  uid,
  email,
  senha_hash,
  email_confirmado,
  criado_em
FROM marketplace.autenticacao
WHERE email = 'joao@exemplo.com';

-- Verificar se o usuário existe na tabela usuarios
SELECT 
  id,
  email,
  nome,
  papel,
  situacao,
  criado_em
FROM marketplace.usuarios
WHERE email = 'joao@exemplo.com';

-- Testar hash MD5 manualmente
SELECT 
  md5('Senha123' || 'joao@exemplo.com') as hash_gerado,
  senha_hash as hash_armazenado
FROM marketplace.autenticacao
WHERE email = 'joao@exemplo.com';
