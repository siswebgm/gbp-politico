-- ============================================================================
-- Marketplace - Migracao: renomear tabelas e colunas para o portugues
-- Execute uma unica vez na base de dados existente.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_users_before_insert ON marketplace.users;
DROP TRIGGER IF EXISTS trg_products_before_insert ON marketplace.products;
DROP TRIGGER IF EXISTS trg_auth_users_insert ON auth.users;

-- Renomeia colunas
ALTER TABLE marketplace.users RENAME COLUMN auth_id TO id_autenticacao;
ALTER TABLE marketplace.users RENAME COLUMN name TO nome;
ALTER TABLE marketplace.users RENAME COLUMN phone TO telefone;
ALTER TABLE marketplace.users RENAME COLUMN condominium TO condominio;
ALTER TABLE marketplace.users RENAME COLUMN address TO endereco;
ALTER TABLE marketplace.users RENAME COLUMN city TO cidade;
ALTER TABLE marketplace.users RENAME COLUMN state TO estado;
ALTER TABLE marketplace.users RENAME COLUMN zip TO cep;
ALTER TABLE marketplace.users RENAME COLUMN photo_url TO foto_url;
ALTER TABLE marketplace.users RENAME COLUMN bio TO biografia;
ALTER TABLE marketplace.users RENAME COLUMN rating TO avaliacao;
ALTER TABLE marketplace.users RENAME COLUMN total_reviews TO total_avaliacoes;
ALTER TABLE marketplace.users RENAME COLUMN total_ads TO total_anuncios;
ALTER TABLE marketplace.users RENAME COLUMN total_sold TO total_vendidos;
ALTER TABLE marketplace.users RENAME COLUMN role TO papel;
ALTER TABLE marketplace.users RENAME COLUMN status TO situacao;
ALTER TABLE marketplace.users RENAME COLUMN email_confirmed TO email_confirmado;
ALTER TABLE marketplace.users RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.users RENAME COLUMN updated_at TO atualizado_em;
ALTER TABLE marketplace.users RENAME COLUMN last_access TO ultimo_acesso;
ALTER TABLE marketplace.categories RENAME COLUMN name TO nome;
ALTER TABLE marketplace.categories RENAME COLUMN icon TO icone;
ALTER TABLE marketplace.categories RENAME COLUMN color TO cor;
ALTER TABLE marketplace.categories RENAME COLUMN "order" TO ordem;
ALTER TABLE marketplace.categories RENAME COLUMN parent_id TO categoria_pai_id;
ALTER TABLE marketplace.categories RENAME COLUMN is_active TO ativo;
ALTER TABLE marketplace.categories RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.categories RENAME COLUMN updated_at TO atualizado_em;
ALTER TABLE marketplace.subcategories RENAME COLUMN category_id TO categoria_id;
ALTER TABLE marketplace.subcategories RENAME COLUMN name TO nome;
ALTER TABLE marketplace.subcategories RENAME COLUMN "order" TO ordem;
ALTER TABLE marketplace.subcategories RENAME COLUMN is_active TO ativo;
ALTER TABLE marketplace.subcategories RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.subcategories RENAME COLUMN updated_at TO atualizado_em;
ALTER TABLE marketplace.products RENAME COLUMN user_id TO usuario_id;
ALTER TABLE marketplace.products RENAME COLUMN title TO titulo;
ALTER TABLE marketplace.products RENAME COLUMN description TO descricao;
ALTER TABLE marketplace.products RENAME COLUMN price TO preco;
ALTER TABLE marketplace.products RENAME COLUMN category_id TO categoria_id;
ALTER TABLE marketplace.products RENAME COLUMN subcategory_id TO subcategoria_id;
ALTER TABLE marketplace.products RENAME COLUMN condition TO condicao;
ALTER TABLE marketplace.products RENAME COLUMN quantity TO quantidade;
ALTER TABLE marketplace.products RENAME COLUMN city TO cidade;
ALTER TABLE marketplace.products RENAME COLUMN condominium TO condominio;
ALTER TABLE marketplace.products RENAME COLUMN address TO endereco;
ALTER TABLE marketplace.products RENAME COLUMN views TO visualizacoes;
ALTER TABLE marketplace.products RENAME COLUMN status TO situacao;
ALTER TABLE marketplace.products RENAME COLUMN featured TO destaque;
ALTER TABLE marketplace.products RENAME COLUMN negotiable TO negociavel;
ALTER TABLE marketplace.products RENAME COLUMN accepts_trade TO aceita_troca;
ALTER TABLE marketplace.products RENAME COLUMN search_vector TO vetor_busca;
ALTER TABLE marketplace.products RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.products RENAME COLUMN updated_at TO atualizado_em;
ALTER TABLE marketplace.product_images RENAME COLUMN product_id TO anuncio_id;
ALTER TABLE marketplace.product_images RENAME COLUMN "order" TO ordem;
ALTER TABLE marketplace.product_images RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.product_videos RENAME COLUMN product_id TO anuncio_id;
ALTER TABLE marketplace.product_videos RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.favorites RENAME COLUMN user_id TO usuario_id;
ALTER TABLE marketplace.favorites RENAME COLUMN product_id TO anuncio_id;
ALTER TABLE marketplace.favorites RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.chat_rooms RENAME COLUMN product_id TO anuncio_id;
ALTER TABLE marketplace.chat_rooms RENAME COLUMN buyer_id TO comprador_id;
ALTER TABLE marketplace.chat_rooms RENAME COLUMN seller_id TO vendedor_id;
ALTER TABLE marketplace.chat_rooms RENAME COLUMN last_message_at TO ultima_mensagem_em;
ALTER TABLE marketplace.chat_rooms RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.chat_rooms RENAME COLUMN updated_at TO atualizado_em;
ALTER TABLE marketplace.chat_messages RENAME COLUMN room_id TO conversa_id;
ALTER TABLE marketplace.chat_messages RENAME COLUMN sender_id TO remetente_id;
ALTER TABLE marketplace.chat_messages RENAME COLUMN content TO conteudo;
ALTER TABLE marketplace.chat_messages RENAME COLUMN attachments TO anexos;
ALTER TABLE marketplace.chat_messages RENAME COLUMN read_at TO lida_em;
ALTER TABLE marketplace.chat_messages RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.product_views RENAME COLUMN product_id TO anuncio_id;
ALTER TABLE marketplace.product_views RENAME COLUMN viewer_id TO visitante_id;
ALTER TABLE marketplace.product_views RENAME COLUMN ip_address TO endereco_ip;
ALTER TABLE marketplace.product_views RENAME COLUMN viewed_at TO visualizado_em;
ALTER TABLE marketplace.product_reports RENAME COLUMN product_id TO anuncio_id;
ALTER TABLE marketplace.product_reports RENAME COLUMN reporter_id TO denunciante_id;
ALTER TABLE marketplace.product_reports RENAME COLUMN reason TO motivo;
ALTER TABLE marketplace.product_reports RENAME COLUMN details TO detalhes;
ALTER TABLE marketplace.product_reports RENAME COLUMN status TO situacao;
ALTER TABLE marketplace.product_reports RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.product_reports RENAME COLUMN updated_at TO atualizado_em;
ALTER TABLE marketplace.banner_ads RENAME COLUMN title TO titulo;
ALTER TABLE marketplace.banner_ads RENAME COLUMN description TO descricao;
ALTER TABLE marketplace.banner_ads RENAME COLUMN desktop_image_url TO imagem_desktop_url;
ALTER TABLE marketplace.banner_ads RENAME COLUMN mobile_image_url TO imagem_mobile_url;
ALTER TABLE marketplace.banner_ads RENAME COLUMN position TO posicao;
ALTER TABLE marketplace.banner_ads RENAME COLUMN start_date TO data_inicio;
ALTER TABLE marketplace.banner_ads RENAME COLUMN end_date TO data_fim;
ALTER TABLE marketplace.banner_ads RENAME COLUMN active TO ativo;
ALTER TABLE marketplace.banner_ads RENAME COLUMN clicks TO cliques;
ALTER TABLE marketplace.banner_ads RENAME COLUMN impressions TO impressoes;
ALTER TABLE marketplace.banner_ads RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.banner_ads RENAME COLUMN updated_at TO atualizado_em;
ALTER TABLE marketplace.notifications RENAME COLUMN user_id TO usuario_id;
ALTER TABLE marketplace.notifications RENAME COLUMN type TO tipo;
ALTER TABLE marketplace.notifications RENAME COLUMN title TO titulo;
ALTER TABLE marketplace.notifications RENAME COLUMN message TO mensagem;
ALTER TABLE marketplace.notifications RENAME COLUMN data TO dados;
ALTER TABLE marketplace.notifications RENAME COLUMN read TO lida;
ALTER TABLE marketplace.notifications RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.settings RENAME COLUMN key TO chave;
ALTER TABLE marketplace.settings RENAME COLUMN value TO valor;
ALTER TABLE marketplace.settings RENAME COLUMN description TO descricao;
ALTER TABLE marketplace.settings RENAME COLUMN created_at TO criado_em;
ALTER TABLE marketplace.settings RENAME COLUMN updated_at TO atualizado_em;

-- Renomeia tabelas
ALTER TABLE marketplace.users RENAME TO usuarios;
ALTER TABLE marketplace.categories RENAME TO categorias;
ALTER TABLE marketplace.subcategories RENAME TO subcategorias;
ALTER TABLE marketplace.products RENAME TO anuncios;
ALTER TABLE marketplace.product_images RENAME TO anuncio_imagens;
ALTER TABLE marketplace.product_videos RENAME TO anuncio_videos;
ALTER TABLE marketplace.favorites RENAME TO favoritos;
ALTER TABLE marketplace.chat_rooms RENAME TO conversas;
ALTER TABLE marketplace.chat_messages RENAME TO mensagens;
ALTER TABLE marketplace.product_views RENAME TO anuncio_visualizacoes;
ALTER TABLE marketplace.product_reports RENAME TO denuncias;
ALTER TABLE marketplace.banner_ads RENAME TO banners;
ALTER TABLE marketplace.notifications RENAME TO notificacoes;
ALTER TABLE marketplace.settings RENAME TO configuracoes;

-- Renomeia constraints
ALTER TABLE marketplace.conversas RENAME CONSTRAINT no_self_chat TO sem_chat_proprio;

-- Atualiza check constraints
ALTER TABLE marketplace.usuarios DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE marketplace.usuarios ADD CONSTRAINT users_role_check CHECK (papel IN ('usuario','administrador'));
ALTER TABLE marketplace.usuarios DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE marketplace.usuarios ADD CONSTRAINT users_status_check CHECK (situacao IN ('ativo','inativo','suspenso'));
ALTER TABLE marketplace.anuncios DROP CONSTRAINT IF EXISTS products_condition_check;
ALTER TABLE marketplace.anuncios ADD CONSTRAINT products_condition_check CHECK (condicao IN ('novo','usado'));
ALTER TABLE marketplace.anuncios DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE marketplace.anuncios ADD CONSTRAINT products_status_check CHECK (situacao IN ('ativo','pausado','vendido','removido'));
ALTER TABLE marketplace.denuncias DROP CONSTRAINT IF EXISTS product_reports_status_check;
ALTER TABLE marketplace.denuncias ADD CONSTRAINT product_reports_status_check CHECK (situacao IN ('pendente','em_analise','resolvido','arquivado'));
ALTER TABLE marketplace.banners DROP CONSTRAINT IF EXISTS banner_ads_position_check;
ALTER TABLE marketplace.banners ADD CONSTRAINT banner_ads_position_check CHECK (posicao IN ('home_topo','home_meio','barra_lateral','listagem'));

-- Recria funcoes com nomes/campos em portugues
CREATE OR REPLACE FUNCTION marketplace.atualizar_coluna_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END;
$$;

CREATE OR REPLACE FUNCTION marketplace.definir_slug_usuario()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := marketplace.slugify(coalesce(NULLIF(NEW.nome, ''), 'usuario')) || '-' || substring(NEW.id::text, 1, 8);
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION marketplace.definir_slug_anuncio()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.id IS NULL THEN NEW.id := gen_random_uuid(); END IF;
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := marketplace.slugify(coalesce(NULLIF(NEW.titulo, ''), 'anuncio')) || '-' || substring(NEW.id::text, 1, 8);
  END IF;
  IF NEW.situacao IS NULL
     OR NEW.situacao NOT IN ('ativo', 'pausado', 'vendido', 'removido') THEN
    NEW.situacao := 'ativo';
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION marketplace.tratar_novo_usuario()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, auth, public AS $$
BEGIN
  INSERT INTO marketplace.usuarios (id_autenticacao, email, nome, foto_url, email_confirmado, situacao, papel, ultimo_acesso)
  VALUES (
    NEW.id,
    NEW.email,
    coalesce(nullif(NEW.raw_user_meta_data ->> 'name', ''), split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'photo_url',
    NEW.email_confirmed_at IS NOT NULL,
    'ativo',
    coalesce(NEW.raw_user_meta_data ->> 'role', 'usuario'),
    now()
  ) ON CONFLICT (id_autenticacao) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION marketplace.obter_id_usuario_atual()
RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT id FROM marketplace.usuarios WHERE id_autenticacao = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION marketplace.eh_administrador()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT exists(SELECT 1 FROM marketplace.usuarios WHERE id_autenticacao = auth.uid() AND papel = 'administrador' AND situacao = 'ativo');
$$;

CREATE OR REPLACE FUNCTION marketplace.incrementar_visualizacoes_anuncio(p_anuncio_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = marketplace, auth AS $$
BEGIN
  INSERT INTO marketplace.anuncio_visualizacoes (anuncio_id, visitante_id, endereco_ip, user_agent)
  VALUES (
    p_anuncio_id,
    marketplace.obter_id_usuario_atual(),
    current_setting('request.headers::x-forwarded-for', true),
    current_setting('request.headers::user-agent', true)
  );
  UPDATE marketplace.anuncios SET visualizacoes = visualizacoes + 1 WHERE id = p_anuncio_id;
END; $$;

GRANT EXECUTE ON FUNCTION marketplace.incrementar_visualizacoes_anuncio(uuid) TO anon, authenticated;

-- Recria triggers
DO $$
DECLARE tabela text;
BEGIN
  FOR tabela IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'marketplace'
      AND tablename IN ('usuarios','categorias','subcategorias','anuncios','anuncio_imagens','anuncio_videos','favoritos','conversas','mensagens','anuncio_visualizacoes','denuncias','banners','notificacoes','configuracoes')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_atualizado_em ON marketplace.%I;', tabela, tabela);
    EXECUTE format('CREATE TRIGGER trg_%I_atualizado_em BEFORE UPDATE ON marketplace.%I FOR EACH ROW EXECUTE FUNCTION marketplace.atualizar_coluna_atualizado_em();', tabela, tabela);
  END LOOP;
END $$;

CREATE OR REPLACE TRIGGER trg_usuarios_before_insert BEFORE INSERT ON marketplace.usuarios FOR EACH ROW EXECUTE FUNCTION marketplace.definir_slug_usuario();
CREATE OR REPLACE TRIGGER trg_anuncios_before_insert BEFORE INSERT ON marketplace.anuncios FOR EACH ROW EXECUTE FUNCTION marketplace.definir_slug_anuncio();
DROP TRIGGER IF EXISTS trg_auth_users_insert ON auth.users;
CREATE TRIGGER trg_auth_users_insert AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION marketplace.tratar_novo_usuario();

-- Atualiza views agregadas
CREATE OR REPLACE VIEW marketplace.anuncios_publicos AS
SELECT p.id, p.titulo, p.slug, p.descricao, p.preco, p.condicao, p.quantidade, p.cidade, p.condominio, p.endereco,
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
SELECT u.id, u.slug, u.nome, u.foto_url, u.biografia, u.cidade, u.estado, u.avaliacao, u.total_avaliacoes, u.criado_em,
       count(p.id) FILTER (WHERE p.situacao = 'ativo') AS total_anuncios_ativos,
       count(p.id) FILTER (WHERE p.situacao = 'vendido') AS total_anuncios_vendidos
FROM marketplace.usuarios u
LEFT JOIN marketplace.anuncios p ON p.usuario_id = u.id
WHERE u.situacao = 'ativo'
GROUP BY u.id;

CREATE OR REPLACE VIEW marketplace.conversas_com_ultima_mensagem AS
SELECT cr.id, cr.anuncio_id, cr.comprador_id, cr.vendedor_id, cr.criado_em, cr.ultima_mensagem_em,
       p.titulo AS anuncio_titulo, p.slug AS anuncio_slug,
       (SELECT pi.url FROM marketplace.anuncio_imagens pi WHERE pi.anuncio_id = p.id ORDER BY pi.ordem ASC LIMIT 1) AS anuncio_imagem_url,
       lm.conteudo AS ultima_mensagem_conteudo, lm.remetente_id AS ultima_mensagem_remetente_id, lm.criado_em AS ultima_mensagem_criado_em,
       (SELECT count(*) FROM marketplace.mensagens m WHERE m.conversa_id = cr.id AND m.lida_em IS NULL) AS nao_lidas
FROM marketplace.conversas cr
JOIN marketplace.anuncios p ON p.id = cr.anuncio_id
LEFT JOIN LATERAL (
  SELECT conteudo, remetente_id, criado_em FROM marketplace.mensagens WHERE conversa_id = cr.id ORDER BY criado_em DESC LIMIT 1
) lm ON true;

-- Recria views/functions ponte no schema public
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
CREATE OR REPLACE VIEW public.anuncios_publicos WITH (security_invoker = true) AS SELECT * FROM marketplace.anuncios_publicos;
CREATE OR REPLACE VIEW public.perfis_vendedores WITH (security_invoker = true) AS SELECT * FROM marketplace.perfis_vendedores;
CREATE OR REPLACE VIEW public.conversas_com_ultima_mensagem WITH (security_invoker = true) AS SELECT * FROM marketplace.conversas_com_ultima_mensagem;

CREATE OR REPLACE FUNCTION public.incrementar_visualizacoes_anuncio(p_anuncio_id uuid)
RETURNS void LANGUAGE sql AS $$ SELECT marketplace.incrementar_visualizacoes_anuncio(p_anuncio_id); $$;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
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
GRANT UPDATE ON public.notificacoes TO authenticated;
GRANT INSERT ON public.anuncio_visualizacoes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.incrementar_visualizacoes_anuncio(uuid) TO anon, authenticated;

-- Realtime
DO $$
BEGIN
  -- Remove tabelas antigas se existirem na publicação
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'marketplace' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE marketplace.chat_messages;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'marketplace' AND tablename = 'chat_rooms') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE marketplace.chat_rooms;
  END IF;
  
  -- Adiciona tabelas novas apenas se ainda não estiverem na publicação
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'marketplace' AND tablename = 'mensagens') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace.mensagens;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'marketplace' AND tablename = 'conversas') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace.conversas;
  END IF;
END $$;

-- Configura REPLICA IDENTITY
ALTER TABLE marketplace.mensagens REPLICA IDENTITY FULL;
ALTER TABLE marketplace.conversas REPLICA IDENTITY FULL;

-- Atualiza storage policies
DROP POLICY IF EXISTS banners_admin_write ON storage.objects;
CREATE POLICY banners_admin_write ON storage.objects FOR ALL
  USING (bucket_id = 'banners' AND EXISTS (SELECT 1 FROM marketplace.usuarios u WHERE u.id_autenticacao = auth.uid() AND u.papel = 'administrador'))
  WITH CHECK (bucket_id = 'banners' AND EXISTS (SELECT 1 FROM marketplace.usuarios u WHERE u.id_autenticacao = auth.uid() AND u.papel = 'administrador'));
