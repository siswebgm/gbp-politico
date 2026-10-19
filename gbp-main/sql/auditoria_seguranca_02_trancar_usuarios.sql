-- ============================================================================
-- AUDITORIA DE SEGURANÇA — ETAPA 3: TRANCAR gbp_usuarios
--
-- RODE SOMENTE DEPOIS do deploy do frontend que usa as RPCs.
--
-- O que faz:
--   1. login_seguro v2: verifica status/bloqueio/tentativas no servidor
--      (replica exata do comportamento atual do app)
--   2. RPC recuperacao_validar_contato: valida últimos 4 dígitos do telefone
--      no servidor (não expõe mais contato/tentativas para qualquer um)
--   3. RPC definir_senha_por_id: completar cadastro / trocar senha
--   4. RPC admin_reset_senha: admin redefine senha de usuário da MESMA empresa
--      (exige a senha do próprio admin — prova de identidade real)
--   5. REVOKE da coluna senha/senha_hash no SELECT  → fim do dump de senhas
--   6. REVOKE do UPDATE em senha/senha_hash/tentativas_login → senha só via RPC
--
-- Não muda: INSERT (cadastro de usuário continua), UPDATE das demais colunas
-- (edição de perfil, ultimo_acesso, notificações etc.), DELETE.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) login_seguro com regras de status e bloqueio (mesmas do app hoje)
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

  -- Conta bloqueada ou inativa
  if u.status in ('blocked', 'bloqueado') then
    raise exception 'conta_bloqueada';
  end if;
  if u.status <> 'active' then
    raise exception 'conta_inativa';
  end if;

  -- Verifica a senha (hash; fallback texto puro na transição)
  if u.senha_hash is not null then
    v_ok := (u.senha_hash = extensions.crypt(p_senha, u.senha_hash));
  else
    v_ok := (u.senha = p_senha);
  end if;

  if not v_ok then
    v_tentativas := coalesce(u.tentativas_login, 0) + 1;

    if v_tentativas >= 3 then
      update public.gbp_usuarios
         set tentativas_login = v_tentativas, status = 'blocked'
       where uid = u.uid;
      raise exception 'conta_bloqueada';
    else
      update public.gbp_usuarios
         set tentativas_login = v_tentativas
       where uid = u.uid;
      raise exception 'Senha incorreta. % tentativa% restante% antes do bloqueio.',
        3 - v_tentativas,
        case when 3 - v_tentativas = 1 then '' else 's' end,
        case when 3 - v_tentativas = 1 then '' else 's' end;
    end if;
  end if;

  -- Login ok: zera tentativas, atualiza acesso, completa hash se faltar
  update public.gbp_usuarios
     set ultimo_acesso    = now(),
         tentativas_login = 0,
         senha_hash       = coalesce(senha_hash, extensions.crypt(p_senha, extensions.gen_salt('bf')))
   where uid = u.uid
   returning * into u;

  return to_jsonb(u) - 'senha' - 'senha_hash';
end;
$$;

revoke execute on function public.login_seguro(text, text) from public;
grant execute on function public.login_seguro(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Recuperação: valida 4 últimos dígitos do contato no servidor
--    (mesmas mensagens/erros que o frontend usa hoje)
-- ---------------------------------------------------------------------------
create or replace function public.recuperacao_validar_contato(p_email text, p_digitos text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u public.gbp_usuarios%rowtype;
  v_digitos text;
  v_last4 text;
  v_tentativas integer;
begin
  select * into u
    from public.gbp_usuarios
   where email = p_email
   limit 1;

  if not found then
    raise exception 'Email não encontrado.';
  end if;

  if u.status in ('blocked', 'bloqueado') then
    raise exception 'conta_bloqueada';
  end if;
  if u.status <> 'active' then
    raise exception 'conta_inativa';
  end if;

  v_digitos := right(regexp_replace(coalesce(p_digitos, ''), '\D', '', 'g'), 4);
  v_last4   := right(regexp_replace(coalesce(u.contato, ''), '\D', '', 'g'), 4);

  if length(v_last4) <> 4 then
    raise exception 'Não foi possível validar o contato. Entre em contato com o administrador.';
  end if;

  if v_last4 <> v_digitos then
    v_tentativas := coalesce(u.tentativas_login, 0) + 1;

    if v_tentativas >= 3 then
      update public.gbp_usuarios
         set tentativas_login = v_tentativas, status = 'blocked'
       where uid = u.uid;
      raise exception 'conta_bloqueada';
    else
      update public.gbp_usuarios
         set tentativas_login = v_tentativas
       where uid = u.uid;
      raise exception 'Código incorreto. % tentativa% restante% antes do bloqueio.',
        3 - v_tentativas,
        case when 3 - v_tentativas = 1 then '' else 's' end,
        case when 3 - v_tentativas = 1 then '' else 's' end;
    end if;
  end if;

  update public.gbp_usuarios
     set tentativas_login = 0
   where uid = u.uid;
end;
$$;

revoke execute on function public.recuperacao_validar_contato(text, text) from public;
grant execute on function public.recuperacao_validar_contato(text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) Definir senha por id numérico (completar cadastro / troca de senha)
--    Se já existe senha, exige a senha atual.
-- ---------------------------------------------------------------------------
create or replace function public.definir_senha_por_id(p_user_id integer, p_nova_senha text, p_senha_atual text default null)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u public.gbp_usuarios%rowtype;
  v_ok boolean;
begin
  if p_nova_senha is null or length(p_nova_senha) < 6 then
    raise exception 'A senha deve ter no mínimo 6 caracteres';
  end if;

  select * into u
    from public.gbp_usuarios
   where id = p_user_id
   limit 1;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;

  -- Se já tem senha, a troca exige a senha atual
  if u.senha is not null then
    if p_senha_atual is null then
      raise exception 'Informe a senha atual';
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
     set senha = p_nova_senha,           -- trigger gera senha_hash (bcrypt)
         status = 'active',
         tentativas_login = 0
   where id = p_user_id;
end;
$$;

revoke execute on function public.definir_senha_por_id(integer, text, text) from public;
grant execute on function public.definir_senha_por_id(integer, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Admin redefine senha de usuário da mesma empresa
--    PROVA DE IDENTIDADE: a senha do próprio admin é verificada no servidor.
-- ---------------------------------------------------------------------------
create or replace function public.admin_reset_senha(p_admin_uid uuid, p_admin_senha text, p_user_uid uuid, p_nova_senha text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  admin_u public.gbp_usuarios%rowtype;
  alvo    public.gbp_usuarios%rowtype;
  v_ok    boolean;
begin
  if p_nova_senha is null or length(p_nova_senha) < 6 then
    raise exception 'A senha deve ter no mínimo 6 caracteres';
  end if;

  select * into admin_u
    from public.gbp_usuarios
   where uid = p_admin_uid
   limit 1;

  if not found then
    raise exception 'Administrador não encontrado';
  end if;

  if admin_u.status <> 'active' then
    raise exception 'Conta do administrador inativa';
  end if;

  if coalesce(admin_u.nivel_acesso, '') <> 'admin'
     and coalesce(admin_u.cargo, '') <> 'admin' then
    raise exception 'Apenas administradores podem redefinir senhas';
  end if;

  -- Verifica a senha do admin
  if admin_u.senha_hash is not null then
    v_ok := (admin_u.senha_hash = extensions.crypt(p_admin_senha, admin_u.senha_hash));
  else
    v_ok := (admin_u.senha = p_admin_senha);
  end if;
  if not v_ok then
    raise exception 'Senha do administrador incorreta';
  end if;

  select * into alvo
    from public.gbp_usuarios
   where uid = p_user_uid
   limit 1;

  if not found then
    raise exception 'Usuário não encontrado';
  end if;

  -- Admin só redefine senha de usuário da mesma empresa
  if alvo.empresa_uid is distinct from admin_u.empresa_uid
     and not coalesce(admin_u.adm_empresa, false) then
    raise exception 'Você só pode redefinir senhas de usuários da sua empresa';
  end if;

  update public.gbp_usuarios
     set senha = p_nova_senha,           -- trigger gera senha_hash (bcrypt)
         status = 'active',
         tentativas_login = 0
   where uid = p_user_uid;
end;
$$;

revoke execute on function public.admin_reset_senha(uuid, text, uuid, text) from public;
grant execute on function public.admin_reset_senha(uuid, text, uuid, text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) Esconder senha/senha_hash do SELECT (fim do dump de senhas)
--    Concede SELECT coluna a coluna em TODAS as outras colunas, dinamicamente.
-- ---------------------------------------------------------------------------
revoke select on public.gbp_usuarios from public, anon, authenticated;

do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'gbp_usuarios'
     and column_name not in ('senha', 'senha_hash');

  execute format('grant select (%s) on public.gbp_usuarios to anon, authenticated', v_cols);
end $$;

-- ---------------------------------------------------------------------------
-- 6) Senha só muda via RPC: tira UPDATE de senha/senha_hash/tentativas_login
-- ---------------------------------------------------------------------------
revoke update on public.gbp_usuarios from public, anon, authenticated;

do $$
declare
  v_cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'gbp_usuarios'
     and column_name not in ('senha', 'senha_hash', 'tentativas_login');

  execute format('grant update (%s) on public.gbp_usuarios to anon, authenticated', v_cols);
end $$;

-- INSERT e DELETE continuam como estão (cadastro de usuário e exclusão
-- seguem funcionando; endurecimento deles depende da Etapa 4 - sessões).

-- Recarrega o cache do PostgREST para as novas permissões valerem já
notify pgrst, 'reload schema';

-- ============================================================================
-- TESTES DE FUMAÇA (rode depois):
--   select public.login_seguro('seu@email.com', 'sua_senha');   -- deve retornar JSON
--   -- como anon, este select DEVE falhar:
--   --   set role anon; select senha from public.gbp_usuarios limit 1; reset role;
-- ============================================================================
