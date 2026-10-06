-- Adiciona campos de resposta ao log de notificações
-- Usado pela página pública /notificacao/:uid (chat estilo WhatsApp)
alter table public.gbp_notificacoes_log
  add column if not exists resposta text null,
  add column if not exists data_resposta timestamp with time zone null;

-- Permite que visitantes anônimos (inscritos via push, sem login)
-- leiam o log e gravem a resposta
drop policy if exists notif_log_public_select on public.gbp_notificacoes_log;
create policy notif_log_public_select on public.gbp_notificacoes_log
  for select to anon using (true);

drop policy if exists notif_log_public_update on public.gbp_notificacoes_log;
create policy notif_log_public_update on public.gbp_notificacoes_log
  for update to anon
  using (true)
  with check (true);
