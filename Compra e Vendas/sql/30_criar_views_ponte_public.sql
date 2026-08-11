-- ============================================================================
-- Criar views ponte no schema public apontando para marketplace
-- ============================================================================

-- Views para tabelas principais
CREATE OR REPLACE VIEW public.categorias AS SELECT * FROM marketplace.categorias;
CREATE OR REPLACE VIEW public.subcategorias AS SELECT * FROM marketplace.subcategorias;
CREATE OR REPLACE VIEW public.usuarios AS SELECT * FROM marketplace.usuarios;
CREATE OR REPLACE VIEW public.anuncios AS SELECT * FROM marketplace.anuncios;
CREATE OR REPLACE VIEW public.anuncio_imagens AS SELECT * FROM marketplace.anuncio_imagens;
CREATE OR REPLACE VIEW public.favoritos AS SELECT * FROM marketplace.favoritos;
CREATE OR REPLACE VIEW public.conversas AS SELECT * FROM marketplace.conversas;
CREATE OR REPLACE VIEW public.mensagens AS SELECT * FROM marketplace.mensagens;
CREATE OR REPLACE VIEW public.denuncias AS SELECT * FROM marketplace.denuncias;
CREATE OR REPLACE VIEW public.anuncios_publicos AS SELECT * FROM marketplace.anuncios_publicos;

-- Permissões
GRANT SELECT ON public.categorias TO anon, authenticated;
GRANT SELECT ON public.subcategorias TO anon, authenticated;
GRANT SELECT ON public.usuarios TO anon, authenticated;
GRANT ALL ON public.anuncios TO authenticated;
GRANT SELECT ON public.anuncios TO anon;
GRANT ALL ON public.anuncio_imagens TO authenticated;
GRANT ALL ON public.favoritos TO authenticated;
GRANT ALL ON public.conversas TO authenticated;
GRANT ALL ON public.mensagens TO authenticated;
GRANT ALL ON public.denuncias TO authenticated;
GRANT SELECT ON public.anuncios_publicos TO anon, authenticated;

-- Verificação
SELECT 'Views ponte criadas no schema public!' as status,
  (SELECT count(*) FROM pg_views WHERE schemaname = 'public' AND viewname IN (
    'categorias', 'subcategorias', 'usuarios', 'anuncios', 'anuncio_imagens',
    'favoritos', 'conversas', 'mensagens', 'denuncias', 'anuncios_publicos'
  )) as total_views;
