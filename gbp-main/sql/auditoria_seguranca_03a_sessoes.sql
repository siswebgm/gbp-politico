-- ============================================================================
-- AUDITORIA DE SEGURANÇA — ETAPA 4a: SESSÕES E RPCs PRIVILEGIADAS
--
-- ADITIVO — pode rodar antes do deploy do frontend. Não quebra nada.
--
-- O que cria:
--   1. Tabela gbp_sessoes (tokens de sessão com hash, expiração, revogação)
--   2. login_seguro v3 — passa a devolver sessao_token junto do usuário
--   3. sessao_validar / logout_seguro
--   4. admin_criar_usuario / admin_atualizar_usuario / admin_excluir_usuario
--      (exigem sessão de admin da mesma empresa)
--   5. atualizar_meu_perfil (o próprio usuário, com senha atual p/ trocar senha)
--   6. registrar_conta (cadastro público atômico: empresa + admin)
--
-- O script 03b (revogação de INSERT/UPDATE/DELETE) só roda DEPOIS do deploy.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) Tabela de sessões
-- ---------------------------------------------------------------------------
create table if not exists public.gbp_sessoes (
  id          bigserial primary key,
  usuario_uid uuid        not null references public.gbp_usuarios(uid) on delete cascade,
  token_hash  text        not null unique,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '30 days',
  revogada    boolean     not null default false
);

create index if not exists gbp_sessoes_usuario_idx on public.gbp_sessoes(usuario_uid);

-- Ninguém acessa a tabela diretamente — só funções SECURITY DEFINER
revoke all on public.gbp_sessoes from public, anon, authenticated;
revoke all on sequence public.gbp_sessoes_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Helper interno: valida token e devolve o usuário (linha completa)
-- ---------------------------------------------------------------------------
create or replace function public._sessao_usuario(p_token text)
returns public.gbp_usuarios
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u public.gbp_usuarios%rowtype;
begin
  if p_token is null or length(p_token) < 20 then
    raise exception 'sessao_invalida';
  end if;

  select usr.* into u
    from public.gbp_sessoes s
    join public.gbp_usuarios usr on usr.uid = s.usuario_uid
   where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
     and s.revogada = false
     and s.expires_at > now()
   limit 1;

  if not found then
    raise exception 'sessao_invalida';
  end if;

  if u.status <> 'active' then
    raise exception 'conta_inativa';
  end if;

  update public.gbp_sessoes
     set expires_at = now() + interval '30 days'
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');

  return u;
end;
$$;

revoke execute on function public._sessao_usuario(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) login_seguro v3 — cria sessão e devolve o token junto do usuário
-- ---------------------------------------------------------------------------
create or replace function public.login_seguro(p_email text, p_senha text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u public.gbp_usuarios%rowtype;
  v_ok boolean;
  v_tentativas integer;
  v_token text;
begin
  if p_email is null or p_senha is null then
    raise exception 'Email ou senha incorretos';
  end if;

  select * into u
    from public.gbp_usuarios
   where email = p_email
   limit 1;

  if not found then
    raise exception 'Email ou senha incorretos';
  end if;

  if u.status in ('blocked', 'bloqueado') then
    raise exception 'conta_bloqueada';
  end if;
  if u.status <> 'active' then
    raise exception 'conta_inativa';
  end if;

  if u.senha_hash is not null then
    v_ok := (u.senha_hash = extensions.crypt(p_senha, u.senha_hash));
  else
    v_ok := (u.senha = p_senha);
  end if;

  if not v_ok then
    v_tentativas := coalesce(u.tentativas_login, 0) + 1;

    -- raise exception faria rollback do UPDATE abaixo; por isso o erro é
    -- devolvido via response.status (HTTP 400) + JSON, mantendo o commit.
    perform set_config('response.status', '400', true);

    if v_tentativas >= 3 then
      update public.gbp_usuarios
         set tentativas_login = v_tentativas, status = 'blocked'
       where uid = u.uid;
      return jsonb_build_object('message', 'conta_bloqueada');
    else
      update public.gbp_usuarios
         set tentativas_login = v_tentativas
       where uid = u.uid;
      return jsonb_build_object(
        'message', format('Senha incorreta. %s tentativa%s restante%s antes do bloqueio.',
          3 - v_tentativas,
          case when 3 - v_tentativas = 1 then '' else 's' end,
          case when 3 - v_tentativas = 1 then '' else 's' end));
    end if;
  end if;

  -- Login ok: zera tentativas, atualiza acesso, completa hash se faltar
  update public.gbp_usuarios
     set ultimo_acesso    = now(),
         tentativas_login = 0,
         senha_hash       = coalesce(senha_hash, extensions.crypt(p_senha, extensions.gen_salt('bf')))
   where uid = u.uid
   returning * into u;

  -- Cria a sessão (token aleatório; no banco fica só o hash)
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.gbp_sessoes (usuario_uid, token_hash)
  values (u.uid, encode(extensions.digest(v_token, 'sha256'), 'hex'));

  return (to_jsonb(u) - 'senha' - 'senha_hash')
         || jsonb_build_object('sessao_token', v_token);
end;
$$;

revoke execute on function public.login_seguro(text, text) from public;
grant execute on function public.login_seguro(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) sessao_validar / logout_seguro
-- ---------------------------------------------------------------------------
create or replace function public.sessao_validar(p_token text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u public.gbp_usuarios%rowtype;
begin
  u := public._sessao_usuario(p_token);
  return to_jsonb(u) - 'senha' - 'senha_hash';
end;
$$;

revoke execute on function public.sessao_validar(text) from public;
grant execute on function public.sessao_validar(text) to anon, authenticated;

create or replace function public.logout_seguro(p_token text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  delete from public.gbp_sessoes
   where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
end;
$$;

revoke execute on function public.logout_seguro(text) from public;
grant execute on function public.logout_seguro(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Admin: criar usuário (sessão de admin, mesma empresa)
-- ---------------------------------------------------------------------------
create or replace function public.admin_criar_usuario(p_sessao_token text, p_dados jsonb)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_u public.gbp_usuarios%rowtype;
  novo    public.gbp_usuarios%rowtype;
  v_emp   uuid;
  v_perms text[];
begin
  admin_u := public._sessao_usuario(p_sessao_token);

  if coalesce(admin_u.nivel_acesso, '') <> 'admin'
     and coalesce(admin_u.cargo, '') <> 'admin' then
    raise exception 'Apenas administradores podem criar usuários';
  end if;

  v_emp := coalesce((p_dados->>'empresa_uid')::uuid, admin_u.empresa_uid);

  if v_emp is distinct from admin_u.empresa_uid
     and not coalesce(admin_u.adm_empresa, false) then
    raise exception 'Você só pode criar usuários na sua empresa';
  end if;

  if p_dados->>'nome' is null or p_dados->>'email' is null or p_dados->>'senha' is null then
    raise exception 'Nome, email e senha são obrigatórios';
  end if;

  if length(p_dados->>'senha') < 6 then
    raise exception 'A senha deve ter no mínimo 6 caracteres';
  end if;

  select coalesce(array_agg(j.value), '{}'::text[])
    into v_perms
    from jsonb_array_elements_text(coalesce(p_dados->'permissoes', '[]'::jsonb)) j;

  insert into public.gbp_usuarios (
    nome, email, senha, contato, foto, cargo, nivel_acesso, permissoes,
    empresa_uid, adm_empresa, status, notification_status, notification_updated_at
  ) values (
    p_dados->>'nome',
    lower(p_dados->>'email'),
    p_dados->>'senha',                                    -- trigger gera bcrypt
    p_dados->>'contato',
    p_dados->>'foto',
    coalesce(p_dados->>'cargo', p_dados->>'nivel_acesso'),
    coalesce(p_dados->>'nivel_acesso', 'colaborador'),
    coalesce(v_perms, '{}'::text[]),
    v_emp,
    coalesce((p_dados->>'adm_empresa')::boolean, false),
    'active',
    'enabled',
    now()
  )
  returning * into novo;

  return to_jsonb(novo) - 'senha' - 'senha_hash';

exception
  when unique_violation then
    raise exception 'Este email já está cadastrado';
end;
$$;

revoke execute on function public.admin_criar_usuario(text, jsonb) from public;
grant execute on function public.admin_criar_usuario(text, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: atualizar usuário (whitelist de campos, mesma empresa)
-- ---------------------------------------------------------------------------
create or replace function public.admin_atualizar_usuario(p_sessao_token text, p_user_uid uuid, p_dados jsonb)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_u public.gbp_usuarios%rowtype;
  alvo    public.gbp_usuarios%rowtype;
  v_perms text[];
begin
  admin_u := public._sessao_usuario(p_sessao_token);

  if coalesce(admin_u.nivel_acesso, '') <> 'admin'
     and coalesce(admin_u.cargo, '') <> 'admin' then
    raise exception 'Apenas administradores podem editar usuários';
  end if;

  select * into alvo
    from public.gbp_usuarios
   where uid = p_user_uid
   limit 1;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;

  if alvo.empresa_uid is distinct from admin_u.empresa_uid
     and not coalesce(admin_u.adm_empresa, false) then
    raise exception 'Você só pode editar usuários da sua empresa';
  end if;

  if p_dados ? 'permissoes' then
    select coalesce(array_agg(j.value), '{}'::text[])
      into v_perms
      from jsonb_array_elements_text(p_dados->'permissoes') j;
  else
    v_perms := alvo.permissoes;
  end if;

  update public.gbp_usuarios
     set nome         = coalesce(p_dados->>'nome', nome),
         email        = coalesce(lower(p_dados->>'email'), email),
         contato      = coalesce(p_dados->>'contato', contato),
         cargo        = coalesce(p_dados->>'cargo', cargo),
         nivel_acesso = coalesce(p_dados->>'nivel_acesso', nivel_acesso),
         status       = coalesce(p_dados->>'status', status),
         permissoes   = coalesce(v_perms, permissoes)
   where uid = p_user_uid
   returning * into alvo;

  return to_jsonb(alvo) - 'senha' - 'senha_hash';

exception
  when unique_violation then
    raise exception 'Este email já está cadastrado';
end;
$$;

revoke execute on function public.admin_atualizar_usuario(text, uuid, jsonb) from public;
grant execute on function public.admin_atualizar_usuario(text, uuid, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: excluir usuário (mesma empresa; não pode excluir a si mesmo)
-- ---------------------------------------------------------------------------
create or replace function public.admin_excluir_usuario(p_sessao_token text, p_user_uid uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_u public.gbp_usuarios%rowtype;
  alvo    public.gbp_usuarios%rowtype;
begin
  admin_u := public._sessao_usuario(p_sessao_token);

  if coalesce(admin_u.nivel_acesso, '') <> 'admin'
     and coalesce(admin_u.cargo, '') <> 'admin' then
    raise exception 'Apenas administradores podem excluir usuários';
  end if;

  if p_user_uid = admin_u.uid then
    raise exception 'Não é possível excluir a sua própria conta';
  end if;

  select * into alvo
    from public.gbp_usuarios
   where uid = p_user_uid
   limit 1;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;

  if alvo.empresa_uid is distinct from admin_u.empresa_uid
     and not coalesce(admin_u.adm_empresa, false) then
    raise exception 'Você só pode excluir usuários da sua empresa';
  end if;

  delete from public.gbp_usuarios where uid = p_user_uid;
end;
$$;

revoke execute on function public.admin_excluir_usuario(text, uuid) from public;
grant execute on function public.admin_excluir_usuario(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Próprio usuário: atualizar perfil (nome/contato/foto/email)
--    Troca de senha exige a senha atual e revoga as outras sessões.
-- ---------------------------------------------------------------------------
create or replace function public.atualizar_meu_perfil(
  p_sessao_token text,
  p_nome text default null,
  p_contato text default null,
  p_foto text default null,
  p_email text default null,
  p_senha_atual text default null,
  p_nova_senha text default null
)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u public.gbp_usuarios%rowtype;
  v_ok boolean;
begin
  u := public._sessao_usuario(p_sessao_token);

  if p_nova_senha is not null then
    if length(p_nova_senha) < 6 then
      raise exception 'A senha deve ter no mínimo 6 caracteres';
    end if;
    if p_senha_atual is null then
      raise exception 'Informe a senha atual para alterar a senha';
    end if;
    if u.senha_hash is not null then
      v_ok := (u.senha_hash = extensions.crypt(p_senha_atual, u.senha_hash));
    else
      v_ok := (u.senha = p_senha_atual);
    end if;
    if not v_ok then
      raise exception 'Senha atual incorreta';
    end if;
  end if;

  update public.gbp_usuarios
     set nome    = coalesce(p_nome, nome),
         contato = coalesce(p_contato, contato),
         foto    = coalesce(p_foto, foto),
         email   = coalesce(lower(p_email), email),
         senha   = coalesce(p_nova_senha, senha)     -- trigger gera bcrypt
   where uid = u.uid
   returning * into u;

  -- Trocou a senha → revoga todas as outras sessões (a atual continua)
  if p_nova_senha is not null then
    update public.gbp_sessoes
       set revogada = true
     where usuario_uid = u.uid
       and token_hash <> encode(extensions.digest(p_sessao_token, 'sha256'), 'hex');
  end if;

  return to_jsonb(u) - 'senha' - 'senha_hash';

exception
  when unique_violation then
    raise exception 'Este email já está cadastrado';
end;
$$;

revoke execute on function public.atualizar_meu_perfil(text, text, text, text, text, text, text) from public;
grant execute on function public.atualizar_meu_perfil(text, text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6) Cadastro público atômico: cria empresa + usuário admin
--    (substitui os dois INSERTs públicos de Register e CreateCompanyModal)
-- ---------------------------------------------------------------------------
create or replace function public.registrar_conta(p_empresa jsonb, p_usuario jsonb)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  emp     public.gbp_empresas%rowtype;
  novo    public.gbp_usuarios%rowtype;
  v_perms text[];
begin
  if p_usuario->>'nome' is null or p_usuario->>'email' is null
     or p_usuario->>'senha' is null or p_empresa->>'nome' is null then
    raise exception 'Dados obrigatórios não preenchidos';
  end if;

  if length(p_usuario->>'senha') < 6 then
    raise exception 'A senha deve ter no mínimo 6 caracteres';
  end if;

  insert into public.gbp_empresas (
    nome, cnpj, contato, website, logradouro, cidade, estado, cep,
    afiliado_codigo, status, plano, created_at
  ) values (
    p_empresa->>'nome',
    p_empresa->>'cnpj',
    p_empresa->>'contato',
    p_empresa->>'website',
    p_empresa->>'logradouro',
    p_empresa->>'cidade',
    p_empresa->>'estado',
    p_empresa->>'cep',
    p_empresa->>'afiliado_codigo',
    'active',
    coalesce(p_empresa->>'plano', 'basic'),
    now()
  )
  returning * into emp;

  select coalesce(array_agg(j.value), '{}'::text[])
    into v_perms
    from jsonb_array_elements_text(coalesce(p_usuario->'permissoes', '[]'::jsonb)) j;

  insert into public.gbp_usuarios (
    nome, email, senha, contato, cargo, nivel_acesso, permissoes,
    empresa_uid, status, notification_status, notification_updated_at, created_at
  ) values (
    p_usuario->>'nome',
    lower(p_usuario->>'email'),
    p_usuario->>'senha',                                  -- trigger gera bcrypt
    p_usuario->>'contato',
    'admin',
    'admin',
    coalesce(v_perms, '{}'::text[]),
    emp.uid,
    'active',
    'enabled',
    now(),
    now()
  )
  returning * into novo;

  return jsonb_build_object(
    'empresa_uid', emp.uid,
    'usuario_uid', novo.uid
  );

exception
  when unique_violation then
    raise exception 'Este email já está cadastrado';
end;
$$;

revoke execute on function public.registrar_conta(jsonb, jsonb) from public;
grant execute on function public.registrar_conta(jsonb, jsonb) to anon, authenticated;

-- Recarrega o cache do PostgREST
notify pgrst, 'reload schema';
