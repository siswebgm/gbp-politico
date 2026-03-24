-- RPC para consultar cota restante de criação de empresas/ambientes
-- Usa a mesma regra do create_company_for_user para evitar divergência entre UI e backend.

create or replace function public.get_remaining_company_quota_for_user(
  p_user_uid uuid
)
returns table(
  remaining_quota integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota integer;
  v_permissoes text[];
  v_empresa_uid_base uuid;
  v_total_empresas integer;
  v_remaining integer;
begin
  if p_user_uid is null then
    raise exception 'user_uid é obrigatório';
  end if;

  select u.cota_criar_empresas, u.permissoes, u.empresa_uid
    into v_quota, v_permissoes, v_empresa_uid_base
  from public.gbp_usuarios u
  where u.uid = p_user_uid;

  if v_quota is null then
    raise exception 'Usuário não encontrado';
  end if;

  if v_permissoes is null or not ('create_company' = any(v_permissoes)) then
    -- Sem permissão, retorna 0 para UI esconder a opção.
    remaining_quota := 0;
    return next;
    return;
  end if;

  if v_quota <= 0 then
    remaining_quota := 0;
    return next;
    return;
  end if;

  select count(distinct t.empresa_uid)
    into v_total_empresas
  from (
    select v_empresa_uid_base as empresa_uid
    where v_empresa_uid_base is not null
    union
    select ue.empresa_uid
    from public.gbp_usuario_empresas ue
    where ue.user_uid = p_user_uid
      and ue.ativo = true
  ) t;

  v_remaining := greatest(v_quota - coalesce(v_total_empresas, 0), 0);
  remaining_quota := v_remaining;
  return next;
end;
$$;

grant execute on function public.get_remaining_company_quota_for_user(uuid) to authenticated;
grant execute on function public.get_remaining_company_quota_for_user(uuid) to anon;
