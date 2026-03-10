-- Índices para acelerar filtros por empresa_uid nas tabelas usadas nos KPIs
-- Rode este script no Supabase SQL Editor.

create index if not exists idx_gbp_eleitores_empresa_uid on public.gbp_eleitores (empresa_uid);
create index if not exists idx_gbp_atendimentos_empresa_uid on public.gbp_atendimentos (empresa_uid);
create index if not exists idx_gbp_demandas_ruas_empresa_uid on public.gbp_demandas_ruas (empresa_uid);
create index if not exists idx_gbp_agendamentos_empresa_uid on public.gbp_agendamentos (empresa_uid);
