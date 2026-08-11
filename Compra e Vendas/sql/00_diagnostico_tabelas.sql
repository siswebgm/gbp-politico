-- ============================================================================
-- Script de Diagnóstico: Verificar estado atual das tabelas
-- Execute este script ANTES da migração para ver quais tabelas existem
-- ============================================================================

-- Verifica tabelas no schema marketplace
SELECT 
  tablename AS "Tabela",
  schemaname AS "Schema"
FROM pg_tables 
WHERE schemaname = 'marketplace'
ORDER BY tablename;

-- Verifica se as tabelas já estão em português ou inglês
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'marketplace' AND tablename = 'users') THEN 'users (inglês) ✓'
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'marketplace' AND tablename = 'usuarios') THEN 'usuarios (português) ✓'
    ELSE 'Não encontrada ✗'
  END AS "Tabela Users/Usuarios",
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'marketplace' AND tablename = 'products') THEN 'products (inglês) ✓'
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'marketplace' AND tablename = 'anuncios') THEN 'anuncios (português) ✓'
    ELSE 'Não encontrada ✗'
  END AS "Tabela Products/Anuncios",
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'marketplace' AND tablename = 'chat_messages') THEN 'chat_messages (inglês) ✓'
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'marketplace' AND tablename = 'mensagens') THEN 'mensagens (português) ✓'
    ELSE 'Não encontrada ✗'
  END AS "Tabela Chat_Messages/Mensagens";

-- Verifica colunas da tabela users/usuarios
SELECT 
  column_name AS "Coluna",
  data_type AS "Tipo"
FROM information_schema.columns
WHERE table_schema = 'marketplace' 
  AND table_name IN ('users', 'usuarios')
ORDER BY ordinal_position
LIMIT 10;
