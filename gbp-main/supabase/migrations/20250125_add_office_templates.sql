-- Create the office templates table
create table if not exists gbp_office_templates (
    id uuid default uuid_generate_v4() primary key,
    empresa_uid uuid references gbp_empresas(uid) unique not null,
    template_url text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create storage bucket for templates if it doesn't exist
insert into storage.buckets (id, name)
values ('office_templates', 'office_templates')
on conflict (id) do nothing;

-- Set up storage policies for the templates bucket
create policy "Empresa can upload their own templates"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'office_templates' and
    (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Empresa can update their own templates"
on storage.objects for update
to authenticated
using (
    bucket_id = 'office_templates' and
    (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Empresa can read their own templates"
on storage.objects for select
to authenticated
using (
    bucket_id = 'office_templates' and
    (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Empresa can delete their own templates"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'office_templates' and
    (storage.foldername(name))[1] = auth.uid()::text
);
