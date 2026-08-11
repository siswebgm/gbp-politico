-- ============================================================================
-- Verificar tabelas existentes e popular dados iniciais
-- ============================================================================

-- 1. Verificar quais tabelas existem no schema marketplace
SELECT 
  tablename AS "Tabela Existente",
  schemaname AS "Schema"
FROM pg_tables 
WHERE schemaname = 'marketplace'
ORDER BY tablename;

-- 2. Se a tabela categorias não existir, criar
CREATE TABLE IF NOT EXISTS marketplace.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icone TEXT,
  cor TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  categoria_pai_id UUID REFERENCES marketplace.categorias(id) ON DELETE SET NULL,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Popular categorias iniciais (apenas se estiver vazia)
INSERT INTO marketplace.categorias (nome, slug, icone, ordem, ativo)
VALUES 
  ('Eletrônicos', 'eletronicos', '📱', 1, true),
  ('Móveis', 'moveis', '🛋️', 2, true),
  ('Roupas e Acessórios', 'roupas-acessorios', '👕', 3, true),
  ('Esportes e Lazer', 'esportes-lazer', '⚽', 4, true),
  ('Livros e Educação', 'livros-educacao', '📚', 5, true),
  ('Beleza e Saúde', 'beleza-saude', '💄', 6, true),
  ('Casa e Jardim', 'casa-jardim', '🏡', 7, true),
  ('Veículos', 'veiculos', '🚗', 8, true),
  ('Outros', 'outros', '📦', 9, true)
ON CONFLICT (slug) DO NOTHING;

-- 4. Criar tabela configuracoes se não existir
CREATE TABLE IF NOT EXISTS marketplace.configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor JSONB NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Popular configurações iniciais
INSERT INTO marketplace.configuracoes (chave, valor, descricao)
VALUES 
  ('site_name', '"Marketplace"', 'Nome do site'),
  ('max_product_images', '20', 'Número máximo de imagens por produto'),
  ('max_product_videos', '1', 'Número máximo de vídeos por produto')
ON CONFLICT (chave) DO NOTHING;

-- 6. Recriar views ponte no public para categorias
DROP VIEW IF EXISTS public.categorias CASCADE;
CREATE OR REPLACE VIEW public.categorias WITH (security_invoker = true) AS 
  SELECT * FROM marketplace.categorias;

DROP VIEW IF EXISTS public.configuracoes CASCADE;
CREATE OR REPLACE VIEW public.configuracoes WITH (security_invoker = true) AS 
  SELECT * FROM marketplace.configuracoes;

-- 7. Permissões
GRANT SELECT ON public.categorias TO anon, authenticated;
GRANT SELECT ON public.configuracoes TO anon, authenticated;

-- 8. Verificação final
SELECT 
  'Dados iniciais populados!' as status,
  (SELECT count(*) FROM marketplace.categorias) as total_categorias,
  (SELECT count(*) FROM marketplace.configuracoes) as total_configuracoes;
