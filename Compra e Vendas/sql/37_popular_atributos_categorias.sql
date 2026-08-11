-- Script para popular atributos dinâmicos para categorias principais
-- Veículos, Imóveis, Eletrônicos, Celulares, etc.

-- Função auxiliar para inserir atributos
CREATE OR REPLACE FUNCTION marketplace.inserir_atributo_categoria(
    p_categoria_slug VARCHAR,
    p_nome VARCHAR,
    p_chave VARCHAR,
    p_tipo VARCHAR,
    p_opcoes JSONB DEFAULT NULL,
    p_obrigatorio BOOLEAN DEFAULT false,
    p_ordem INTEGER DEFAULT 0
) RETURNS VOID AS $$
DECLARE
    v_categoria_id UUID;
BEGIN
    -- Buscar ID da categoria pelo slug
    SELECT id INTO v_categoria_id
    FROM marketplace.categorias
    WHERE slug = p_categoria_slug;
    
    IF v_categoria_id IS NULL THEN
        RAISE NOTICE 'Categoria % não encontrada', p_categoria_slug;
        RETURN;
    END IF;
    
    -- Inserir atributo
    INSERT INTO marketplace.atributos_categoria (
        categoria_id, nome, chave, tipo, opcoes, obrigatorio, ordem
    ) VALUES (
        v_categoria_id, p_nome, p_chave, p_tipo, p_opcoes, p_obrigatorio, p_ordem
    )
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VEÍCULOS
-- ============================================
SELECT marketplace.inserir_atributo_categoria('veiculos', 'Tipo de Veículo', 'tipo_veiculo', 'selecao', 
    '["Carro", "Moto", "Caminhão", "Van", "Ônibus", "Outros"]'::jsonb, true, 1);
SELECT marketplace.inserir_atributo_categoria('veiculos', 'Marca', 'marca', 'texto', NULL, true, 2);
SELECT marketplace.inserir_atributo_categoria('veiculos', 'Modelo', 'modelo', 'texto', NULL, true, 3);
SELECT marketplace.inserir_atributo_categoria('veiculos', 'Ano', 'ano', 'numero', NULL, true, 4);
SELECT marketplace.inserir_atributo_categoria('veiculos', 'Cor', 'cor', 'selecao',
    '["Preto", "Branco", "Prata", "Cinza", "Vermelho", "Azul", "Verde", "Amarelo", "Marrom", "Outros"]'::jsonb, false, 5);
SELECT marketplace.inserir_atributo_categoria('veiculos', 'Quilometragem', 'quilometragem', 'numero', NULL, false, 6);
SELECT marketplace.inserir_atributo_categoria('veiculos', 'Combustível', 'combustivel', 'selecao',
    '["Gasolina", "Álcool", "Flex", "Diesel", "Elétrico", "Híbrido", "GNV"]'::jsonb, false, 7);
SELECT marketplace.inserir_atributo_categoria('veiculos', 'Câmbio', 'cambio', 'selecao',
    '["Manual", "Automático", "Automatizado", "CVT"]'::jsonb, false, 8);

-- ============================================
-- IMÓVEIS
-- ============================================
SELECT marketplace.inserir_atributo_categoria('imoveis', 'Tipo de Imóvel', 'tipo_imovel', 'selecao',
    '["Casa", "Apartamento", "Terreno", "Sala Comercial", "Galpão", "Chácara", "Outros"]'::jsonb, true, 1);
SELECT marketplace.inserir_atributo_categoria('imoveis', 'Finalidade', 'finalidade', 'selecao',
    '["Venda", "Aluguel", "Temporada"]'::jsonb, true, 2);
SELECT marketplace.inserir_atributo_categoria('imoveis', 'Área (m²)', 'area_m2', 'numero', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('imoveis', 'Quartos', 'quartos', 'numero', NULL, false, 4);
SELECT marketplace.inserir_atributo_categoria('imoveis', 'Banheiros', 'banheiros', 'numero', NULL, false, 5);
SELECT marketplace.inserir_atributo_categoria('imoveis', 'Vagas de Garagem', 'vagas_garagem', 'numero', NULL, false, 6);
SELECT marketplace.inserir_atributo_categoria('imoveis', 'Mobiliado', 'mobiliado', 'selecao',
    '["Sim", "Não", "Semi-mobiliado"]'::jsonb, false, 7);

-- ============================================
-- ELETRÔNICOS
-- ============================================
SELECT marketplace.inserir_atributo_categoria('eletronicos', 'Tipo de Eletrônico', 'tipo_eletronico', 'selecao',
    '["Notebook", "Computador", "Tablet", "Monitor", "Impressora", "Video Game", "Televisão", "Câmera", "Outros"]'::jsonb, true, 1);
SELECT marketplace.inserir_atributo_categoria('eletronicos', 'Marca', 'marca', 'texto', NULL, false, 2);
SELECT marketplace.inserir_atributo_categoria('eletronicos', 'Modelo', 'modelo', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('eletronicos', 'Memória RAM', 'memoria_ram', 'selecao',
    '["2GB", "4GB", "8GB", "16GB", "32GB", "64GB ou mais"]'::jsonb, false, 4);
SELECT marketplace.inserir_atributo_categoria('eletronicos', 'Armazenamento', 'armazenamento', 'selecao',
    '["128GB", "256GB", "512GB", "1TB", "2TB ou mais"]'::jsonb, false, 5);
SELECT marketplace.inserir_atributo_categoria('eletronicos', 'Processador', 'processador', 'texto', NULL, false, 6);

-- ============================================
-- CELULARES
-- ============================================
SELECT marketplace.inserir_atributo_categoria('celulares', 'Marca', 'marca', 'selecao',
    '["Apple", "Samsung", "Xiaomi", "Motorola", "LG", "Asus", "Realme", "Outros"]'::jsonb, true, 1);
SELECT marketplace.inserir_atributo_categoria('celulares', 'Modelo', 'modelo', 'texto', NULL, true, 2);
SELECT marketplace.inserir_atributo_categoria('celulares', 'Memória RAM', 'memoria_ram', 'selecao',
    '["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB ou mais"]'::jsonb, false, 3);
SELECT marketplace.inserir_atributo_categoria('celulares', 'Armazenamento', 'armazenamento', 'selecao',
    '["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB"]'::jsonb, false, 4);
SELECT marketplace.inserir_atributo_categoria('celulares', 'Cor', 'cor', 'texto', NULL, false, 5);
SELECT marketplace.inserir_atributo_categoria('celulares', 'Sistema Operacional', 'sistema_operacional', 'selecao',
    '["Android", "iOS"]'::jsonb, false, 6);

-- ============================================
-- ROUPAS E ACESSÓRIOS
-- ============================================
SELECT marketplace.inserir_atributo_categoria('roupas-e-acessorios', 'Tipo', 'tipo_roupa', 'selecao',
    '["Camiseta", "Calça", "Vestido", "Saia", "Shorts", "Jaqueta", "Casaco", "Sapato", "Tênis", "Bolsa", "Outros"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('roupas-e-acessorios', 'Tamanho', 'tamanho', 'selecao',
    '["PP", "P", "M", "G", "GG", "XG", "34", "36", "38", "40", "42", "44", "46"]'::jsonb, false, 2);
SELECT marketplace.inserir_atributo_categoria('roupas-e-acessorios', 'Gênero', 'genero', 'selecao',
    '["Masculino", "Feminino", "Unissex", "Infantil"]'::jsonb, false, 3);
SELECT marketplace.inserir_atributo_categoria('roupas-e-acessorios', 'Cor', 'cor', 'texto', NULL, false, 4);
SELECT marketplace.inserir_atributo_categoria('roupas-e-acessorios', 'Marca', 'marca', 'texto', NULL, false, 5);

-- ============================================
-- LIVROS E EDUCAÇÃO
-- ============================================
SELECT marketplace.inserir_atributo_categoria('livros-e-educacao', 'Tipo', 'tipo_produto', 'selecao',
    '["Livro", "Apostila", "Revista", "Curso", "Material Didático", "Outros"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('livros-e-educacao', 'Autor', 'autor', 'texto', NULL, false, 2);
SELECT marketplace.inserir_atributo_categoria('livros-e-educacao', 'Editora', 'editora', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('livros-e-educacao', 'Idioma', 'idioma', 'selecao',
    '["Português", "Inglês", "Espanhol", "Francês", "Outros"]'::jsonb, false, 4);
SELECT marketplace.inserir_atributo_categoria('livros-e-educacao', 'Ano de Publicação', 'ano_publicacao', 'numero', NULL, false, 5);

-- ============================================
-- ESPORTES E LAZER
-- ============================================
SELECT marketplace.inserir_atributo_categoria('esportes-e-lazer', 'Tipo de Esporte', 'tipo_esporte', 'selecao',
    '["Futebol", "Vôlei", "Basquete", "Tênis", "Natação", "Ciclismo", "Academia", "Camping", "Outros"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('esportes-e-lazer', 'Marca', 'marca', 'texto', NULL, false, 2);
SELECT marketplace.inserir_atributo_categoria('esportes-e-lazer', 'Tamanho', 'tamanho', 'texto', NULL, false, 3);

-- Remover função auxiliar
DROP FUNCTION IF EXISTS marketplace.inserir_atributo_categoria;
