
-- Política para inserção
create policy \
Users
can
insert
disparo
for
their
company\ on public.gbp_disparo
    for insert
    with check (
        auth.uid() in (
            select u.uid 
            from gbp_usuarios u 
            where u.empresa_uid = empresa_uid
        )
    );

-- Política para seleção
create policy \Users
can
view
disparo
for
their
company\ on public.gbp_disparo
    for select
    using (
        auth.uid() in (
            select u.uid 
            from gbp_usuarios u 
            where u.empresa_uid = empresa_uid
        )
    );

