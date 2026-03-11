-- RPCs para busca de eleitores ignorando acentos e pontuações

create extension if not exists unaccent;

create or replace function public.search_eleitores_normalize(input_text text)
returns text
language sql
immutable
as $$
  select regexp_replace(unaccent(lower(coalesce(input_text, ''))), '[^a-z0-9]+', '', 'g');
$$;

create or replace function public.search_eleitores_count(
  p_empresa_uid uuid,
  p_search text
)
returns bigint
language sql
stable
as $$
  select count(*)::bigint
  from public.gbp_eleitores e
  where e.empresa_uid = p_empresa_uid
    and (
      public.search_eleitores_normalize(e.nome) like '%' || public.search_eleitores_normalize(p_search) || '%'
      or public.search_eleitores_normalize(e.cpf) like '%' || public.search_eleitores_normalize(p_search) || '%'
      or public.search_eleitores_normalize(e.whatsapp) like '%' || public.search_eleitores_normalize(p_search) || '%'
    );
$$;

create or replace function public.search_eleitores_list(
  p_empresa_uid uuid,
  p_search text,
  p_page integer,
  p_page_size integer
)
returns setof public.gbp_eleitores
language sql
stable
as $$
  select e.*
  from public.gbp_eleitores e
  where e.empresa_uid = p_empresa_uid
    and (
      public.search_eleitores_normalize(e.nome) like '%' || public.search_eleitores_normalize(p_search) || '%'
      or public.search_eleitores_normalize(e.cpf) like '%' || public.search_eleitores_normalize(p_search) || '%'
      or public.search_eleitores_normalize(e.whatsapp) like '%' || public.search_eleitores_normalize(p_search) || '%'
    )
  order by e.nome asc
  limit greatest(coalesce(p_page_size, 15), 1)
  offset greatest(coalesce(p_page, 1) - 1, 0) * greatest(coalesce(p_page_size, 15), 1);
$$;

create or replace function public.search_eleitores_ids(
  p_empresa_uid uuid,
  p_search text
)
returns setof uuid
language sql
stable
as $$
  select e.uid
  from public.gbp_eleitores e
  where e.empresa_uid = p_empresa_uid
    and (
      public.search_eleitores_normalize(e.nome) like '%' || public.search_eleitores_normalize(p_search) || '%'
      or public.search_eleitores_normalize(e.cpf) like '%' || public.search_eleitores_normalize(p_search) || '%'
      or public.search_eleitores_normalize(e.whatsapp) like '%' || public.search_eleitores_normalize(p_search) || '%'
    )
  order by e.nome asc;
$$;
