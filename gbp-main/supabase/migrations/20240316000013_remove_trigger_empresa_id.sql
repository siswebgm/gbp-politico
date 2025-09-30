-- Drop o trigger antigo
drop trigger if exists set_empresa_id_trigger on gbp_categorias;

-- Drop a função antiga
drop function if exists set_empresa_id();

-- Drop qualquer outro trigger que possa existir
drop trigger if exists set_empresa_uid_trigger on gbp_categorias;
drop function if exists set_empresa_uid(); 