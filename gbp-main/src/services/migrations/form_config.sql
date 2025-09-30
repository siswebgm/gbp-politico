-- Criação da tabela de configuração do formulário
create table form_config (
  id uuid default uuid_generate_v4() primary key,
  categoria_id uuid references categorias(id) on delete cascade,
  campos_config jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(categoria_id)
);

-- Trigger para atualizar o updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_form_config_updated_at
    before update on form_config
    for each row
    execute procedure update_updated_at_column();
