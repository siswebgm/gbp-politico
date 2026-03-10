-- Migração: renomear coluna antiga em inglês para português
-- Use este script APENAS se você já tiver criado a coluna company_create_quota.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gbp_usuarios'
      and column_name = 'company_create_quota'
  ) then
    alter table public.gbp_usuarios rename column company_create_quota to cota_criar_empresas;
  end if;
end $$;
