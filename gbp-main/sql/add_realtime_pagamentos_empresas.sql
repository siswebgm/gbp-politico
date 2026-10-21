-- Adiciona gbp_pagamentos e gbp_empresas à publication do Supabase Realtime.
-- Sem isso, postgres_changes não emite eventos e a página /bloqueado
-- não recebe a liberação em tempo real (só o polling de 20s).
-- Execute no SQL Editor do Supabase self-hosted.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gbp_pagamentos'
  ) then
    alter publication supabase_realtime add table public.gbp_pagamentos;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gbp_empresas'
  ) then
    alter publication supabase_realtime add table public.gbp_empresas;
  end if;
end $$;
