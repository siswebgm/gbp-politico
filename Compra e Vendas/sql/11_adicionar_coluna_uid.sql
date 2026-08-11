-- ============================================================================
-- Adicionar coluna uid como chave primária em todas as tabelas
-- ============================================================================

-- 1. USUARIOS
ALTER TABLE marketplace.usuarios ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.usuarios SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.usuarios ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.usuarios DROP CONSTRAINT IF EXISTS usuarios_pkey;
ALTER TABLE marketplace.usuarios ADD CONSTRAINT usuarios_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS usuarios_id_key ON marketplace.usuarios(id);

-- 2. CATEGORIAS
ALTER TABLE marketplace.categorias ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.categorias SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.categorias ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.categorias DROP CONSTRAINT IF EXISTS categorias_pkey;
ALTER TABLE marketplace.categorias ADD CONSTRAINT categorias_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS categorias_id_key ON marketplace.categorias(id);

-- 3. SUBCATEGORIAS
ALTER TABLE marketplace.subcategorias ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.subcategorias SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.subcategorias ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.subcategorias DROP CONSTRAINT IF EXISTS subcategorias_pkey;
ALTER TABLE marketplace.subcategorias ADD CONSTRAINT subcategorias_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS subcategorias_id_key ON marketplace.subcategorias(id);

-- 4. ANUNCIOS
ALTER TABLE marketplace.anuncios ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.anuncios SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.anuncios ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.anuncios DROP CONSTRAINT IF EXISTS anuncios_pkey;
ALTER TABLE marketplace.anuncios ADD CONSTRAINT anuncios_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS anuncios_id_key ON marketplace.anuncios(id);

-- 5. ANUNCIO_IMAGENS
ALTER TABLE marketplace.anuncio_imagens ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.anuncio_imagens SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.anuncio_imagens ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.anuncio_imagens DROP CONSTRAINT IF EXISTS anuncio_imagens_pkey;
ALTER TABLE marketplace.anuncio_imagens ADD CONSTRAINT anuncio_imagens_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS anuncio_imagens_id_key ON marketplace.anuncio_imagens(id);

-- 6. ANUNCIO_VIDEOS
ALTER TABLE marketplace.anuncio_videos ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.anuncio_videos SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.anuncio_videos ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.anuncio_videos DROP CONSTRAINT IF EXISTS anuncio_videos_pkey;
ALTER TABLE marketplace.anuncio_videos ADD CONSTRAINT anuncio_videos_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS anuncio_videos_id_key ON marketplace.anuncio_videos(id);

-- 7. FAVORITOS
ALTER TABLE marketplace.favoritos ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.favoritos SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.favoritos ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.favoritos DROP CONSTRAINT IF EXISTS favoritos_pkey;
ALTER TABLE marketplace.favoritos ADD CONSTRAINT favoritos_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS favoritos_id_key ON marketplace.favoritos(id);

-- 8. CONVERSAS
ALTER TABLE marketplace.conversas ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.conversas SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.conversas ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.conversas DROP CONSTRAINT IF EXISTS conversas_pkey;
ALTER TABLE marketplace.conversas ADD CONSTRAINT conversas_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS conversas_id_key ON marketplace.conversas(id);

-- 9. MENSAGENS
ALTER TABLE marketplace.mensagens ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.mensagens SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.mensagens ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.mensagens DROP CONSTRAINT IF EXISTS mensagens_pkey;
ALTER TABLE marketplace.mensagens ADD CONSTRAINT mensagens_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS mensagens_id_key ON marketplace.mensagens(id);

-- 10. ANUNCIO_VISUALIZACOES
ALTER TABLE marketplace.anuncio_visualizacoes ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.anuncio_visualizacoes SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.anuncio_visualizacoes ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.anuncio_visualizacoes DROP CONSTRAINT IF EXISTS anuncio_visualizacoes_pkey;
ALTER TABLE marketplace.anuncio_visualizacoes ADD CONSTRAINT anuncio_visualizacoes_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS anuncio_visualizacoes_id_key ON marketplace.anuncio_visualizacoes(id);

-- 11. DENUNCIAS
ALTER TABLE marketplace.denuncias ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.denuncias SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.denuncias ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.denuncias DROP CONSTRAINT IF EXISTS denuncias_pkey;
ALTER TABLE marketplace.denuncias ADD CONSTRAINT denuncias_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS denuncias_id_key ON marketplace.denuncias(id);

-- 12. BANNERS
ALTER TABLE marketplace.banners ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.banners SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.banners ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.banners DROP CONSTRAINT IF EXISTS banners_pkey;
ALTER TABLE marketplace.banners ADD CONSTRAINT banners_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS banners_id_key ON marketplace.banners(id);

-- 13. NOTIFICACOES
ALTER TABLE marketplace.notificacoes ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.notificacoes SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.notificacoes ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_pkey;
ALTER TABLE marketplace.notificacoes ADD CONSTRAINT notificacoes_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS notificacoes_id_key ON marketplace.notificacoes(id);

-- 14. CONFIGURACOES
ALTER TABLE marketplace.configuracoes ADD COLUMN IF NOT EXISTS uid UUID DEFAULT gen_random_uuid();
UPDATE marketplace.configuracoes SET uid = gen_random_uuid() WHERE uid IS NULL;
ALTER TABLE marketplace.configuracoes ALTER COLUMN uid SET NOT NULL;
ALTER TABLE marketplace.configuracoes DROP CONSTRAINT IF EXISTS configuracoes_pkey;
ALTER TABLE marketplace.configuracoes ADD CONSTRAINT configuracoes_pkey PRIMARY KEY (uid);
CREATE UNIQUE INDEX IF NOT EXISTS configuracoes_id_key ON marketplace.configuracoes(id);

-- Recria views ponte no schema public
DROP VIEW IF EXISTS public.usuarios CASCADE;
DROP VIEW IF EXISTS public.categorias CASCADE;
DROP VIEW IF EXISTS public.subcategorias CASCADE;
DROP VIEW IF EXISTS public.anuncios CASCADE;
DROP VIEW IF EXISTS public.anuncio_imagens CASCADE;
DROP VIEW IF EXISTS public.anuncio_videos CASCADE;
DROP VIEW IF EXISTS public.favoritos CASCADE;
DROP VIEW IF EXISTS public.conversas CASCADE;
DROP VIEW IF EXISTS public.mensagens CASCADE;
DROP VIEW IF EXISTS public.anuncio_visualizacoes CASCADE;
DROP VIEW IF EXISTS public.denuncias CASCADE;
DROP VIEW IF EXISTS public.banners CASCADE;
DROP VIEW IF EXISTS public.notificacoes CASCADE;
DROP VIEW IF EXISTS public.configuracoes CASCADE;
DROP VIEW IF EXISTS public.anuncios_publicos CASCADE;
DROP VIEW IF EXISTS public.perfis_vendedores CASCADE;
DROP VIEW IF EXISTS public.conversas_com_ultima_mensagem CASCADE;

CREATE OR REPLACE VIEW public.usuarios WITH (security_invoker = true) AS SELECT * FROM marketplace.usuarios;
CREATE OR REPLACE VIEW public.categorias WITH (security_invoker = true) AS SELECT * FROM marketplace.categorias;
CREATE OR REPLACE VIEW public.subcategorias WITH (security_invoker = true) AS SELECT * FROM marketplace.subcategorias;
CREATE OR REPLACE VIEW public.anuncios WITH (security_invoker = true) AS SELECT * FROM marketplace.anuncios;
CREATE OR REPLACE VIEW public.anuncio_imagens WITH (security_invoker = true) AS SELECT * FROM marketplace.anuncio_imagens;
CREATE OR REPLACE VIEW public.anuncio_videos WITH (security_invoker = true) AS SELECT * FROM marketplace.anuncio_videos;
CREATE OR REPLACE VIEW public.favoritos WITH (security_invoker = true) AS SELECT * FROM marketplace.favoritos;
CREATE OR REPLACE VIEW public.conversas WITH (security_invoker = true) AS SELECT * FROM marketplace.conversas;
CREATE OR REPLACE VIEW public.mensagens WITH (security_invoker = true) AS SELECT * FROM marketplace.mensagens;
CREATE OR REPLACE VIEW public.anuncio_visualizacoes WITH (security_invoker = true) AS SELECT * FROM marketplace.anuncio_visualizacoes;
CREATE OR REPLACE VIEW public.denuncias WITH (security_invoker = true) AS SELECT * FROM marketplace.denuncias;
CREATE OR REPLACE VIEW public.banners WITH (security_invoker = true) AS SELECT * FROM marketplace.banners;
CREATE OR REPLACE VIEW public.notificacoes WITH (security_invoker = true) AS SELECT * FROM marketplace.notificacoes;
CREATE OR REPLACE VIEW public.configuracoes WITH (security_invoker = true) AS SELECT * FROM marketplace.configuracoes;

-- Recria views agregadas
CREATE OR REPLACE VIEW marketplace.anuncios_publicos AS
SELECT p.uid, p.id, p.titulo, p.slug, p.descricao, p.preco, p.condicao, p.quantidade, p.cidade, p.condominio, p.endereco,
       p.latitude, p.longitude, p.visualizacoes, p.situacao, p.destaque, p.negociavel, p.aceita_troca, p.video_url,
       p.criado_em, p.atualizado_em,
       c.id AS categoria_id, c.nome AS categoria_nome, c.slug AS categoria_slug,
       sc.id AS subcategoria_id, sc.nome AS subcategoria_nome, sc.slug AS subcategoria_slug,
       u.id AS vendedor_id, u.nome AS vendedor_nome, u.slug AS vendedor_slug, u.foto_url AS vendedor_foto_url,
       u.cidade AS vendedor_cidade, u.avaliacao AS vendedor_avaliacao,
       (SELECT pi.url FROM marketplace.anuncio_imagens pi WHERE pi.anuncio_id = p.id ORDER BY pi.ordem ASC, pi.criado_em ASC LIMIT 1) AS capa_url,
       (SELECT count(*) FROM marketplace.anuncio_imagens pi WHERE pi.anuncio_id = p.id) AS total_imagens
FROM marketplace.anuncios p
LEFT JOIN marketplace.categorias c ON c.id = p.categoria_id
LEFT JOIN marketplace.subcategorias sc ON sc.id = p.subcategoria_id
LEFT JOIN marketplace.usuarios u ON u.id = p.usuario_id
WHERE p.situacao = 'ativo';

CREATE OR REPLACE VIEW marketplace.perfis_vendedores AS
SELECT u.uid, u.id, u.slug, u.nome, u.foto_url, u.biografia, u.cidade, u.estado, u.avaliacao, u.total_avaliacoes, u.criado_em,
       count(p.id) FILTER (WHERE p.situacao = 'ativo') AS total_anuncios_ativos,
       count(p.id) FILTER (WHERE p.situacao = 'vendido') AS total_anuncios_vendidos
FROM marketplace.usuarios u
LEFT JOIN marketplace.anuncios p ON p.usuario_id = u.id
WHERE u.situacao = 'ativo'
GROUP BY u.uid, u.id;

CREATE OR REPLACE VIEW marketplace.conversas_com_ultima_mensagem AS
SELECT cr.uid, cr.id, cr.anuncio_id, cr.comprador_id, cr.vendedor_id, cr.criado_em, cr.ultima_mensagem_em,
       p.titulo AS anuncio_titulo, p.slug AS anuncio_slug,
       (SELECT pi.url FROM marketplace.anuncio_imagens pi WHERE pi.anuncio_id = p.id ORDER BY pi.ordem ASC LIMIT 1) AS anuncio_imagem_url,
       lm.conteudo AS ultima_mensagem_conteudo, lm.remetente_id AS ultima_mensagem_remetente_id, lm.criado_em AS ultima_mensagem_criado_em,
       (SELECT count(*) FROM marketplace.mensagens m WHERE m.conversa_id = cr.id AND m.lida_em IS NULL) AS nao_lidas
FROM marketplace.conversas cr
JOIN marketplace.anuncios p ON p.id = cr.anuncio_id
LEFT JOIN LATERAL (
  SELECT conteudo, remetente_id, criado_em FROM marketplace.mensagens WHERE conversa_id = cr.id ORDER BY criado_em DESC LIMIT 1
) lm ON true;

CREATE OR REPLACE VIEW public.anuncios_publicos WITH (security_invoker = true) AS SELECT * FROM marketplace.anuncios_publicos;
CREATE OR REPLACE VIEW public.perfis_vendedores WITH (security_invoker = true) AS SELECT * FROM marketplace.perfis_vendedores;
CREATE OR REPLACE VIEW public.conversas_com_ultima_mensagem WITH (security_invoker = true) AS SELECT * FROM marketplace.conversas_com_ultima_mensagem;

-- Permissões
GRANT SELECT ON
  public.usuarios, public.categorias, public.subcategorias, public.anuncios,
  public.anuncio_imagens, public.anuncio_videos, public.banners, public.configuracoes,
  public.anuncios_publicos, public.perfis_vendedores
TO anon, authenticated;
GRANT SELECT ON
  public.favoritos, public.conversas, public.mensagens,
  public.conversas_com_ultima_mensagem, public.anuncio_visualizacoes,
  public.denuncias, public.notificacoes
TO authenticated;
GRANT INSERT, UPDATE, DELETE ON
  public.usuarios, public.anuncios, public.anuncio_imagens, public.anuncio_videos,
  public.favoritos, public.conversas, public.mensagens, public.denuncias
TO authenticated;
