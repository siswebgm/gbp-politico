-- Drop o trigger antigo
drop trigger if exists set_empresa_id_trigger on gbp_categorias;

-- Criar a nova função para set_empresa_uid
create or replace function set_empresa_uid()
returns trigger as $$
begin
  new.empresa_uid := current_setting('app.empresa_uid')::uuid;
  return new;
end;
$$ language plpgsql security definer;

-- Criar o novo trigger
create trigger set_empresa_uid_trigger
  before insert on gbp_categorias
  for each row
  execute function set_empresa_uid(); 