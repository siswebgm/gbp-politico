-- ============================================================================
-- AUDITORIA DE SEGURANÇA — DIAGNÓSTICO (SOMENTE LEITURA)
-- Rode no SQL Editor do Supabase de PRODUÇÃO.
-- Nenhuma query aqui altera dados ou permissões.
-- ============================================================================

-- 1) Tabelas gbp_* SEM Row Level Security habilitado
--    (tudo listado aqui está acessível pela anon key, sem restrição)
SELECT c.relname AS tabela_sem_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity
  AND c.relname LIKE 'gbp%'
ORDER BY c.relname;

-- 2) Tabelas gbp_* COM RLS habilitado (mas sem FORÇA no owner)
SELECT c.relname AS tabela_com_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity
  AND c.relname LIKE 'gbp%'
ORDER BY c.relname;

-- 3) Policies existentes: quem pode o quê, e qual a condição
SELECT tablename,
       policyname,
       cmd,
       roles,
       qual      AS using_clause,
       with_check AS check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 4) Grants de tabela para o role anon (o que a anon key pode fazer)
SELECT table_name,
       privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND grantee = 'anon'
  AND table_name LIKE 'gbp%'
ORDER BY table_name, privilege_type;

-- 5) Funções RPC executáveis por anon (candidatas a abuso)
SELECT p.proname AS funcao,
       pg_get_function_arguments(p.oid) AS argumentos,
       p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND has_function_privilege('anon', p.oid, 'EXECUTE')
ORDER BY p.proname;

-- 6) Conferir se a coluna senha é texto puro (amostra sem expor valores)
SELECT count(*) AS total_usuarios,
       count(*) FILTER (WHERE senha IS NOT NULL) AS com_senha,
       min(length(senha)) AS menor_senha,
       max(length(senha)) AS maior_senha,
       -- senha com hash bcrypt teria prefixo $2a$/$2b$ e ~60 chars
       count(*) FILTER (WHERE senha LIKE '$2%') AS senhas_com_hash
FROM public.gbp_usuarios;
