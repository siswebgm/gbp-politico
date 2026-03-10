-- RPC segura para criar empresa e atrelar ao usuário respeitando cota
-- Regras:
-- - Só cria se houver limite disponível (cota_criar_empresas - empresas vinculadas > 0)
-- - Cria empresa em gbp_empresas
-- - Cria vínculo em gbp_usuario_empresas como admin
-- - Não decrementa cota_criar_empresas (a coluna representa o limite e pode ser alterada a qualquer momento)

create or replace function public.create_company_for_user(
  p_user_uid uuid,
  p_nome text,
  p_apelido text default null,
  p_cidade text default null,
  p_estado text default null
)
returns table(
  empresa_uid uuid,
  remaining_quota integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quota integer;
  v_empresa_uid uuid;
  v_remaining integer;
  v_permissoes text[];
  v_empresa_uid_base uuid;
  v_total_empresas integer;
begin
  if p_user_uid is null then
    raise exception 'user_uid é obrigatório';
  end if;

  if p_nome is null or length(trim(p_nome)) = 0 then
    raise exception 'nome é obrigatório';
  end if;

  select u.cota_criar_empresas, u.permissoes, u.empresa_uid
    into v_quota, v_permissoes, v_empresa_uid_base
  from public.gbp_usuarios u
  where u.uid = p_user_uid
  for update;

  if v_quota is null then
    raise exception 'Usuário não encontrado';
  end if;

  if v_permissoes is null or not ('create_company' = any(v_permissoes)) then
    raise exception 'Sem permissão para criar empresa';
  end if;

  if v_quota <= 0 then
    raise exception 'Cota de criação de empresas esgotada';
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

  if v_remaining <= 0 then
    raise exception 'Cota de criação de empresas esgotada';
  end if;

  insert into public.gbp_empresas (nome, apelido, cidade, estado, status, created_at)
  values (trim(p_nome), nullif(trim(p_apelido), ''), nullif(trim(p_cidade), ''), nullif(trim(p_estado), ''), 'active', now())
  returning uid into v_empresa_uid;

  insert into public.gbp_usuario_empresas (user_uid, empresa_uid, ativo, papel)
  values (p_user_uid, v_empresa_uid, true, 'admin')
  on conflict on constraint gbp_usuario_empresas_user_empresa_unique do nothing;

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

  empresa_uid := v_empresa_uid;
  remaining_quota := v_remaining;
  return next;
end;
$$;

grant execute on function public.create_company_for_user(uuid, text, text, text, text) to authenticated;
grant execute on function public.create_company_for_user(uuid, text, text, text, text) to anon;
