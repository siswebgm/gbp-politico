-- RPC para buscar KPIs (totais) por empresa em uma única chamada
-- Retorna contagens para: eleitores, atendimentos, demandas e agendamentos.

create or replace function public.get_companies_kpis(p_empresa_uids uuid[])
returns table(
  empresa_uid uuid,
  eleitores bigint,
  atendimentos bigint,
  demandas bigint,
  agendamentos bigint
)
language sql
stable
as $$
  with empresas as (
    select unnest(p_empresa_uids) as empresa_uid
  ),
  eleitores as (
    select ge.empresa_uid, count(*)::bigint as eleitores
    from public.gbp_eleitores ge
    where ge.empresa_uid = any(p_empresa_uids)
    group by ge.empresa_uid
  ),
  atendimentos as (
    select ga.empresa_uid, count(*)::bigint as atendimentos
    from public.gbp_atendimentos ga
    where ga.empresa_uid = any(p_empresa_uids)
    group by ga.empresa_uid
  ),
  demandas as (
    select gdr.empresa_uid, count(*)::bigint as demandas
    from public.gbp_demandas_ruas gdr
    where gdr.empresa_uid = any(p_empresa_uids)
    group by gdr.empresa_uid
  ),
  agendamentos as (
    select gag.empresa_uid, count(*)::bigint as agendamentos
    from public.gbp_agendamentos gag
    where gag.empresa_uid = any(p_empresa_uids)
    group by gag.empresa_uid
  )
  select
    e.empresa_uid,
    coalesce(el.eleitores, 0) as eleitores,
    coalesce(at.atendimentos, 0) as atendimentos,
    coalesce(de.demandas, 0) as demandas,
    coalesce(ag.agendamentos, 0) as agendamentos
  from empresas e
  left join eleitores el on el.empresa_uid = e.empresa_uid
  left join atendimentos at on at.empresa_uid = e.empresa_uid
  left join demandas de on de.empresa_uid = e.empresa_uid
  left join agendamentos ag on ag.empresa_uid = e.empresa_uid;
$$;

grant execute on function public.get_companies_kpis(uuid[]) to authenticated;
grant execute on function public.get_companies_kpis(uuid[]) to anon;
