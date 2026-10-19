-- ============================================================================
-- AUDITORIA DE SEGURANÇA — ETAPA 1 (ADITIVA, NÃO QUEBRA NADA)
--
-- O que este script faz:
--   1. Ativa pgcrypto (hash bcrypt)
--   2. Cria coluna senha_hash em gbp_usuarios (MANTÉM a coluna senha)
--   3. Preenche senha_hash para usuários existentes
--   4. Trigger: toda senha gravada/alterada gera hash automaticamente
--   5. RPC login_seguro(email, senha): verifica no servidor e devolve o
--      usuário SEM a senha. Aceita senha antiga em texto durante a transição.
--
-- O que NÃO faz:
--   - Não remove nem restringe a coluna senha (app atual continua funcionando)
--   - Não muda nenhuma policy/grant existente
--
-- Rollback: basta não usar a RPC. Para desfazer tudo:
--   drop function if exists public.login_seguro(text, text);
--   drop trigger if exists trg_usuarios_senha_hash on public.gbp_usuarios;
--   drop function if exists public.gbp_usuarios_sync_senha_hash();
--   alter table public.gbp_usuarios drop column if exists senha_hash;
-- ============================================================================

create extension if not exists pgcrypto;

-- 1) Coluna de hash (transição: convive com a senha em texto por enquanto)
alter table public.gbp_usuarios
  add column if not exists senha_hash text;

-- 2) Backfill: gera hash bcrypt para quem já tem senha
update public.gbp_usuarios
   set senha_hash = extensions.crypt(senha, extensions.gen_salt('bf'))
 where senha is not null
   and senha_hash is null;

-- 3) Trigger: qualquer INSERT/UPDATE na senha atualiza o hash
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

drop trigger if exists trg_usuarios_senha_hash on public.gbp_usuarios;
create trigger trg_usuarios_senha_hash
  before insert or update of senha on public.gbp_usuarios
  for each row
  execute function public.gbp_usuarios_sync_senha_hash();

-- 4) RPC de login seguro
--    - roda como definer (bypassa o que for necessário no servidor)
--    - nunca devolve senha nem senha_hash
--    - falha genérica para não revelar se o email existe
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

-- O app chama como anon (não há sessão Supabase Auth).
-- Seguro: sem a senha correta a função só retorna erro.
revoke execute on function public.login_seguro(text, text) from public;
grant execute on function public.login_seguro(text, text) to anon, authenticated;

-- ============================================================================
-- TESTE RÁPIDO (troque pelos dados de um usuário de teste):
--   select public.login_seguro('email@teste.com', 'senha_correta');   -- ok
--   select public.login_seguro('email@teste.com', 'senha_errada');    -- erro
-- ============================================================================
