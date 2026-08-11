-- ============================================================================
-- Inserir banners de publicidade de teste
-- ============================================================================

INSERT INTO marketplace.banners (
  titulo,
  descricao,
  imagem_desktop_url,
  imagem_mobile_url,
  link,
  posicao,
  data_inicio,
  data_fim,
  ativo
)
VALUES
(
  'Anuncie seu produto',
  'Destaque seus produtos e venda muito mais',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&q=80',
  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
  '/anuncios/novo',
  'home_meio',
  current_date,
  current_date + interval '1 year',
  true
),
(
  'Promoção Especial',
  'Aproveite as melhores ofertas do marketplace',
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&q=80',
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
  '/produtos?destaque=true',
  'home_meio',
  current_date,
  current_date + interval '1 year',
  true
),
(
  'Banner principal',
  'Bem-vindo ao marketplace',
  'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=1200&q=80',
  'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=800&q=80',
  '/produtos',
  'home_topo',
  current_date,
  current_date + interval '1 year',
  true
);

-- Verificar banners inseridos
SELECT 
  titulo,
  posicao,
  ativo,
  imagem_desktop_url
FROM marketplace.banners
ORDER BY posicao, criado_em DESC;
