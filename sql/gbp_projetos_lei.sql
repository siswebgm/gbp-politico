-- Tabela principal de Projetos de Lei
CREATE TABLE gbp_projetos_lei (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(20) NOT NULL,
    ano INTEGER NOT NULL,
    titulo VARCHAR(255) NOT NULL,
    autor VARCHAR(100) NOT NULL,
    data_protocolo DATE NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('em_andamento', 'aprovado', 'arquivado')),
    ementa TEXT NOT NULL,
    justificativa TEXT NOT NULL,
    objetivo TEXT NOT NULL, -- Artigo 1º
    disposicoes_finais TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    UNIQUE(numero, ano)
);

-- Tabela para Coautores
CREATE TABLE gbp_projetos_lei_coautores (
    id SERIAL PRIMARY KEY,
    projeto_lei_id INTEGER REFERENCES gbp_projetos_lei(id) ON DELETE CASCADE,
    nome VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(projeto_lei_id, nome)
);

-- Tabela para Artigos (exceto o Artigo 1º que está na tabela principal)
CREATE TABLE gbp_projetos_lei_artigos (
    id SERIAL PRIMARY KEY,
    projeto_lei_id INTEGER REFERENCES gbp_projetos_lei(id) ON DELETE CASCADE,
    numero INTEGER NOT NULL,
    texto TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(projeto_lei_id, numero)
);

-- Tabela para Tags
CREATE TABLE gbp_projetos_lei_tags (
    id SERIAL PRIMARY KEY,
    projeto_lei_id INTEGER REFERENCES gbp_projetos_lei(id) ON DELETE CASCADE,
    tag VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(projeto_lei_id, tag)
);

-- Tabela para Arquivos
CREATE TABLE gbp_projetos_lei_arquivos (
    id SERIAL PRIMARY KEY,
    projeto_lei_id INTEGER REFERENCES gbp_projetos_lei(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    tamanho INTEGER NOT NULL, -- em bytes
    tipo VARCHAR(50) NOT NULL,
    caminho VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Tabela para Tramitação
CREATE TABLE gbp_projetos_lei_tramitacao (
    id SERIAL PRIMARY KEY,
    projeto_lei_id INTEGER REFERENCES gbp_projetos_lei(id) ON DELETE CASCADE,
    data DATE NOT NULL,
    status VARCHAR(100) NOT NULL,
    descricao TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Índices para melhor performance
CREATE INDEX idx_projetos_lei_numero_ano ON gbp_projetos_lei(numero, ano);
CREATE INDEX idx_projetos_lei_status ON gbp_projetos_lei(status);
CREATE INDEX idx_projetos_lei_autor ON gbp_projetos_lei(autor);
CREATE INDEX idx_projetos_lei_data_protocolo ON gbp_projetos_lei(data_protocolo);
CREATE INDEX idx_projetos_lei_coautores_projeto ON gbp_projetos_lei_coautores(projeto_lei_id);
CREATE INDEX idx_projetos_lei_artigos_projeto ON gbp_projetos_lei_artigos(projeto_lei_id);
CREATE INDEX idx_projetos_lei_tags_projeto ON gbp_projetos_lei_tags(projeto_lei_id);
CREATE INDEX idx_projetos_lei_arquivos_projeto ON gbp_projetos_lei_arquivos(projeto_lei_id);
CREATE INDEX idx_projetos_lei_tramitacao_projeto ON gbp_projetos_lei_tramitacao(projeto_lei_id);
CREATE INDEX idx_projetos_lei_tramitacao_data ON gbp_projetos_lei_tramitacao(data);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projetos_lei_updated_at
    BEFORE UPDATE ON gbp_projetos_lei
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projetos_lei_artigos_updated_at
    BEFORE UPDATE ON gbp_projetos_lei_artigos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Função para buscar projeto de lei completo
CREATE OR REPLACE FUNCTION get_projeto_lei_completo(p_projeto_id INTEGER)
RETURNS JSON AS $$
BEGIN
    RETURN (
        SELECT json_build_object(
            'id', pl.id,
            'numero', pl.numero,
            'ano', pl.ano,
            'titulo', pl.titulo,
            'autor', pl.autor,
            'coautores', (
                SELECT json_agg(nome)
                FROM gbp_projetos_lei_coautores
                WHERE projeto_lei_id = pl.id
            ),
            'dataProtocolo', pl.data_protocolo,
            'status', pl.status,
            'ementa', pl.ementa,
            'justificativa', pl.justificativa,
            'textoLei', json_build_object(
                'objetivo', pl.objetivo,
                'artigos', (
                    SELECT json_agg(json_build_object(
                        'numero', numero,
                        'texto', texto
                    ) ORDER BY numero)
                    FROM gbp_projetos_lei_artigos
                    WHERE projeto_lei_id = pl.id
                ),
                'disposicoesFinais', pl.disposicoes_finais
            ),
            'tags', (
                SELECT json_agg(tag)
                FROM gbp_projetos_lei_tags
                WHERE projeto_lei_id = pl.id
            ),
            'arquivos', (
                SELECT json_agg(json_build_object(
                    'nome', nome,
                    'tamanho', tamanho,
                    'tipo', tipo,
                    'caminho', caminho
                ))
                FROM gbp_projetos_lei_arquivos
                WHERE projeto_lei_id = pl.id
            ),
            'tramitacao', (
                SELECT json_agg(json_build_object(
                    'data', data,
                    'status', status,
                    'descricao', descricao
                ) ORDER BY data DESC)
                FROM gbp_projetos_lei_tramitacao
                WHERE projeto_lei_id = pl.id
            ),
            'createdAt', pl.created_at,
            'updatedAt', pl.updated_at
        )
        FROM gbp_projetos_lei pl
        WHERE pl.id = p_projeto_id AND pl.deleted_at IS NULL
    );
END;
$$ LANGUAGE plpgsql;
