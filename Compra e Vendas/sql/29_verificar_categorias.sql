-- ============================================================================
-- Verificar categorias cadastradas
-- ============================================================================

-- 1. Verificar se há categorias cadastradas
SELECT 
  'Total de categorias:' as info,
  COUNT(*) as total
FROM marketplace.categorias;

-- 2. Listar todas as categorias
SELECT 
  id,
  nome,
  slug,
  icone,
  cor,
  ordem,
  categoria_pai_id,
  ativo
FROM marketplace.categorias
ORDER BY ordem, nome;

-- 3. Verificar subcategorias
SELECT 
  'Total de subcategorias:' as info,
  COUNT(*) as total
FROM marketplace.subcategorias;

-- 4. Listar subcategorias com suas categorias
SELECT 
  s.id,
  s.nome as subcategoria,
  s.slug,
  c.nome as categoria_pai,
  s.ordem,
  s.ativo
FROM marketplace.subcategorias s
JOIN marketplace.categorias c ON c.id = s.categoria_id
ORDER BY c.nome, s.ordem, s.nome;

-- 5. Inserir categorias de teste se não houver nenhuma
INSERT INTO marketplace.categorias (nome, slug, icone, cor, ordem, ativo)
SELECT * FROM (VALUES
  ('Eletrônicos', 'eletronicos', '📱', '#3B82F6', 1, true),
  ('Móveis', 'moveis', '🪑', '#10B981', 2, true),
  ('Roupas', 'roupas', '👕', '#F59E0B', 3, true),
  ('Livros', 'livros', '📚', '#8B5CF6', 4, true),
  ('Esportes', 'esportes', '⚽', '#EF4444', 5, true)
) AS v(nome, slug, icone, cor, ordem, ativo)
WHERE NOT EXISTS (SELECT 1 FROM marketplace.categorias LIMIT 1);

-- 6. Verificar novamente
SELECT 
  id,
  nome,
  slug,
  icone,
  cor,
  ordem,
  ativo
FROM marketplace.categorias
ORDER BY ordem;
