
-- Função para pegar bairros distintos
create or replace function public.get_distinct_neighborhoods(company_id uuid)
returns text[] as c:\Users\jmend\sistemagbp
begin
  return array(
    select distinct bairro
    from public.gbp_eleitores
    where empresa_uid = company_id
      and bairro is not null
      and bairro != ''
    order by bairro
  );
end;
c:\Users\jmend\sistemagbp language plpgsql security definer;

-- Função para pegar cidades distintas
create or replace function public.get_distinct_cities(company_id uuid)
returns text[] as c:\Users\jmend\sistemagbp
begin
  return array(
    select distinct cidade
    from public.gbp_eleitores
    where empresa_uid = company_id
      and cidade is not null
      and cidade != ''
    order by cidade
  );
end;
c:\Users\jmend\sistemagbp language plpgsql security definer;

-- Permissões
grant execute on function public.get_distinct_neighborhoods(uuid) to authenticated;
grant execute on function public.get_distinct_cities(uuid) to authenticated;

