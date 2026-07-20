-- Migração: Segurança de Login - Bloqueio por tentativas
-- Execute este script no SQL Editor do Supabase

-- 1. Adiciona coluna para contar tentativas de login falhas
ALTER TABLE public.gbp_usuarios
  ADD COLUMN IF NOT EXISTS tentativas_login integer NOT NULL DEFAULT 0;

-- 2. Garante que o status 'bloqueado' seja tratável
--    (Nenhuma constraint bloqueia o valor, campo é text livre)

-- 3. Índice para buscar usuários por email mais rápido
CREATE INDEX IF NOT EXISTS idx_gbp_usuarios_email
  ON public.gbp_usuarios (email);

-- Verificação
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'gbp_usuarios'
  AND column_name = 'tentativas_login';
