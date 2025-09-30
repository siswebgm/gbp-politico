-- Drop o trigger antigo
drop trigger if exists set_empresa_id_trigger on gbp_categorias;
drop trigger if exists set_empresa_uid_trigger on gbp_categorias;

-- Drop a função antiga
drop function if exists set_empresa_id();
drop function if exists set_empresa_uid();

-- Criar a nova função para set_empresa_uid
create or replace function set_empresa_uid()
returns trigger as $$
begin
  -- Não precisamos mais definir empresa_uid aqui pois ele já vem do frontend
  return new;
end;
$$ language plpgsql security definer;

-- Criar o novo trigger
create trigger set_empresa_uid_trigger
  before insert on gbp_categorias
  for each row
  execute function set_empresa_uid(); 