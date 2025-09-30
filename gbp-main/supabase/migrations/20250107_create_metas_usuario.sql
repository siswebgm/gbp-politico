-- Create table for user goals
create table if not exists gbp_metas_usuario (
    id bigint primary key generated always as identity,
    usuario_id uuid references auth.users(id) on delete cascade,
    empresa_id bigint references gbp_empresas(id) on delete cascade,
    meta_eleitores integer not null default 1000,
    meta_atendimentos integer not null default 1000,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(usuario_id, empresa_id)
);

-- Add RLS policies
alter table gbp_metas_usuario enable row level security;

create policy "Users can view their own goals"
    on gbp_metas_usuario for select
    using (auth.uid() = usuario_id);

create policy "Admins can view all goals from their company"
    on gbp_metas_usuario for select
    using (
        exists (
            select 1 from gbp_usuarios u
            where u.id = auth.uid()
            and u.empresa_id = gbp_metas_usuario.empresa_id
            and u.role = 'admin'
        )
    );

create policy "Admins can insert goals for their company"
    on gbp_metas_usuario for insert
    with check (
        exists (
            select 1 from gbp_usuarios u
            where u.id = auth.uid()
            and u.empresa_id = gbp_metas_usuario.empresa_id
            and u.role = 'admin'
        )
    );

create policy "Admins can update goals for their company"
    on gbp_metas_usuario for update
    using (
        exists (
            select 1 from gbp_usuarios u
            where u.id = auth.uid()
            and u.empresa_id = gbp_metas_usuario.empresa_id
            and u.role = 'admin'
        )
    );

-- Create function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at
create trigger update_gbp_metas_usuario_updated_at
    before update on gbp_metas_usuario
    for each row
    execute function update_updated_at_column();
