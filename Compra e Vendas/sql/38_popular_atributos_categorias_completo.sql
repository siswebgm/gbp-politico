-- Popula atributos dinâmicos para TODAS as categorias restantes
-- Executa após 36_criar_atributos_categoria.sql e 37_popular_atributos_categorias.sql

-- Recria função auxiliar (script 37 removeu ao final)
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
    SELECT id INTO v_categoria_id
    FROM marketplace.categorias
    WHERE slug = p_categoria_slug;

    IF v_categoria_id IS NULL THEN
        RAISE NOTICE 'Categoria % nao encontrada', p_categoria_slug;
        RETURN;
    END IF;

    INSERT INTO marketplace.atributos_categoria (
        categoria_id, nome, chave, tipo, opcoes, obrigatorio, ordem
    ) VALUES (
        v_categoria_id, p_nome, p_chave, p_tipo, p_opcoes, p_obrigatorio, p_ordem
    )
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CONSTRUÇAO
-- ============================================
SELECT marketplace.inserir_atributo_categoria('construcao', 'Tipo de Material', 'tipo_material', 'selecao', '["Cimento", "Areia", "Brita", "Tijolo", "Telha", "Madeira", "Ferro", "Aço", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('construcao', 'Quantidade', 'quantidade', 'numero', NULL, false, 2);
SELECT marketplace.inserir_atributo_categoria('construcao', 'Unidade de Medida', 'unidade_medida', 'selecao', '["Kg", "Tonelada", "Metro", "Metro Cúbico", "Unidade", "Saco"]'::jsonb, false, 3);
SELECT marketplace.inserir_atributo_categoria('construcao', 'Estado', 'estado_produto', 'selecao', '["Novo", "Usado", "Sobra de Obra"]'::jsonb, false, 4);

-- ============================================
-- FERRAMENTAS
-- ============================================
SELECT marketplace.inserir_atributo_categoria('ferramentas', 'Tipo de Ferramenta', 'tipo_ferramenta', 'selecao', '["Manual", "Eletrica", "Pneumatica", "Hidraulica"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('ferramentas', 'Marca', 'marca', 'texto', NULL, false, 2);
SELECT marketplace.inserir_atributo_categoria('ferramentas', 'Modelo', 'modelo', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('ferramentas', 'Voltagem', 'voltagem', 'selecao', '["110V", "220V", "Bivolt", "Bateria", "Nao se aplica"]'::jsonb, false, 4);
SELECT marketplace.inserir_atributo_categoria('ferramentas', 'Estado', 'estado_produto', 'selecao', '["Novo", "Usado", "Recondicionado"]'::jsonb, false, 5);

-- ============================================
-- INFORMATICA
-- ============================================
SELECT marketplace.inserir_atributo_categoria('informatica', 'Tipo de Produto', 'tipo_produto', 'selecao', '["Notebook", "Desktop", "Monitor", "Teclado", "Mouse", "Impressora", "Scanner", "Webcam", "Headset", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('informatica', 'Marca', 'marca', 'texto', NULL, false, 2);
SELECT marketplace.inserir_atributo_categoria('informatica', 'Modelo', 'modelo', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('informatica', 'Processador', 'processador', 'texto', NULL, false, 4);
SELECT marketplace.inserir_atributo_categoria('informatica', 'Memoria RAM', 'memoria_ram', 'selecao', '["4GB", "8GB", "16GB", "32GB", "64GB", "Outro"]'::jsonb, false, 5);
SELECT marketplace.inserir_atributo_categoria('informatica', 'Armazenamento', 'armazenamento', 'selecao', '["128GB", "256GB", "512GB", "1TB", "2TB", "Outro"]'::jsonb, false, 6);

-- ============================================
-- BELEZA E SAUDE
-- ============================================
SELECT marketplace.inserir_atributo_categoria('beleza-e-saude', 'Tipo de Produto', 'tipo_produto', 'selecao', '["Maquiagem", "Perfume", "Cuidados com a Pele", "Cuidados com o Cabelo", "Suplemento", "Equipamento de Exercicio", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('beleza-e-saude', 'Marca', 'marca', 'texto', NULL, false, 2);
SELECT marketplace.inserir_atributo_categoria('beleza-e-saude', 'Tamanho/Volume', 'tamanho_volume', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('beleza-e-saude', 'Data de Validade', 'data_validade', 'texto', NULL, false, 4);
SELECT marketplace.inserir_atributo_categoria('beleza-e-saude', 'Lacrado', 'lacrado', 'selecao', '["Sim", "Nao"]'::jsonb, false, 5);

-- ============================================
-- CASA E JARDIM
-- ============================================
SELECT marketplace.inserir_atributo_categoria('casa-e-jardim', 'Tipo de Produto', 'tipo_produto', 'selecao', '["Movel", "Decoracao", "Utensilio de Cozinha", "Eletrodomestico", "Jardinagem", "Iluminacao", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('casa-e-jardim', 'Material', 'material', 'texto', NULL, false, 2);
SELECT marketplace.inserir_atributo_categoria('casa-e-jardim', 'Cor', 'cor', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('casa-e-jardim', 'Dimensoes', 'dimensoes', 'texto', NULL, false, 4);
SELECT marketplace.inserir_atributo_categoria('casa-e-jardim', 'Estado', 'estado_produto', 'selecao', '["Novo", "Usado", "Recondicionado"]'::jsonb, false, 5);

-- ============================================
-- MOVEIS
-- ============================================
SELECT marketplace.inserir_atributo_categoria('moveis', 'Tipo de Movel', 'tipo_movel', 'selecao', '["Sofa", "Mesa", "Cadeira", "Cama", "Guarda-roupa", "Estante", "Rack", "Criado-mudo", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('moveis', 'Material', 'material', 'selecao', '["Madeira", "MDF", "MDP", "Metal", "Vidro", "Plastico", "Tecido", "Couro"]'::jsonb, false, 2);
SELECT marketplace.inserir_atributo_categoria('moveis', 'Cor', 'cor', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('moveis', 'Dimensoes (LxAxP)', 'dimensoes', 'texto', NULL, false, 4);
SELECT marketplace.inserir_atributo_categoria('moveis', 'Estado', 'estado_produto', 'selecao', '["Novo", "Usado", "Recondicionado"]'::jsonb, false, 5);
SELECT marketplace.inserir_atributo_categoria('moveis', 'Montado', 'montado', 'selecao', '["Sim", "Nao", "Desmontado"]'::jsonb, false, 6);

-- ============================================
-- CASA (geral)
-- ============================================
SELECT marketplace.inserir_atributo_categoria('casa', 'Tipo de Item', 'tipo_item', 'selecao', '["Decoracao", "Utensilio", "Eletrodomestico", "Movel", "Iluminacao", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('casa', 'Material', 'material', 'texto', NULL, false, 2);
SELECT marketplace.inserir_atributo_categoria('casa', 'Cor', 'cor', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('casa', 'Estado', 'estado_produto', 'selecao', '["Novo", "Usado"]'::jsonb, false, 4);

-- ============================================
-- ALIMENTOS E BEBIDAS
-- ============================================
SELECT marketplace.inserir_atributo_categoria('alimentos-e-bebidas', 'Tipo de Produto', 'tipo_produto', 'selecao', '["Alimento", "Bebida", "Doce", "Salgado", "Congelado", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('alimentos-e-bebidas', 'Peso/Volume', 'peso_volume', 'texto', NULL, false, 2);
SELECT marketplace.inserir_atributo_categoria('alimentos-e-bebidas', 'Data de Validade', 'data_validade', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('alimentos-e-bebidas', 'Lacrado', 'lacrado', 'selecao', '["Sim", "Nao"]'::jsonb, false, 4);
SELECT marketplace.inserir_atributo_categoria('alimentos-e-bebidas', 'Origem', 'origem', 'texto', NULL, false, 5);

-- ============================================
-- ANIMAIS DE ESTIMACAO
-- ============================================
SELECT marketplace.inserir_atributo_categoria('animais-de-estimacao', 'Tipo de Produto', 'tipo_produto', 'selecao', '["Racao", "Acessorio", "Brinquedo", "Medicamento", "Higiene", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('animais-de-estimacao', 'Para qual animal', 'animal', 'selecao', '["Cachorro", "Gato", "Passaro", "Peixe", "Roedor", "Reptil", "Outro"]'::jsonb, false, 2);
SELECT marketplace.inserir_atributo_categoria('animais-de-estimacao', 'Marca', 'marca', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('animais-de-estimacao', 'Tamanho/Peso', 'tamanho_peso', 'texto', NULL, false, 4);
SELECT marketplace.inserir_atributo_categoria('animais-de-estimacao', 'Data de Validade', 'data_validade', 'texto', NULL, false, 5);

-- ============================================
-- MODA E ACESSORIOS (complemento)
-- ============================================
SELECT marketplace.inserir_atributo_categoria('moda-e-acessorios', 'Tipo de Produto', 'tipo_produto', 'selecao', '["Roupa", "Calcado", "Bolsa", "Relogio", "Joia", "Oculos", "Chapeu", "Cinto", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('moda-e-acessorios', 'Tamanho', 'tamanho', 'selecao', '["PP", "P", "M", "G", "GG", "XG", "Numero"]'::jsonb, false, 2);
SELECT marketplace.inserir_atributo_categoria('moda-e-acessorios', 'Cor', 'cor', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('moda-e-acessorios', 'Marca', 'marca', 'texto', NULL, false, 4);
SELECT marketplace.inserir_atributo_categoria('moda-e-acessorios', 'Genero', 'genero', 'selecao', '["Masculino", "Feminino", "Unissex", "Infantil"]'::jsonb, false, 5);
SELECT marketplace.inserir_atributo_categoria('moda-e-acessorios', 'Material', 'material', 'texto', NULL, false, 6);

-- ============================================
-- BRINQUEDOS E JOGOS
-- ============================================
SELECT marketplace.inserir_atributo_categoria('brinquedos-e-jogos', 'Tipo de Produto', 'tipo_produto', 'selecao', '["Brinquedo", "Jogo de Tabuleiro", "Videogame", "Quebra-cabeca", "Boneca", "Carrinho", "Pelucia", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('brinquedos-e-jogos', 'Faixa Etaria', 'faixa_etaria', 'selecao', '["0-2 anos", "3-5 anos", "6-8 anos", "9-12 anos", "13+ anos", "Adulto"]'::jsonb, false, 2);
SELECT marketplace.inserir_atributo_categoria('brinquedos-e-jogos', 'Marca', 'marca', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('brinquedos-e-jogos', 'Estado', 'estado_produto', 'selecao', '["Novo", "Usado", "Na caixa"]'::jsonb, false, 4);
SELECT marketplace.inserir_atributo_categoria('brinquedos-e-jogos', 'Completo', 'completo', 'selecao', '["Sim", "Nao", "Faltam pecas"]'::jsonb, false, 5);

-- ============================================
-- MUSICA E INSTRUMENTOS
-- ============================================
SELECT marketplace.inserir_atributo_categoria('musica-e-instrumentos', 'Tipo de Instrumento', 'tipo_instrumento', 'selecao', '["Violao", "Guitarra", "Baixo", "Teclado", "Piano", "Bateria", "Flauta", "Saxofone", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('musica-e-instrumentos', 'Marca', 'marca', 'texto', NULL, false, 2);
SELECT marketplace.inserir_atributo_categoria('musica-e-instrumentos', 'Modelo', 'modelo', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('musica-e-instrumentos', 'Material', 'material', 'texto', NULL, false, 4);
SELECT marketplace.inserir_atributo_categoria('musica-e-instrumentos', 'Estado', 'estado_produto', 'selecao', '["Novo", "Usado", "Recondicionado"]'::jsonb, false, 5);
SELECT marketplace.inserir_atributo_categoria('musica-e-instrumentos', 'Acompanha Case', 'acompanha_case', 'selecao', '["Sim", "Nao"]'::jsonb, false, 6);

-- ============================================
-- SERVICOS
-- ============================================
SELECT marketplace.inserir_atributo_categoria('servicos', 'Tipo de Servico', 'tipo_servico', 'selecao', '["Manutencao", "Limpeza", "Consultoria", "Aulas", "Transporte", "Reformas", "Outro"]'::jsonb, false, 1);
SELECT marketplace.inserir_atributo_categoria('servicos', 'Disponibilidade', 'disponibilidade', 'selecao', '["Imediata", "Agendamento", "A combinar"]'::jsonb, false, 2);
SELECT marketplace.inserir_atributo_categoria('servicos', 'Forma de Pagamento', 'forma_pagamento', 'multipla_selecao', '["Dinheiro", "PIX", "Cartao de Credito", "Cartao de Debito", "Transferencia"]'::jsonb, false, 3);
SELECT marketplace.inserir_atributo_categoria('servicos', 'Atende em', 'atende_em', 'selecao', '["Domicilio", "Estabelecimento", "Ambos"]'::jsonb, false, 4);

-- ============================================
-- OUTROS
-- ============================================
SELECT marketplace.inserir_atributo_categoria('outros', 'Tipo de Produto', 'tipo_produto', 'texto', NULL, false, 1);
SELECT marketplace.inserir_atributo_categoria('outros', 'Estado', 'estado_produto', 'selecao', '["Novo", "Usado"]'::jsonb, false, 2);
SELECT marketplace.inserir_atributo_categoria('outros', 'Marca', 'marca', 'texto', NULL, false, 3);
SELECT marketplace.inserir_atributo_categoria('outros', 'Modelo', 'modelo', 'texto', NULL, false, 4);

