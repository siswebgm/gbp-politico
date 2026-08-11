# SQL do Marketplace

Execute os scripts na ordem abaixo no **SQL Editor do Supabase**, usando a role `postgres` (necessária para criar o schema, triggers em `auth.users` e RLS):

1. `00_setup.sql` — cria o schema `marketplace` e extensões.
2. `01_tables.sql` — cria todas as tabelas.
3. `02_indexes.sql` — cria índices de performance.
4. `03_functions.sql` — funções, triggers (slugs, updated_at, criação automática de perfil).
5. `04_views.sql` — views auxiliares para o frontend.
6. `05_rls.sql` — habilita RLS e define todas as policies + grants.
7. `06_seeds.sql` — categorias, subcategorias e configurações iniciais.
8. `07_public_bridge.sql` — **obrigatório neste projeto**: cria views/functions no schema `public` apontando para `marketplace`, pois o PostgREST desta instância self-hosted não expõe o schema `marketplace` (ver seção abaixo).
9. `08_storage.sql` — cria os buckets do Supabase Storage (`product-images`, `product-videos`, `avatars`, `banners`) e as policies de acesso.
10. `09_realtime.sql` — habilita Realtime nas tabelas de chat (necessário para o chat funcionar em tempo real).

## ⚠️ Por que existe o `07_public_bridge.sql`?

Este projeto Supabase (self-hosted, `studio.gbppolitico.com`) só expõe via API REST os schemas configurados em `PGRST_DB_SCHEMAS`: `public, storage, graphql_public, cobrancas`. Não há acesso ao servidor nem ao Studio para adicionar `marketplace` a essa lista.

Solução adotada: as **tabelas reais continuam 100% em `marketplace`** (RLS, triggers, índices, funções). O script `07_public_bridge.sql` cria **views no schema `public`** com `security_invoker = true`, que apenas espelham as tabelas de `marketplace`. Esse parâmetro garante que o RLS de `marketplace` seja avaliado com o papel da requisição (`anon`/`authenticated`), e não com o dono da view — sem ele, o RLS seria contornado.

Se no futuro você conseguir adicionar `marketplace` a `PGRST_DB_SCHEMAS` no servidor, o app pode voltar a apontar diretamente para o schema `marketplace` (bastaria remover a opção de schema do client e usar `marketplace` novamente); o `07_public_bridge.sql` pode ser mantido ou removido nesse caso.

## Observações importantes

- **Não use `public`**: todas as tabelas ficam em `marketplace`.
- O trigger `trg_auth_users_insert` cria automaticamente um registro em `marketplace.users` sempre que um novo usuário é criado no Supabase Auth (`auth.users`).
- `marketplace.get_current_user_id()` mapeia `auth.uid()` para o `id` correspondente em `marketplace.users` — use-a em qualquer policy nova.
- `marketplace.is_admin()` verifica `role = 'admin'` para liberar operações administrativas.
- Após rodar os scripts, gere os tipos TypeScript com a Supabase CLI:

  ```bash
  supabase gen types typescript --project-id <seu-projeto> --schema marketplace > src/lib/supabase/types.ts
  ```

- Para reexecutar do zero em ambiente de desenvolvimento:

  ```sql
  drop schema if exists marketplace cascade;
  ```

  seguido novamente pelos scripts 00 a 06.
