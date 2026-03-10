create table if not exists public.gbp_usuario_empresas (
  uid uuid not null default gen_random_uuid(),
  user_uid uuid not null,
  empresa_uid uuid not null,
  papel text null default 'admin'::text,
  ativo boolean not null default true,
  created_at timestamp with time zone null default now(),
  constraint gbp_usuario_empresas_pkey primary key (uid),
  constraint gbp_usuario_empresas_user_uid_fkey foreign key (user_uid) references public.gbp_usuarios (uid) on delete cascade,
  constraint gbp_usuario_empresas_empresa_uid_fkey foreign key (empresa_uid) references public.gbp_empresas (uid) on delete cascade,
  constraint gbp_usuario_empresas_user_empresa_unique unique (user_uid, empresa_uid)
) tablespace pg_default;

create index if not exists idx_gbp_usuario_empresas_user_uid on public.gbp_usuario_empresas using btree (user_uid) tablespace pg_default;
create index if not exists idx_gbp_usuario_empresas_empresa_uid on public.gbp_usuario_empresas using btree (empresa_uid) tablespace pg_default;
