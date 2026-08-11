-- ============================================================================
-- Marketplace - Row Level Security (RLS)
-- ============================================================================
-- Habilita RLS em todas as tabelas e define as políticas de acesso.
-- Usa marketplace.obter_id_usuario_atual() e marketplace.eh_administrador() (ver 03_functions.sql)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- USERS
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_public" ON marketplace.usuarios
  FOR SELECT
  USING (situacao = 'ativo' OR id_autenticacao = auth.uid() OR marketplace.eh_administrador());

CREATE POLICY "users_insert_self" ON marketplace.usuarios
  FOR INSERT
  WITH CHECK (id_autenticacao = auth.uid());

CREATE POLICY "users_update_self_or_admin" ON marketplace.usuarios
  FOR UPDATE
  USING (id_autenticacao = auth.uid() OR marketplace.eh_administrador())
  WITH CHECK (id_autenticacao = auth.uid() OR marketplace.eh_administrador());

CREATE POLICY "users_delete_admin" ON marketplace.usuarios
  FOR DELETE
  USING (marketplace.eh_administrador());

-- ----------------------------------------------------------------------------
-- CATEGORIES / SUBCATEGORIES (leitura pública, escrita apenas admin)
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.subcategorias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all" ON marketplace.categorias
  FOR SELECT USING (true);

CREATE POLICY "categories_write_admin" ON marketplace.categorias
  FOR ALL USING (marketplace.eh_administrador()) WITH CHECK (marketplace.eh_administrador());

CREATE POLICY "subcategories_select_all" ON marketplace.subcategorias
  FOR SELECT USING (true);

CREATE POLICY "subcategories_write_admin" ON marketplace.subcategorias
  FOR ALL USING (marketplace.eh_administrador()) WITH CHECK (marketplace.eh_administrador());

-- ----------------------------------------------------------------------------
-- PRODUCTS
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.anuncios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_select_active_or_owner" ON marketplace.anuncios
  FOR SELECT
  USING (
    situacao = 'ativo'
    OR usuario_id = marketplace.obter_id_usuario_atual()
    OR marketplace.eh_administrador()
  );

CREATE POLICY "products_insert_own" ON marketplace.anuncios
  FOR INSERT
  WITH CHECK (usuario_id = marketplace.obter_id_usuario_atual());

CREATE POLICY "products_update_own_or_admin" ON marketplace.anuncios
  FOR UPDATE
  USING (usuario_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador())
  WITH CHECK (usuario_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());

CREATE POLICY "products_delete_own_or_admin" ON marketplace.anuncios
  FOR DELETE
  USING (usuario_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());

-- ----------------------------------------------------------------------------
-- PRODUCT IMAGES / VIDEOS (seguem a posse do produto)
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.anuncio_imagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.anuncio_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_images_select_all" ON marketplace.anuncio_imagens
  FOR SELECT USING (true);

CREATE POLICY "product_images_write_owner" ON marketplace.anuncio_imagens
  FOR ALL
  USING (
    marketplace.eh_administrador()
    OR EXISTS (
      SELECT 1 FROM marketplace.anuncios p
      WHERE p.id = anuncio_id AND p.usuario_id = marketplace.obter_id_usuario_atual()
    )
  )
  WITH CHECK (
    marketplace.eh_administrador()
    OR EXISTS (
      SELECT 1 FROM marketplace.anuncios p
      WHERE p.id = anuncio_id AND p.usuario_id = marketplace.obter_id_usuario_atual()
    )
  );

CREATE POLICY "product_videos_select_all" ON marketplace.anuncio_videos
  FOR SELECT USING (true);

CREATE POLICY "product_videos_write_owner" ON marketplace.anuncio_videos
  FOR ALL
  USING (
    marketplace.eh_administrador()
    OR EXISTS (
      SELECT 1 FROM marketplace.anuncios p
      WHERE p.id = anuncio_id AND p.usuario_id = marketplace.obter_id_usuario_atual()
    )
  )
  WITH CHECK (
    marketplace.eh_administrador()
    OR EXISTS (
      SELECT 1 FROM marketplace.anuncios p
      WHERE p.id = anuncio_id AND p.usuario_id = marketplace.obter_id_usuario_atual()
    )
  );

-- ----------------------------------------------------------------------------
-- FAVORITES
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_select_own" ON marketplace.favoritos
  FOR SELECT
  USING (usuario_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());

CREATE POLICY "favorites_insert_own" ON marketplace.favoritos
  FOR INSERT
  WITH CHECK (usuario_id = marketplace.obter_id_usuario_atual());

CREATE POLICY "favorites_delete_own" ON marketplace.favoritos
  FOR DELETE
  USING (usuario_id = marketplace.obter_id_usuario_atual());

-- ----------------------------------------------------------------------------
-- CHAT ROOMS
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_rooms_select_participant" ON marketplace.conversas
  FOR SELECT
  USING (
    comprador_id = marketplace.obter_id_usuario_atual()
    OR vendedor_id = marketplace.obter_id_usuario_atual()
    OR marketplace.eh_administrador()
  );

CREATE POLICY "chat_rooms_insert_buyer" ON marketplace.conversas
  FOR INSERT
  WITH CHECK (comprador_id = marketplace.obter_id_usuario_atual());

CREATE POLICY "chat_rooms_update_participant" ON marketplace.conversas
  FOR UPDATE
  USING (
    comprador_id = marketplace.obter_id_usuario_atual()
    OR vendedor_id = marketplace.obter_id_usuario_atual()
    OR marketplace.eh_administrador()
  );

-- ----------------------------------------------------------------------------
-- CHAT MESSAGES
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.mensagens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chat_messages_select_participant" ON marketplace.mensagens
  FOR SELECT
  USING (
    marketplace.eh_administrador()
    OR EXISTS (
      SELECT 1 FROM marketplace.conversas cr
      WHERE cr.id = conversa_id
        AND (cr.comprador_id = marketplace.obter_id_usuario_atual() OR cr.vendedor_id = marketplace.obter_id_usuario_atual())
    )
  );

CREATE POLICY "chat_messages_insert_participant" ON marketplace.mensagens
  FOR INSERT
  WITH CHECK (
    remetente_id = marketplace.obter_id_usuario_atual()
    AND EXISTS (
      SELECT 1 FROM marketplace.conversas cr
      WHERE cr.id = conversa_id
        AND (cr.comprador_id = marketplace.obter_id_usuario_atual() OR cr.vendedor_id = marketplace.obter_id_usuario_atual())
    )
  );

CREATE POLICY "chat_messages_update_participant" ON marketplace.mensagens
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM marketplace.conversas cr
      WHERE cr.id = conversa_id
        AND (cr.comprador_id = marketplace.obter_id_usuario_atual() OR cr.vendedor_id = marketplace.obter_id_usuario_atual())
    )
  );

-- ----------------------------------------------------------------------------
-- PRODUCT VIEWS (insert público, leitura restrita)
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.anuncio_visualizacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_views_insert_all" ON marketplace.anuncio_visualizacoes
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "product_views_select_owner_or_admin" ON marketplace.anuncio_visualizacoes
  FOR SELECT
  USING (
    marketplace.eh_administrador()
    OR EXISTS (
      SELECT 1 FROM marketplace.anuncios p
      WHERE p.id = anuncio_id AND p.usuario_id = marketplace.obter_id_usuario_atual()
    )
  );

-- ----------------------------------------------------------------------------
-- PRODUCT REPORTS
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.denuncias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_reports_insert_own" ON marketplace.denuncias
  FOR INSERT
  WITH CHECK (denunciante_id = marketplace.obter_id_usuario_atual());

CREATE POLICY "product_reports_select_own_or_admin" ON marketplace.denuncias
  FOR SELECT
  USING (denunciante_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());

CREATE POLICY "product_reports_update_admin" ON marketplace.denuncias
  FOR UPDATE
  USING (marketplace.eh_administrador())
  WITH CHECK (marketplace.eh_administrador());

-- ----------------------------------------------------------------------------
-- BANNER ADS (leitura pública de ativos, escrita apenas admin)
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banner_ads_select_active_or_admin" ON marketplace.banners
  FOR SELECT
  USING (
    (ativo = true AND current_date BETWEEN data_inicio AND coalesce(data_fim, current_date))
    OR marketplace.eh_administrador()
  );

CREATE POLICY "banner_ads_write_admin" ON marketplace.banners
  FOR ALL USING (marketplace.eh_administrador()) WITH CHECK (marketplace.eh_administrador());

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.notificacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notifications_select_own" ON marketplace.notificacoes
  FOR SELECT
  USING (usuario_id = marketplace.obter_id_usuario_atual() OR marketplace.eh_administrador());

CREATE POLICY "notifications_update_own" ON marketplace.notificacoes
  FOR UPDATE
  USING (usuario_id = marketplace.obter_id_usuario_atual())
  WITH CHECK (usuario_id = marketplace.obter_id_usuario_atual());

CREATE POLICY "notifications_insert_system" ON marketplace.notificacoes
  FOR INSERT
  WITH CHECK (marketplace.eh_administrador());

-- ----------------------------------------------------------------------------
-- SETTINGS (leitura pública, escrita apenas admin)
-- ----------------------------------------------------------------------------
ALTER TABLE marketplace.configuracoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_select_all" ON marketplace.configuracoes
  FOR SELECT USING (true);

CREATE POLICY "settings_write_admin" ON marketplace.configuracoes
  FOR ALL USING (marketplace.eh_administrador()) WITH CHECK (marketplace.eh_administrador());

-- ----------------------------------------------------------------------------
-- GRANTS de schema (necessário pois marketplace não é public)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA marketplace TO anon, authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA marketplace TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA marketplace TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA marketplace
  GRANT SELECT ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA marketplace
  GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;
