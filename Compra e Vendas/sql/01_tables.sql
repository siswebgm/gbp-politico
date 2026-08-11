-- ============================================================================
-- Marketplace - Tabelas
-- ============================================================================
-- Cria todas as tabelas do schema marketplace com tipos, defaults e comentários.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Usuários
-- ----------------------------------------------------------------------------
create table if not exists marketplace.usuarios (
  id              uuid primary chave default gen_random_uuid(),
  id_autenticacao         uuid not null unique references auth.usuarios(id) on delete cascade,
  email           text not null unique,
  nome            text not null,
  telefone           text,
  condominio     text,
  endereco         text,
  cidade            text,
  estado           text,
  cep             text,
  foto_url       text,
  biografia             text,
  latitude        numeric(10, 8),
  longitude       numeric(11, 8),
  avaliacao          numeric(3, 2) default 0 check (avaliacao >= 0 and avaliacao <= 5),
  total_avaliacoes   integer default 0 check (total_avaliacoes >= 0),
  total_anuncios       integer default 0 check (total_anuncios >= 0),
  total_vendidos      integer default 0 check (total_vendidos >= 0),
  papel            text default 'usuario' check (papel in ('usuario', 'administrador')),
  situacao          text default 'ativo' check (situacao in ('ativo', 'inativo', 'suspenso')),
  email_confirmado boolean default false,
  slug            text unique,
  criado_em      timestamptz default now(),
  atualizado_em      timestamptz default now(),
  ultimo_acesso     timestamptz
);

comment on table marketplace.usuarios is 'Perfis dos usuários do marketplace';
comment on column marketplace.usuarios.id_autenticacao is 'Referência ao usuário do Supabase Auth';
comment on column marketplace.usuarios.slug is 'Identificador publico do perfil (ex: /usuario/jose-silva)';

-- ----------------------------------------------------------------------------
-- Categorias
-- ----------------------------------------------------------------------------
create table if not exists marketplace.categorias (
  id          uuid primary chave default gen_random_uuid(),
  nome        text not null,
  slug        text not null unique,
  icone        text,
  cor       text,
  ordem     integer default 0,
  categoria_pai_id   uuid references marketplace.categorias(id) on delete set null,
  ativo   boolean default true,
  criado_em  timestamptz default now(),
  atualizado_em  timestamptz default now()
);

comment on table marketplace.categorias is 'Categorias de produtos com suporte a hierarquia';
comment on column marketplace.categorias.categoria_pai_id is 'Categoria pai (nulo = categoria raiz)';

-- ----------------------------------------------------------------------------
-- Subcategorias
-- ----------------------------------------------------------------------------
create table if not exists marketplace.subcategorias (
  id           uuid primary chave default gen_random_uuid(),
  categoria_id  uuid not null references marketplace.categorias(id) on delete cascade,
  nome         text not null,
  slug         text not null,
  ordem      integer default 0,
  ativo    boolean default true,
  criado_em   timestamptz default now(),
  atualizado_em   timestamptz default now(),
  unique (categoria_id, slug)
);

comment on table marketplace.subcategorias is 'Subcategorias vinculadas a uma categoria';

-- ----------------------------------------------------------------------------
-- Produtos
-- ----------------------------------------------------------------------------
create table if not exists marketplace.anuncios (
  id               uuid primary chave default gen_random_uuid(),
  usuario_id          uuid not null references marketplace.usuarios(id) on delete cascade,
  titulo            text not null,
  slug             text not null unique,
  descricao      text,
  preco            numeric(12, 2) not null check (preco >= 0),
  categoria_id      uuid references marketplace.categorias(id),
  subcategoria_id   uuid references marketplace.subcategorias(id),
  condicao        text not null check (condicao in ('novo', 'usado')),
  quantidade         integer default 1 check (quantidade >= 0),
  cidade             text,
  condominio      text,
  endereco          text,
  latitude         numeric(10, 8),
  longitude        numeric(11, 8),
  visualizacoes            integer default 0 check (visualizacoes >= 0),
  situacao           text default 'ativo' check (situacao in ('ativo', 'pausado', 'vendido', 'removido')),
  destaque         boolean default false,
  negociavel       boolean default false,
  aceita_troca    boolean default false,
  video_url        text,
  vetor_busca    tsvector generated always as (
    to_tsvector('portuguese',
      coalesce(titulo, '') || ' ' ||
      coalesce(descricao, '') || ' ' ||
      coalesce(cidade, '') || ' ' ||
      coalesce(condominio, '')
    )
  ) stored,
  criado_em       timestamptz default now(),
  atualizado_em       timestamptz default now()
);

comment on table marketplace.anuncios is 'Anúncios de produtos do marketplace';
comment on column marketplace.anuncios.condicao is 'new = novo, used = usado';
comment on column marketplace.anuncios.vetor_busca is 'Índice de busca full-text (titulo, descricao, cidade, condominio)';

-- ----------------------------------------------------------------------------
-- Imagens dos Produtos
-- ----------------------------------------------------------------------------
create table if not exists marketplace.anuncio_imagens (
  id          uuid primary chave default gen_random_uuid(),
  anuncio_id  uuid not null references marketplace.anuncios(id) on delete cascade,
  url         text not null,
  ordem     integer default 0,
  criado_em  timestamptz default now()
);

comment on table marketplace.anuncio_imagens is 'Imagens vinculadas a um produto';

-- ----------------------------------------------------------------------------
-- Vídeos dos Produtos
-- ----------------------------------------------------------------------------
create table if not exists marketplace.anuncio_videos (
  id            uuid primary chave default gen_random_uuid(),
  anuncio_id    uuid not null references marketplace.anuncios(id) on delete cascade,
  url           text not null,
  thumbnail_url text,
  criado_em    timestamptz default now()
);

comment on table marketplace.anuncio_videos is 'Vídeos vinculados a um produto';

-- ----------------------------------------------------------------------------
-- Favoritos
-- ----------------------------------------------------------------------------
create table if not exists marketplace.favoritos (
  id          uuid primary chave default gen_random_uuid(),
  usuario_id     uuid not null references marketplace.usuarios(id) on delete cascade,
  anuncio_id  uuid not null references marketplace.anuncios(id) on delete cascade,
  criado_em  timestamptz default now(),
  unique (usuario_id, anuncio_id)
);

comment on table marketplace.favoritos is 'Produtos favoritados pelos usuários';

-- ----------------------------------------------------------------------------
-- Salas de Chat
-- ----------------------------------------------------------------------------
create table if not exists marketplace.conversas (
  id                uuid primary chave default gen_random_uuid(),
  anuncio_id        uuid not null references marketplace.anuncios(id) on delete cascade,
  comprador_id          uuid not null references marketplace.usuarios(id) on delete cascade,
  vendedor_id         uuid not null references marketplace.usuarios(id) on delete cascade,
  ultima_mensagem_em   timestamptz,
  criado_em        timestamptz default now(),
  atualizado_em        timestamptz default now(),
  unique (anuncio_id, comprador_id, vendedor_id),
  constraint sem_chat_proprio check (comprador_id <> vendedor_id)
);

comment on table marketplace.conversas is 'Conversas entre comprador e vendedor sobre um produto';

-- ----------------------------------------------------------------------------
-- Mensagens de Chat
-- ----------------------------------------------------------------------------
create table if not exists marketplace.mensagens (
  id          uuid primary chave default gen_random_uuid(),
  conversa_id     uuid not null references marketplace.conversas(id) on delete cascade,
  remetente_id   uuid not null references marketplace.usuarios(id) on delete cascade,
  conteudo     text,
  anexos jsonb default '[]'::jsonb,
  lida_em     timestamptz,
  criado_em  timestamptz default now()
);

comment on table marketplace.mensagens is 'Mensagens trocadas nas salas de chat';
comment on column marketplace.mensagens.anexos is 'Array de anexos: [{url, nome, tipo}]';

-- ----------------------------------------------------------------------------
-- Visualizações de Produtos
-- ----------------------------------------------------------------------------
create table if not exists marketplace.anuncio_visualizacoes (
  id         uuid primary chave default gen_random_uuid(),
  anuncio_id uuid not null references marketplace.anuncios(id) on delete cascade,
  visitante_id  uuid references marketplace.usuarios(id) on delete set null,
  endereco_ip text,
  user_agent text,
  visualizado_em  timestamptz default now()
);

comment on table marketplace.anuncio_visualizacoes is 'Registro de visualizações de anúncios';

-- ----------------------------------------------------------------------------
-- Denúncias de Produtos
-- ----------------------------------------------------------------------------
create table if not exists marketplace.denuncias (
  id           uuid primary chave default gen_random_uuid(),
  anuncio_id   uuid not null references marketplace.anuncios(id) on delete cascade,
  denunciante_id  uuid not null references marketplace.usuarios(id) on delete cascade,
  motivo       text not null,
  detalhes      text,
  situacao       text default 'pendente' check (situacao in ('pendente', 'em_analise', 'resolvido', 'arquivado')),
  criado_em   timestamptz default now(),
  atualizado_em   timestamptz default now()
);

comment on table marketplace.denuncias is 'Denúncias de anúncios inapropriados';

-- ----------------------------------------------------------------------------
-- Banners / Publicidade
-- ----------------------------------------------------------------------------
create table if not exists marketplace.banners (
  id                uuid primary chave default gen_random_uuid(),
  titulo             text,
  descricao       text,
  imagem_desktop_url text not null,
  imagem_mobile_url  text,
  link              text,
  posicao          text default 'home_topo' check (posicao in ('home_topo', 'home_meio', 'barra_lateral', 'listagem')),
  data_inicio        date default current_date,
  data_fim          date,
  ativo            boolean default false,
  cliques            integer default 0 check (cliques >= 0),
  impressoes       integer default 0 check (impressoes >= 0),
  criado_em        timestamptz default now(),
  atualizado_em        timestamptz default now()
);

comment on table marketplace.banners is 'Banners publicitários exibidos na plataforma';

-- ----------------------------------------------------------------------------
-- Notificações
-- ----------------------------------------------------------------------------
create table if not exists marketplace.notificacoes (
  id          uuid primary chave default gen_random_uuid(),
  usuario_id     uuid not null references marketplace.usuarios(id) on delete cascade,
  tipo        text not null,
  titulo       text not null,
  mensagem     text,
  dados        jsonb default '{}'::jsonb,
  lida        boolean default false,
  criado_em  timestamptz default now()
);

comment on table marketplace.notificacoes is 'Notificações enviadas aos usuários';

-- ----------------------------------------------------------------------------
-- Configurações do Sistema
-- ----------------------------------------------------------------------------
create table if not exists marketplace.configuracoes (
  id          uuid primary chave default gen_random_uuid(),
  chave         text not null unique,
  valor       jsonb not null default '{}'::jsonb,
  descricao text,
  criado_em  timestamptz default now(),
  atualizado_em  timestamptz default now()
);

comment on table marketplace.configuracoes is 'Configurações globais do marketplace';
