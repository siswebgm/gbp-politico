-- ============================================================================
-- AUDITORIA DE SEGURANÇA — ETAPA 4b: REVOGAR ESCRITA DIRETA EM gbp_usuarios
--
-- RODE SOMENTE DEPOIS do deploy do frontend (imagem nova com as RPCs).
--
-- O que faz:
--   1. Revoga INSERT e DELETE em gbp_usuarios de anon/authenticated
--      → criar usuário só via admin_criar_usuario / registrar_conta
--      → excluir usuário só via admin_excluir_usuario
--   2. UPDATE passa a valer SÓ para colunas não sensíveis:
--      ultimo_acesso, notification_*, tema
--      → nome/email/contato/status/cargo/nivel_acesso/permissoes/foto/
--        empresa_uid só mudam via RPCs com sessão
--
-- Depois disso, um invasor com a anon key não consegue mais:
--   - criar conta em empresa alheia (INSERT revogado)
--   - virar admin (UPDATE de nivel_acesso/permissoes revogado)
--   - bloquear/desbloquear contas (UPDATE de status revogado)
--   - mudar contato/email de outra pessoa (UPDATE revogado)
--   - pular de empresa (UPDATE de empresa_uid revogado)
-- ============================================================================

-- 0) Coluna tema: usada pelo useThemeStore p/ persistir dark mode por usuário.
--    Hoje não existe e gera HTTP 400 no select — criar antes do grant abaixo.
alter table public.gbp_usuarios add column if not exists tema text;

-- 1) INSERT e DELETE: só via RPC
revoke insert on public.gbp_usuarios from public, anon, authenticated;
revoke delete on public.gbp_usuarios from public, anon, authenticated;

-- 2) UPDATE: só colunas não sensíveis (concede dinamicamente o que existir)
revoke update on public.gbp_usuarios from public, anon, authenticated;

do $$
declare
  v_cols text;
  v_permitidas text[] := array[
    'ultimo_acesso',
    'notification_token',
    'notification_status',
    'notification_updated_at',
    'tema'
  ];
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
    into v_cols
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'gbp_usuarios'
     and column_name = any (v_permitidas);

  if v_cols is not null then
    execute format('grant update (%s) on public.gbp_usuarios to anon, authenticated', v_cols);
  end if;
end $$;

-- Recarrega o cache do PostgREST
notify pgrst, 'reload schema';

-- ============================================================================
-- TESTES DE FUMAÇA (rode depois):
--   -- como anon, TODOS devem falhar com permission denied:
--   --   set role anon; update public.gbp_usuarios set nivel_acesso='admin'
--   --        where uid='<uid>'; reset role;
--   --   set role anon; insert into public.gbp_usuarios(email) values('x@x.com');
--   --        reset role;
--   --   set role anon; update public.gbp_usuarios set ultimo_acesso=now()
--   --        where uid='<uid>'; reset role;  -- este DEVE funcionar
-- ============================================================================
