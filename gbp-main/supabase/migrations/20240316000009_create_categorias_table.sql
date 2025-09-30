-- Criar a tabela gbp_categorias
create table if not exists public.gbp_categorias (
    id bigserial not null,
    nome text null,
    descricao text null,
    empresa_uid uuid null,
    created_at timestamp with time zone null default now(),
    uid uuid not null default gen_random_uuid(),
    constraint gbp_categorias_eleitor_pkey primary key (uid),
    constraint gbp_categorias_empresa_uid_fkey foreign key (empresa_uid) references gbp_empresas (uid) on delete cascade
) tablespace pg_default;

-- Criar o trigger para set_empresa_id
create trigger set_empresa_id_trigger before insert on gbp_categorias
for each row execute function set_empresa_id(); 