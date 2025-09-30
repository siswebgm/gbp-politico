-- Enable RLS
alter table public.gbp_disparo enable row level security;

-- Create policies
create policy "Enable insert for authenticated users with matching empresa_uid"
on public.gbp_disparo
for insert
to authenticated
with check (
    auth.uid() = (
        select user_id 
        from gbp_usuarios 
        where empresa_uid = gbp_disparo.empresa_uid
        limit 1
    )
);

create policy "Enable read access for users based on empresa_uid"
on public.gbp_disparo
for select
to authenticated
using (
    auth.uid() = (
        select user_id 
        from gbp_usuarios 
        where empresa_uid = gbp_disparo.empresa_uid
        limit 1
    )
);

create policy "Enable update for users based on empresa_uid"
on public.gbp_disparo
for update
to authenticated
using (
    auth.uid() = (
        select user_id 
        from gbp_usuarios 
        where empresa_uid = gbp_disparo.empresa_uid
        limit 1
    )
)
with check (
    auth.uid() = (
        select user_id 
        from gbp_usuarios 
        where empresa_uid = gbp_disparo.empresa_uid
        limit 1
    )
);

create policy "Enable delete for users based on empresa_uid"
on public.gbp_disparo
for delete
to authenticated
using (
    auth.uid() = (
        select user_id 
        from gbp_usuarios 
        where empresa_uid = gbp_disparo.empresa_uid
        limit 1
    )
);
