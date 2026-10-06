-- Resposta do destinatário na página pública /notificacao/:uid
-- (texto + anexos de mídia). Rodar no SQL Editor do Supabase.

-- 1) Colunas de resposta (resposta/data_resposta podem não existir ainda)
alter table public.gbp_notificacoes_log
  add column if not exists resposta text null,
  add column if not exists data_resposta timestamp with time zone null,
  add column if not exists resposta_midias jsonb null,
  add column if not exists respostas jsonb null,
  add column if not exists respostas_admin jsonb null;

comment on column public.gbp_notificacoes_log.resposta_midias
  is 'Anexos da última resposta do destinatário (array de {tipo,url,nome})';
comment on column public.gbp_notificacoes_log.respostas
  is 'Histórico de respostas do destinatário: array de {texto, midias, data}';
comment on column public.gbp_notificacoes_log.respostas_admin
  is 'Respostas enviadas pelo gabinete na página Conversas: array de {texto, midias, data}';

-- 2) Políticas para visitantes anônimos lerem/atualizarem o log
drop policy if exists notif_log_public_select on public.gbp_notificacoes_log;
create policy notif_log_public_select on public.gbp_notificacoes_log
  for select to anon using (true);

drop policy if exists notif_log_public_update on public.gbp_notificacoes_log;
create policy notif_log_public_update on public.gbp_notificacoes_log
  for update to anon
  using (true)
  with check (true);

-- 3) Upload anônimo dos anexos de resposta no bucket da empresa
-- Restrito ao caminho notificacoes/respostas/ dentro de um bucket
-- que esteja cadastrado em gbp_empresas.storage
drop policy if exists notif_resposta_upload on storage.objects;
create policy notif_resposta_upload on storage.objects
  for insert to anon
  with check (
    bucket_id in (
      select lower(storage) from public.gbp_empresas where storage is not null
    )
    and (storage.foldername(name))[1] = 'notificacoes'
    and (storage.foldername(name))[2] = 'respostas'
  );

-- 4) Tempo real: a página Conversas escuta updates nesta tabela
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'gbp_notificacoes_log'
  ) then
    alter publication supabase_realtime add table public.gbp_notificacoes_log;
  end if;
end $$;
