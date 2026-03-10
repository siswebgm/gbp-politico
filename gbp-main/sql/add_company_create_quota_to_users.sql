-- Adiciona cota de criação de empresas ao usuário

alter table if exists public.gbp_usuarios
add column if not exists cota_criar_empresas integer not null default 0;
