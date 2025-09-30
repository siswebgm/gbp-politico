-- Criar o bucket para armazenar as fotos das demandas de rua
-- Execute este script no SQL Editor do Supabase

-- 1. Criar o bucket se não existir
insert into storage.buckets (id, name, public)
values ('gbp_demandas_rua', 'gbp_demandas_rua', true)
on conflict (id) do nothing;

-- 2. Configurar políticas de segurança
-- Política para permitir upload de arquivos autenticados
create policy "Permitir upload de arquivos para demandas de rua"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'gbp_demandas_rua' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir leitura de arquivos públicos
create policy "Permitir leitura de arquivos de demandas de rua"
on storage.objects for select
to authenticated
using (
  bucket_id = 'gbp_demandas_rua' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir atualização de arquivos
create policy "Permitir atualização de arquivos de demandas de rua"
on storage.objects for update
to authenticated
using (
  bucket_id = 'gbp_demandas_rua' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir exclusão de arquivos
create policy "Permitir exclusão de arquivos de demandas de rua"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'gbp_demandas_rua' and
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Garantir que o bucket seja público para leitura
do $$
begin
  if not exists (
    select 1 from storage.buckets 
    where id = 'gbp_demandas_rua' and public = true
  ) then
    update storage.buckets 
    set public = true 
    where id = 'gbp_demandas_rua';
  end if;
end $$;
