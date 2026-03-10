do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'gbp_empresas'
      and column_name = 'apelido'
  ) then
    alter table public.gbp_empresas
      add column apelido text null;
  end if;
end $$;

create index if not exists idx_gbp_empresas_apelido on public.gbp_empresas using btree (apelido) tablespace pg_default;
