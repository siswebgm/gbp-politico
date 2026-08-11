-- ============================================================================
-- Marketplace - Ponte de exposição via schema "public"
-- ============================================================================
-- Este projeto Supabase self-hosted expõe apenas os schemas:
--   public, storage, graphql_public, cobrancas
-- O schema "marketplace" NÃO está na lista de schemas expostos do PostgREST
-- (PGRST_DB_SCHEMAS) e não há acesso para alterar essa configuração no servidor.
--
-- Para manter a arquitetura pedida (tabelas reais fora do "public"), criamos
-- aqui apenas VIEWS e FUNCTIONS "ponte" no schema public, que apontam para as
-- tabelas reais em marketplace. As tabelas continuam 100% em marketplace.
--
-- IMPORTANTE: "security_invoker = true" garante que o RLS definido nas tabelas
-- de marketplace seja aplicado com o papel (anon/authenticated) da requisição,
-- e não com o dono da view. Sem isso, o RLS seria ignorado (risco de segurança).
-- Requer PostgreSQL 15+.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Views 1:1 (tabelas espelhadas, herdam RLS de marketplace)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.usuarios
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.usuarios;

CREATE OR REPLACE VIEW public.categorias
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.categorias;

CREATE OR REPLACE VIEW public.subcategorias
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.subcategorias;

CREATE OR REPLACE VIEW public.anuncios
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.anuncios;

CREATE OR REPLACE VIEW public.anuncio_imagens
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.anuncio_imagens;

CREATE OR REPLACE VIEW public.anuncio_videos
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.anuncio_videos;

CREATE OR REPLACE VIEW public.favoritos
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.favoritos;

CREATE OR REPLACE VIEW public.conversas
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.conversas;

CREATE OR REPLACE VIEW public.mensagens
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.mensagens;

CREATE OR REPLACE VIEW public.anuncio_visualizacoes
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.anuncio_visualizacoes;

CREATE OR REPLACE VIEW public.denuncias
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.denuncias;

CREATE OR REPLACE VIEW public.banners
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.banners;

CREATE OR REPLACE VIEW public.notificacoes
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.notificacoes;

CREATE OR REPLACE VIEW public.configuracoes
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.configuracoes;

-- ----------------------------------------------------------------------------
-- Views agregadas (somente leitura)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.anuncios_publicos
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.anuncios_publicos;

CREATE OR REPLACE VIEW public.perfis_vendedores
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.perfis_vendedores;

CREATE OR REPLACE VIEW public.conversas_com_ultima_mensagem
  WITH (security_invoker = true) AS
SELECT * FROM marketplace.conversas_com_ultima_mensagem;

-- ----------------------------------------------------------------------------
-- Funções ponte (RPC via PostgREST)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.incrementar_visualizacoes_anuncio(p_anuncio_id uuid)
RETURNS void
LANGUAGE sql
AS $$
  SELECT marketplace.incrementar_visualizacoes_anuncio(p_anuncio_id);
$$;

COMMENT ON FUNCTION public.incrementar_visualizacoes_anuncio(uuid) IS 'Ponte pública para marketplace.incrementar_visualizacoes_anuncio';

-- ----------------------------------------------------------------------------
-- Grants (schema public já é exposto e usado por anon/authenticated)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Leitura pública (RLS de marketplace decide o que realmente aparece)
GRANT SELECT ON
  public.usuarios,
  public.categorias,
  public.subcategorias,
  public.anuncios,
  public.anuncio_imagens,
  public.anuncio_videos,
  public.banners,
  public.configuracoes,
  public.anuncios_publicos,
  public.perfis_vendedores
TO anon, authenticated;

-- Leitura restrita a autenticados (RLS decide as linhas)
GRANT SELECT ON
  public.favoritos,
  public.conversas,
  public.mensagens,
  public.conversas_com_ultima_mensagem,
  public.anuncio_visualizacoes,
  public.denuncias,
  public.notificacoes
TO authenticated;

-- Escrita (RLS de marketplace decide o que é permitido)
GRANT INSERT, UPDATE, DELETE ON
  public.usuarios,
  public.anuncios,
  public.anuncio_imagens,
  public.anuncio_videos,
  public.favoritos,
  public.conversas,
  public.mensagens,
  public.denuncias
TO authenticated;

GRANT UPDATE ON public.notificacoes TO authenticated;

-- anuncio_visualizacoes: insert liberado para anon e authenticated (RLS permite ambos)
GRANT INSERT ON public.anuncio_visualizacoes TO anon, authenticated;

-- Execução das funções ponte
GRANT EXECUTE ON FUNCTION public.incrementar_visualizacoes_anuncio(uuid) TO anon, authenticated;
