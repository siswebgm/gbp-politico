# Como o CRM (frontend) deve criar login/senha da extensão

Este documento é pra quem for implementar, no app Next.js do CRM, a rotina de uma empresa
criar/gerenciar o próprio usuário e senha de acesso à extensão Chrome (login que aparece no
WhatsApp Web, tabela `public.extensao_credenciais`). Se você está lendo isso como assistente de
IA numa sessão nova: é autossuficiente, mas o desenho completo (RLS, JWT, RPCs) está em
`supabase/migrations/0001_login_extensao.sql` e `CLAUDE.md` deste repo, vale ler também.

## O que já existe (não precisa recriar)

```sql
create table public.extensao_credenciais (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references public.gbp_empresas(uid) on delete cascade,
  usuario text not null unique,        -- único GLOBALMENTE, não por empresa (ver seção abaixo)
  senha_hash text not null,            -- bcrypt via pgcrypto, nunca texto puro
  ativo boolean not null default true, -- dá pra "desativar" sem deletar
  created_at timestamptz not null default now(),
  whatsapp_conectado boolean,          -- escrito pela extensão (heartbeat), não pelo CRM
  whatsapp_numero text,                -- idem
  heartbeat_em timestamptz             -- idem
);

alter table public.extensao_credenciais enable row level security;
-- SEM policy nenhuma pra anon/authenticated -- só dá pra mexer via função security definer
-- ou uma conexão privilegiada (service_role / postgres direto). Isso é proposital: essa
-- tabela guarda hash de senha, não deve ser exposta por PostgREST com policy permissiva.
```

As três últimas colunas (`whatsapp_*`) são preenchidas pela extensão a cada ~30s (heartbeat) —
o CRM só **lê**, nunca escreve nelas. Útil pra um painel "WhatsApp conectado / desconectado" por
empresa.

## Por que não dá pra fazer isso com a `anon key` do lado do browser

Sem RLS liberado nessa tabela, um `supabase.from("extensao_credenciais").insert(...)` feito do
navegador do cliente vai falhar (RLS bloqueia, nem chega a rodar). Isso é intencional — criar
login é uma ação administrativa, não algo pra expor direto com a chave pública.

**O jeito certo é o mesmo padrão que este repo já usa pra `lista_disparo_w`:** o CRM insere
usando uma conexão privilegiada do próprio backend (Next.js API route / server action), com a
`service_role key` ou uma conexão direta como role `postgres` — a mesma que hoje já insere linhas
de disparo direto na fila, bypassando RLS. Não precisa de uma função nova no banco pra isso
funcionar (embora seja uma opção, ver seção "Alternativa" abaixo).

## Criar um login (INSERT)

Faça isso **no servidor** (API route/server action do Next.js), nunca no client. A senha em
texto puro só deve trafegar do formulário até esse endpoint (via HTTPS) — a partir daí, quem
transforma em hash é o próprio Postgres, via `pgcrypto`:

```sql
insert into public.extensao_credenciais (empresa_id, usuario, senha_hash)
values (
  $1,                              -- uid da empresa em gbp_empresas
  $2,                              -- usuário escolhido
  crypt($3, gen_salt('bf'))        -- $3 = senha em texto puro; NUNCA gere o hash em JS
);
```

**Não tente gerar o hash em JavaScript** (com alguma lib de bcrypt no Node) e mandar já
hasheado — funciona, mas é trabalho duplicado sem benefício: `verificar_login_extensao` (a
função que valida o login depois, já existente) compara com `crypt(senha_digitada, senha_hash)`,
que é a contraparte exata de `crypt(senha, gen_salt('bf'))`. Deixa o Postgres fazer as duas
pontas.

Se preferir via Supabase JS client com `service_role` em vez de SQL cru:

```ts
// server-side apenas -- service_role key nunca pode chegar no browser
const { error } = await supabaseAdmin.rpc("criar_credencial_extensao", {
  p_empresa_id: empresaId,
  p_usuario: usuario,
  p_senha: senha,
});
```

(isso pressupõe a função da seção "Alternativa" abaixo — sem ela, use `.rpc` não serve pra
inserir com `crypt()` embutido; ou rode a query crua via um client Postgres direto, tipo `pg` ou
`postgres.js`, se o backend já tiver acesso desse tipo ao self-hosted).

## Trocar/resetar senha (UPDATE)

Mesma lógica, mesma regra (server-side, `crypt()`/`gen_salt('bf')` novos a cada troca):

```sql
update public.extensao_credenciais
   set senha_hash = crypt($2, gen_salt('bf'))
 where usuario = $1;
```

## Desativar sem deletar

```sql
update public.extensao_credenciais set ativo = false where usuario = $1;
```

`verificar_login_extensao` já checa `ativo` e recusa login se `false` — não precisa deletar a
linha pra bloquear o acesso (nem seria bom deletar: perde o histórico de `whatsapp_conectado`/
`heartbeat_em` daquele login).

## Cuidado: `usuario` é único globalmente, não por empresa

```sql
usuario text not null unique
```

Não tem escopo por `empresa_id` — dois logins de empresas diferentes não podem ter o mesmo
`usuario`. Duas formas de lidar com isso na UI:

1. **Deixar a empresa escolher livremente** e tratar o erro de `unique_violation` (Postgres
   `23505`) com uma mensagem tipo "esse nome de usuário já está em uso, escolha outro".
2. **Gerar automaticamente** com um prefixo previsível (ex.: slug da empresa + número), evitando
   colisão por design. Mais simples de sustentar em UX se o volume de empresas crescer.

Sem validação de complexidade de senha no banco (sem tamanho mínimo, sem exigência de caracteres
especiais) — se quiser isso, é responsabilidade do formulário do CRM validar antes de mandar pro
servidor, o banco aceita qualquer texto não vazio.

## Alternativa: função `security definer` (se preferir chamar via PostgREST/anon key)

Só vale a pena se o backend do CRM **não** tiver uma conexão privilegiada própria disponível
nesse ponto do código (ex.: se for uma Edge Function ou rota que só tem a `anon key` à mão). Se o
backend já insere direto em `lista_disparo_w` com conexão privilegiada, não precisa disso — use a
mesma conexão.

```sql
create or replace function public.criar_credencial_extensao(
  p_empresa_id uuid,
  p_usuario text,
  p_senha text
)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  insert into public.extensao_credenciais (empresa_id, usuario, senha_hash)
  values (p_empresa_id, p_usuario, crypt(p_senha, gen_salt('bf')));
$$;

revoke all on function public.criar_credencial_extensao(uuid, text, text) from public;
-- Cuidado: NÃO dê grant pra "anon" sem autenticação/autorização própria de quem está chamando --
-- essa função, do jeito que está, deixaria qualquer um com a anon key criar login pra qualquer
-- empresa. Se for esse o caminho, adicione alguma validação de quem está autorizado a criar
-- login pra aquele empresa_id (ex.: checar contra a sessão do próprio CRM antes do insert, ou
-- só liberar essa função pra um role autenticado específico, não o anon genérico).
```

## Testando

1. Cria um login de teste com o fluxo que você implementou.
2. Abre `web.whatsapp.com` com a extensão carregada, usa esse usuário/senha no botão "Entrar" do
   indicador de conexão (canto do WhatsApp Web).
3. Deve aparecer `🟢 WhatsApp GBP - {nome da empresa}` — se aparecer `🟡` (amarelo), o login
   funcionou mas `obter_nome_empresa_extensao()` não achou o nome (confira o `empresa_id`
   inserido bate com um `uid` real em `gbp_empresas`).
