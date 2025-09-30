-- Drop todos os triggers que possam estar usando empresa_id
drop trigger if exists set_empresa_id_trigger on gbp_categorias;

-- Drop todas as funções que possam estar usando empresa_id
drop function if exists set_empresa_id();

-- Remover qualquer trigger que possa ter sido criado anteriormente
drop trigger if exists set_empresa_uid_trigger on gbp_categorias;

-- Remover a função antiga se existir
drop function if exists set_empresa_uid();

-- Criar uma nova função que use apenas empresa_uid
create or replace function set_empresa_uid()
returns trigger as $$
begin
  -- Não fazemos nada aqui, apenas retornamos o record como está
  return new;
end;
$$ language plpgsql security definer;

-- Criar um novo trigger que use a nova função
create trigger set_empresa_uid_trigger
  before insert on gbp_categorias
  for each row
  execute function set_empresa_uid(); 