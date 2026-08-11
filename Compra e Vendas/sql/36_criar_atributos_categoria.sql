-- Script para criar sistema de atributos dinâmicos por categoria
-- Permite filtros específicos como marca, modelo, cor, ano para veículos, etc.

-- Tabela de definição de atributos por categoria
CREATE TABLE IF NOT EXISTS marketplace.atributos_categoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria_id UUID NOT NULL REFERENCES marketplace.categorias(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL, -- ex: "Marca", "Modelo", "Cor", "Ano"
    chave VARCHAR(50) NOT NULL, -- ex: "marca", "modelo", "cor", "ano"
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('texto', 'numero', 'selecao', 'multipla_selecao')),
    opcoes JSONB, -- Para tipo 'selecao' ou 'multipla_selecao', ex: ["Carro", "Moto", "Caminhão"]
    obrigatorio BOOLEAN DEFAULT false,
    ordem INTEGER DEFAULT 0,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_atributos_categoria_categoria_id ON marketplace.atributos_categoria(categoria_id);
CREATE INDEX IF NOT EXISTS idx_atributos_categoria_chave ON marketplace.atributos_categoria(chave);
CREATE INDEX IF NOT EXISTS idx_atributos_categoria_ativo ON marketplace.atributos_categoria(ativo);

-- Tabela para armazenar valores dos atributos dos anúncios
CREATE TABLE IF NOT EXISTS marketplace.anuncio_atributos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    anuncio_id UUID NOT NULL REFERENCES marketplace.anuncios(id) ON DELETE CASCADE,
    atributo_id UUID NOT NULL REFERENCES marketplace.atributos_categoria(id) ON DELETE CASCADE,
    valor TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(anuncio_id, atributo_id)
);

-- Índices para busca eficiente
CREATE INDEX IF NOT EXISTS idx_anuncio_atributos_anuncio_id ON marketplace.anuncio_atributos(anuncio_id);
CREATE INDEX IF NOT EXISTS idx_anuncio_atributos_atributo_id ON marketplace.anuncio_atributos(atributo_id);
CREATE INDEX IF NOT EXISTS idx_anuncio_atributos_valor ON marketplace.anuncio_atributos USING gin(to_tsvector('portuguese', valor));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION marketplace.atualizar_timestamp_atributos()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_atributos_categoria
    BEFORE UPDATE ON marketplace.atributos_categoria
    FOR EACH ROW
    EXECUTE FUNCTION marketplace.atualizar_timestamp_atributos();

CREATE TRIGGER trigger_atualizar_anuncio_atributos
    BEFORE UPDATE ON marketplace.anuncio_atributos
    FOR EACH ROW
    EXECUTE FUNCTION marketplace.atualizar_timestamp_atributos();

-- View ponte para o schema public (atributos_categoria)
CREATE OR REPLACE VIEW public.atributos_categoria AS
SELECT * FROM marketplace.atributos_categoria;

-- View ponte para o schema public (anuncio_atributos)
CREATE OR REPLACE VIEW public.anuncio_atributos AS
SELECT * FROM marketplace.anuncio_atributos;

-- RLS para atributos_categoria (leitura pública)
ALTER TABLE marketplace.atributos_categoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atributos categoria são públicos para leitura"
    ON marketplace.atributos_categoria
    FOR SELECT
    USING (ativo = true);

CREATE POLICY "Apenas admins podem modificar atributos categoria"
    ON marketplace.atributos_categoria
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM marketplace.usuarios
            WHERE id = auth.uid()
            AND papel = 'administrador'
        )
    );

-- RLS para anuncio_atributos
ALTER TABLE marketplace.anuncio_atributos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atributos de anúncios são públicos para leitura"
    ON marketplace.anuncio_atributos
    FOR SELECT
    USING (true);

CREATE POLICY "Usuários podem gerenciar atributos dos próprios anúncios"
    ON marketplace.anuncio_atributos
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM marketplace.anuncios
            WHERE id = anuncio_id
            AND usuario_id = auth.uid()
        )
    );
