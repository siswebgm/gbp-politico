-- ============================================================================
-- Marketplace - Supabase Storage (buckets e políticas)
-- ============================================================================
-- Cria os buckets usados pelo marketplace e as policies de acesso.
-- Storage já vive no schema "storage", que É exposto pelo PostgREST nesta
-- instância, então não precisa de bridge.
--
-- Convenção de path por bucket:
--   product-images: {usuario_id}/{anuncio_id}/{filename}
--   product-videos: {usuario_id}/{anuncio_id}/{filename}
--   avatars:        {usuario_id}/{filename}
--   banners:        {filename}  (somente admin)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Buckets
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, nome, public, file_size_limit, allowed_mime_types)
VALUES
  ('product-images', 'product-images', true, 8388608, ARRAY['image/jpeg','image/png','image/webp','image/gif']),
  ('product-videos', 'product-videos', true, 104857600, ARRAY['video/mp4','video/webm','video/quicktime']),
  ('avatars', 'avatars', true, 4194304, ARRAY['image/jpeg','image/png','image/webp']),
  ('banners', 'banners', true, 8388608, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Policies: product-images
-- ----------------------------------------------------------------------------
CREATE POLICY "product_images_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(nome))[1] = auth.uid()::text
  );

CREATE POLICY "product_images_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(nome))[1] = auth.uid()::text
  );

CREATE POLICY "product_images_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(nome))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- Policies: product-videos
-- ----------------------------------------------------------------------------
CREATE POLICY "product_videos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-videos');

CREATE POLICY "product_videos_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-videos'
    AND (storage.foldername(nome))[1] = auth.uid()::text
  );

CREATE POLICY "product_videos_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-videos'
    AND (storage.foldername(nome))[1] = auth.uid()::text
  );

CREATE POLICY "product_videos_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-videos'
    AND (storage.foldername(nome))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- Policies: avatars
-- ----------------------------------------------------------------------------
CREATE POLICY "avatars_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "avatars_owner_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(nome))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(nome))[1] = auth.uid()::text
  );

CREATE POLICY "avatars_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(nome))[1] = auth.uid()::text
  );

-- ----------------------------------------------------------------------------
-- Policies: banners (somente leitura pública; escrita restrita a admins)
-- ----------------------------------------------------------------------------
CREATE POLICY "banners_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'banners');

CREATE POLICY "banners_admin_write"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'banners'
    AND EXISTS (
      SELECT 1 FROM marketplace.usuarios u
      WHERE u.id_autenticacao = auth.uid() AND u.papel = 'administrador'
    )
  )
  WITH CHECK (
    bucket_id = 'banners'
    AND EXISTS (
      SELECT 1 FROM marketplace.usuarios u
      WHERE u.id_autenticacao = auth.uid() AND u.papel = 'administrador'
    )
  );
