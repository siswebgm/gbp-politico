-- ============================================================================
-- Marketplace - Índices
-- ============================================================================
-- Melhora a performance das consultas mais comuns do marketplace.
-- ============================================================================

-- Usuários
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON marketplace.usuarios(id_autenticacao);
CREATE INDEX IF NOT EXISTS idx_users_slug ON marketplace.usuarios(slug);
CREATE INDEX IF NOT EXISTS idx_users_email ON marketplace.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_users_city ON marketplace.usuarios(cidade);
CREATE INDEX IF NOT EXISTS idx_users_status ON marketplace.usuarios(situacao);
CREATE INDEX IF NOT EXISTS idx_users_role ON marketplace.usuarios(papel);

-- Categorias
CREATE INDEX IF NOT EXISTS idx_categories_slug ON marketplace.categorias(slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON marketplace.categorias(categoria_pai_id);
CREATE INDEX IF NOT EXISTS idx_categories_order ON marketplace.categorias(ordem);

-- Subcategorias
CREATE INDEX IF NOT EXISTS idx_subcategories_category ON marketplace.subcategorias(categoria_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_slug ON marketplace.subcategorias(slug);

-- Produtos
CREATE INDEX IF NOT EXISTS idx_products_user_id ON marketplace.anuncios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON marketplace.anuncios(categoria_id);
CREATE INDEX IF NOT EXISTS idx_products_subcategory ON marketplace.anuncios(subcategoria_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON marketplace.anuncios(situacao);
CREATE INDEX IF NOT EXISTS idx_products_featured ON marketplace.anuncios(destaque);
CREATE INDEX IF NOT EXISTS idx_products_city ON marketplace.anuncios(cidade);
CREATE INDEX IF NOT EXISTS idx_products_condominium ON marketplace.anuncios(condominio);
CREATE INDEX IF NOT EXISTS idx_products_price ON marketplace.anuncios(preco);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON marketplace.anuncios(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_products_views ON marketplace.anuncios(visualizacoes DESC);
CREATE INDEX IF NOT EXISTS idx_products_search ON marketplace.anuncios USING GIN(vetor_busca);

-- Imagens e vídeos
CREATE INDEX IF NOT EXISTS idx_product_images_product ON marketplace.anuncio_imagens(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_product_videos_product ON marketplace.anuncio_videos(anuncio_id);

-- Favoritos
CREATE INDEX IF NOT EXISTS idx_favorites_user ON marketplace.favoritos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product ON marketplace.favoritos(anuncio_id);

-- Chat
CREATE INDEX IF NOT EXISTS idx_chat_rooms_product ON marketplace.conversas(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_buyer ON marketplace.conversas(comprador_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_seller ON marketplace.conversas(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_last_msg ON marketplace.conversas(ultima_mensagem_em DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON marketplace.mensagens(conversa_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON marketplace.mensagens(criado_em DESC);

-- Visualizações
CREATE INDEX IF NOT EXISTS idx_product_views_product ON marketplace.anuncio_visualizacoes(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_product_views_viewed_at ON marketplace.anuncio_visualizacoes(visualizado_em DESC);

-- Denúncias
CREATE INDEX IF NOT EXISTS idx_product_reports_product ON marketplace.denuncias(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_product_reports_status ON marketplace.denuncias(situacao);

-- Banners
CREATE INDEX IF NOT EXISTS idx_banner_ads_active_dates ON marketplace.banners(ativo, data_inicio, data_fim);

-- Notificações
CREATE INDEX IF NOT EXISTS idx_notifications_user ON marketplace.notificacoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON marketplace.notificacoes(lida);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON marketplace.notificacoes(criado_em DESC);
