-- ============================================================================
-- CORREÇÃO: crypt()/gen_salt() vivem no schema "extensions" no Supabase.
-- Esta versão qualifica as chamadas (extensions.crypt / extensions.gen_salt)
-- para funcionar independente do search_path de quem chama.
-- ============================================================================

create or replace function public.gbp_usuarios_sync_senha_hash()
returns trigger
language plpgsql
as $$
begin
  if new.senha is null then
    new.senha_hash := null;
  elsif TG_OP = 'INSERT' or new.senha is distinct from old.senha then
    new.senha_hash := extensions.crypt(new.senha, extensions.gen_salt('bf'));
  end if;
  return new;
end;
$$;

create or replace function public.login_seguro(p_email text, p_senha text)
returns json
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  u public.gbp_usuarios%rowtype;
  v_ok boolean;
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

  -- Verifica contra o hash; se ainda não existe hash, compara com o texto
  -- (modo transição — o hash é gerado logo abaixo, no primeiro login ok)
  if u.senha_hash is not null then
    v_ok := (u.senha_hash = extensions.crypt(p_senha, u.senha_hash));
  else
    v_ok := (u.senha = p_senha);
  end if;

  if not v_ok then
    update public.gbp_usuarios
       set tentativas_login = coalesce(tentativas_login, 0) + 1
     where uid = u.uid;
    raise exception 'Email ou senha incorretos';
  end if;

  update public.gbp_usuarios
     set ultimo_acesso   = now(),
         tentativas_login = 0,
         senha_hash      = coalesce(senha_hash, extensions.crypt(p_senha, extensions.gen_salt('bf')))
   where uid = u.uid
   returning * into u;

  return to_jsonb(u) - 'senha' - 'senha_hash';
end;
$$;

revoke execute on function public.login_seguro(text, text) from public;
grant execute on function public.login_seguro(text, text) to anon, authenticated;

-- TESTE:
--   select public.login_seguro('josuel@gmail.com', 'sua_senha');
