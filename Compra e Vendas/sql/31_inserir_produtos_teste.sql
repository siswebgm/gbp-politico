-- ============================================================================
-- Inserir produtos de teste para visualização do marketplace
-- ============================================================================

-- Primeiro, vamos pegar IDs de categorias existentes
DO $$
DECLARE
  v_usuario_id UUID;
  v_cat_eletronicos UUID;
  v_cat_moveis UUID;
  v_cat_veiculos UUID;
  v_cat_imoveis UUID;
  v_cat_celulares UUID;
  v_cat_roupas UUID;
BEGIN
  -- Pegar ID do primeiro usuário (ou criar um usuário de teste)
  SELECT id INTO v_usuario_id FROM marketplace.usuarios LIMIT 1;
  
  IF v_usuario_id IS NULL THEN
    -- Criar usuário de teste se não existir
    INSERT INTO marketplace.autenticacao (email, senha_hash)
    VALUES ('vendedor@teste.com', md5('teste123' || 'vendedor@teste.com'))
    RETURNING uid INTO v_usuario_id;
    
    INSERT INTO marketplace.usuarios (autenticacao_uid, email, nome, cidade, estado, papel, situacao)
    VALUES (v_usuario_id, 'vendedor@teste.com', 'Vendedor Teste', 'São Paulo', 'SP', 'usuario', 'ativo')
    RETURNING id INTO v_usuario_id;
  END IF;

  -- Pegar IDs das categorias
  SELECT id INTO v_cat_eletronicos FROM marketplace.categorias WHERE slug = 'eletronicos' LIMIT 1;
  SELECT id INTO v_cat_moveis FROM marketplace.categorias WHERE slug = 'moveis' LIMIT 1;
  SELECT id INTO v_cat_veiculos FROM marketplace.categorias WHERE slug = 'veiculos' LIMIT 1;
  SELECT id INTO v_cat_imoveis FROM marketplace.categorias WHERE slug = 'imoveis' LIMIT 1;
  SELECT id INTO v_cat_celulares FROM marketplace.categorias WHERE slug = 'celulares' LIMIT 1;
  SELECT id INTO v_cat_roupas FROM marketplace.categorias WHERE slug IN ('roupas-acessorios', 'moda') LIMIT 1;

  -- Inserir produtos de teste
  
  -- Eletrônicos
  IF v_cat_eletronicos IS NOT NULL THEN
    INSERT INTO marketplace.anuncios (
      usuario_id, categoria_id, titulo, descricao, preco, quantidade, condicao,
      cidade, situacao, destaque, negociavel, aceita_troca, visualizacoes
    ) VALUES
    (v_usuario_id, v_cat_eletronicos, 'Smart TV 50" 4K Samsung', 
     'Smart TV Samsung 50 polegadas, 4K UHD, HDR, com controle remoto. Pouco uso, em perfeito estado.', 
     1899.00, 1, 'usado', 'São Paulo', 'ativo', true, true, false, 245),
    
    (v_usuario_id, v_cat_eletronicos, 'Notebook Dell Inspiron 15', 
     'Notebook Dell i5, 8GB RAM, SSD 256GB, tela 15.6". Ótimo para trabalho e estudos.', 
     2499.00, 1, 'usado', 'Rio de Janeiro', 'ativo', true, true, true, 189),
    
    (v_usuario_id, v_cat_eletronicos, 'PlayStation 5 + 2 Controles', 
     'PS5 versão com leitor de disco, acompanha 2 controles DualSense e 3 jogos.', 
     3499.00, 1, 'usado', 'Belo Horizonte', 'ativo', true, false, false, 567);
  END IF;

  -- Celulares
  IF v_cat_celulares IS NOT NULL THEN
    INSERT INTO marketplace.anuncios (
      usuario_id, categoria_id, titulo, descricao, preco, quantidade, condicao,
      cidade, situacao, destaque, negociavel, aceita_troca, visualizacoes
    ) VALUES
    (v_usuario_id, v_cat_celulares, 'iPhone 13 128GB Azul', 
     'iPhone 13 128GB na cor azul, sem arranhões, bateria 95%. Acompanha caixa e carregador original.', 
     3299.00, 1, 'usado', 'São Paulo', 'ativo', true, true, false, 423),
    
    (v_usuario_id, v_cat_celulares, 'Samsung Galaxy S23 Ultra', 
     'Galaxy S23 Ultra 256GB, câmera de 200MP, S Pen inclusa. Estado de novo!', 
     4599.00, 1, 'novo', 'Curitiba', 'ativo', true, false, false, 312),
    
    (v_usuario_id, v_cat_celulares, 'Xiaomi Redmi Note 12', 
     'Redmi Note 12 128GB, 6GB RAM, câmera 50MP. Excelente custo-benefício.', 
     899.00, 1, 'novo', 'Porto Alegre', 'ativo', false, true, true, 156);
  END IF;

  -- Móveis
  IF v_cat_moveis IS NOT NULL THEN
    INSERT INTO marketplace.anuncios (
      usuario_id, categoria_id, titulo, descricao, preco, quantidade, condicao,
      cidade, situacao, destaque, negociavel, aceita_troca, visualizacoes
    ) VALUES
    (v_usuario_id, v_cat_moveis, 'Sofá 3 Lugares Retrátil', 
     'Sofá retrátil e reclinável, 3 lugares, cor cinza. Muito confortável e em ótimo estado.', 
     1299.00, 1, 'usado', 'São Paulo', 'ativo', false, true, false, 89),
    
    (v_usuario_id, v_cat_moveis, 'Mesa de Jantar 6 Cadeiras', 
     'Conjunto mesa de jantar em madeira maciça com 6 cadeiras estofadas. Elegante e resistente.', 
     2199.00, 1, 'usado', 'Brasília', 'ativo', true, true, false, 134),
    
    (v_usuario_id, v_cat_moveis, 'Guarda-Roupa 4 Portas', 
     'Guarda-roupa planejado 4 portas com espelho, cor branca. Desmontado para transporte.', 
     899.00, 1, 'usado', 'Campinas', 'ativo', false, true, true, 67);
  END IF;

  -- Veículos
  IF v_cat_veiculos IS NOT NULL THEN
    INSERT INTO marketplace.anuncios (
      usuario_id, categoria_id, titulo, descricao, preco, quantidade, condicao,
      cidade, situacao, destaque, negociavel, aceita_troca, visualizacoes
    ) VALUES
    (v_usuario_id, v_cat_veiculos, 'Honda Civic 2019 Automático', 
     'Civic EXL 2.0, automático, completo. Único dono, revisões em dia, IPVA 2024 pago.', 
     89900.00, 1, 'usado', 'São Paulo', 'ativo', true, true, true, 892),
    
    (v_usuario_id, v_cat_veiculos, 'Yamaha Fazer 250 2021', 
     'Moto Yamaha Fazer 250cc, preta, 15.000km rodados. Muito econômica e conservada.', 
     12900.00, 1, 'usado', 'Fortaleza', 'ativo', true, true, false, 234);
  END IF;

  -- Roupas
  IF v_cat_roupas IS NOT NULL THEN
    INSERT INTO marketplace.anuncios (
      usuario_id, categoria_id, titulo, descricao, preco, quantidade, condicao,
      cidade, situacao, destaque, negociavel, aceita_troca, visualizacoes
    ) VALUES
    (v_usuario_id, v_cat_roupas, 'Tênis Nike Air Max 90', 
     'Tênis Nike Air Max 90 tamanho 42, branco com detalhes pretos. Pouco uso, sem defeitos.', 
     399.00, 1, 'usado', 'São Paulo', 'ativo', false, true, false, 78),
    
    (v_usuario_id, v_cat_roupas, 'Jaqueta de Couro Masculina', 
     'Jaqueta de couro legítimo, tamanho M, cor preta. Perfeita para o inverno.', 
     549.00, 1, 'usado', 'Curitiba', 'ativo', false, true, true, 45);
  END IF;

  -- Produtos recentes (últimos 7 dias)
  IF v_cat_eletronicos IS NOT NULL THEN
    INSERT INTO marketplace.anuncios (
      usuario_id, categoria_id, titulo, descricao, preco, quantidade, condicao,
      cidade, situacao, destaque, negociavel, aceita_troca, visualizacoes, criado_em
    ) VALUES
    (v_usuario_id, v_cat_eletronicos, 'Fone Bluetooth JBL Tune 510BT', 
     'Fone de ouvido JBL Bluetooth, bateria de 40h, som de qualidade. Na caixa lacrada.', 
     199.00, 1, 'novo', 'São Paulo', 'ativo', false, false, false, 23, NOW() - INTERVAL '2 days'),
    
    (v_usuario_id, v_cat_eletronicos, 'Kindle Paperwhite 11ª Geração', 
     'Kindle Paperwhite com luz ajustável, 16GB, à prova d''água. Ideal para leitura.', 
     599.00, 1, 'novo', 'Salvador', 'ativo', true, true, false, 67, NOW() - INTERVAL '1 day');
  END IF;

END $$;

-- Verificar produtos inseridos
SELECT 
  'Produtos de teste inseridos!' as status,
  COUNT(*) as total_produtos,
  COUNT(*) FILTER (WHERE destaque = true) as produtos_destaque,
  COUNT(*) FILTER (WHERE condicao = 'novo') as produtos_novos,
  COUNT(*) FILTER (WHERE criado_em > NOW() - INTERVAL '7 days') as produtos_recentes
FROM marketplace.anuncios;

-- Listar alguns produtos
SELECT 
  titulo,
  preco,
  condicao,
  cidade,
  destaque,
  visualizacoes,
  criado_em
FROM marketplace.anuncios
ORDER BY criado_em DESC
LIMIT 10;
