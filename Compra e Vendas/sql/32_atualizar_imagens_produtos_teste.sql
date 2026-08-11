-- ============================================================================
-- Atualizar imagens dos produtos de teste
-- A capa_url vem da view anuncios_publicos, que busca a primeira imagem
-- da tabela marketplace.anuncio_imagens
-- ============================================================================

-- Limpar imagens de teste anteriores
DELETE FROM marketplace.anuncio_imagens
WHERE url LIKE 'https://images.unsplash.com/%';

-- Inserir imagens de teste para cada produto
WITH produtos AS (
  SELECT id, titulo FROM marketplace.anuncios
  WHERE titulo IN (
    'Smart TV 50" 4K Samsung',
    'Notebook Dell Inspiron 15',
    'PlayStation 5 + 2 Controles',
    'iPhone 13 128GB Azul',
    'Samsung Galaxy S23 Ultra',
    'Xiaomi Redmi Note 12',
    'Sofá 3 Lugares Retrátil',
    'Mesa de Jantar 6 Cadeiras',
    'Guarda-Roupa 4 Portas',
    'Honda Civic 2019 Automático',
    'Yamaha Fazer 250 2021',
    'Tênis Nike Air Max 90',
    'Jaqueta de Couro Masculina',
    'Fone Bluetooth JBL Tune 510BT',
    'Kindle Paperwhite 11ª Geração'
  )
)
INSERT INTO marketplace.anuncio_imagens (anuncio_id, url, ordem)
SELECT 
  p.id,
  CASE
    WHEN p.titulo ILIKE '%Smart TV%' OR p.titulo ILIKE '%Notebook%' OR p.titulo ILIKE '%PlayStation%' THEN 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&q=80'
    WHEN p.titulo ILIKE '%iPhone%' OR p.titulo ILIKE '%Galaxy%' OR p.titulo ILIKE '%Xiaomi%' OR p.titulo ILIKE '%Redmi%' THEN 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800&q=80'
    WHEN p.titulo ILIKE '%Sofá%' OR p.titulo ILIKE '%Mesa%' OR p.titulo ILIKE '%Guarda-Roupa%' THEN 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80'
    WHEN p.titulo ILIKE '%Civic%' OR p.titulo ILIKE '%Yamaha%' OR p.titulo ILIKE '%Fazer%' THEN 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80'
    WHEN p.titulo ILIKE '%Tênis%' OR p.titulo ILIKE '%Jaqueta%' THEN 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'
    WHEN p.titulo ILIKE '%Fone%' OR p.titulo ILIKE '%Kindle%' THEN 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'
    ELSE 'https://images.unsplash.com/photo-1560472355-536de3962603?w=800&q=80'
  END,
  0
FROM produtos p;

-- Verificar capa_url dos produtos via view
SELECT 
  titulo,
  capa_url
FROM marketplace.anuncios_publicos
WHERE capa_url IS NOT NULL
LIMIT 10;
