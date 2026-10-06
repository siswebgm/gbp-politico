-- Etiquetas (tags) para gerenciamento das conversas da página Conversas.
-- Array JSONB com ids de etiqueta: ['pendente','em_atendimento','resolvido','urgente']

alter table public.gbp_notificacoes_log
  add column if not exists etiquetas jsonb not null default '[]'::jsonb;

comment on column public.gbp_notificacoes_log.etiquetas
  is 'Etiquetas de gerenciamento do atendimento (usado na página Conversas)';