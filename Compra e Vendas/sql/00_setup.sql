-- ============================================================================
-- Marketplace - Setup Inicial
-- ============================================================================
-- Cria o schema marketplace e prepara as extensões necessárias.
-- Execute este script primeiro no SQL Editor do Supabase com a papel postgres.
-- ============================================================================

-- Garante que o schema marketplace exista
create schema if not exists marketplace;

-- Comentário no schema
comment on schema marketplace is 'Schema isolado para o marketplace de compra e venda';

-- Extensão para geração de UUIDs (gen_random_uuid já é nativa em versões recentes,
-- mas a extensão pgcrypto garante compatibilidade)
create extension if not exists pgcrypto;
