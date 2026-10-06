-- Identifica cada disparo como uma campanha única.
-- Todos os logs criados no mesmo envio recebem o mesmo campanha_uid,
-- permitindo filtrar o histórico disparo por disparo.

alter table public.gbp_notificacoes_log
  add column if not exists campanha_uid uuid;

alter table public.gbp_notificacoes_log
  add column if not exists campanha_nome text;

create index if not exists idx_notificacoes_log_campanha
  on public.gbp_notificacoes_log(campanha_uid);

comment on column public.gbp_notificacoes_log.campanha_uid
  is 'UUID único do disparo — agrupa todos os logs de um envio';
comment on column public.gbp_notificacoes_log.campanha_nome
  is 'Nome amigável do disparo (ex.: "Comunicado 05/10")';
