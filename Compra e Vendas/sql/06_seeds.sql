-- ============================================================================
-- Marketplace - Seeds
-- ============================================================================
-- Dados iniciais: categorias principais e configurações padrão.
-- Execute por último, após tabelas, funções e RLS estarem prontos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Categorias principais
-- ----------------------------------------------------------------------------
INSERT INTO marketplace.categorias (nome, slug, icone, ordem) VALUES
  ('Veículos',      'veiculos',      'car',            1),
  ('Imóveis',       'imoveis',       'home',           2),
  ('Celulares',     'celulares',     'smartphone',     3),
  ('Eletrônicos',   'eletronicos',   'tv',             4),
  ('Informática',   'informatica',   'laptop',         5),
  ('Casa',          'casa',          'sofa',           6),
  ('Móveis',        'moveis',        'armchair',       7),
  ('Construção',    'construcao',    'hammer',         8),
  ('Ferramentas',   'ferramentas',   'wrench',         9),
  ('Esportes',      'esportes',      'dumbbell',       10),
  ('Moda',          'moda',          'shirt',          11),
  ('Infantil',      'infantil',      'baby',           12),
  ('Pets',          'pets',          'paw-print',      13),
  ('Serviços',      'servicos',      'briefcase',      14),
  ('Empregos',      'empregos',      'user-check',     15),
  ('Outros',        'outros',        'package',        16)
ON CONFLICT (slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Subcategorias de exemplo (Veículos e Imóveis)
-- ----------------------------------------------------------------------------
INSERT INTO marketplace.subcategorias (categoria_id, nome, slug, ordem)
SELECT c.id, sub.nome, sub.slug, sub.ordem
FROM marketplace.categorias c
CROSS JOIN LATERAL (
  VALUES
    ('Carros', 'carros', 1),
    ('Motos', 'motos', 2),
    ('Caminhões', 'caminhoes', 3),
    ('Peças e Acessórios', 'pecas-acessorios', 4)
) AS sub(nome, slug, ordem)
WHERE c.slug = 'veiculos'
ON CONFLICT (categoria_id, slug) DO NOTHING;

INSERT INTO marketplace.subcategorias (categoria_id, nome, slug, ordem)
SELECT c.id, sub.nome, sub.slug, sub.ordem
FROM marketplace.categorias c
CROSS JOIN LATERAL (
  VALUES
    ('Apartamentos', 'apartamentos', 1),
    ('Casas', 'casas', 2),
    ('Terrenos', 'terrenos', 3),
    ('Comercial', 'comercial', 4)
) AS sub(nome, slug, ordem)
WHERE c.slug = 'imoveis'
ON CONFLICT (categoria_id, slug) DO NOTHING;

-- ----------------------------------------------------------------------------
-- Configurações padrão do sistema
-- ----------------------------------------------------------------------------
INSERT INTO marketplace.configuracoes (chave, valor, descricao) VALUES
  ('site_name', '"Marketplace"'::jsonb, 'Nome exibido do site'),
  ('max_images_per_product', '20'::jsonb, 'Quantidade máxima de imagens por anúncio'),
  ('max_videos_per_product', '1'::jsonb, 'Quantidade máxima de vídeos por anúncio'),
  ('ad_expiration_days', '90'::jsonb, 'Dias até um anúncio expirar automaticamente'),
  ('featured_ads_enabled', 'true'::jsonb, 'Habilita o recurso de anúncios em destaque')
ON CONFLICT (chave) DO NOTHING;
