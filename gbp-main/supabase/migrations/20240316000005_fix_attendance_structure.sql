-- Drop existing table and constraints
DROP TABLE IF EXISTS gbp_atendimentos CASCADE;

-- Create attendance table with proper structure
CREATE TABLE gbp_atendimentos (
    id BIGSERIAL PRIMARY KEY,
    eleitor_id BIGINT NOT NULL,
    usuario_id BIGINT NOT NULL,
    categoria_id BIGINT,
    descricao TEXT NOT NULL,
    data_atendimento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    empresa_id BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_atendimentos_empresa FOREIGN KEY (empresa_id) 
        REFERENCES gbp_empresas(id) ON DELETE CASCADE,
    CONSTRAINT fk_atendimentos_eleitor FOREIGN KEY (eleitor_id) 
        REFERENCES gbp_eleitores(id) ON DELETE CASCADE,
    CONSTRAINT fk_atendimentos_usuario FOREIGN KEY (usuario_id) 
        REFERENCES gbp_usuarios(id) ON DELETE CASCADE,
    CONSTRAINT fk_atendimentos_categoria FOREIGN KEY (categoria_id) 
        REFERENCES gbp_categorias_atendimento(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_atendimentos_empresa_id ON gbp_atendimentos(empresa_id);
CREATE INDEX idx_atendimentos_eleitor_id ON gbp_atendimentos(eleitor_id);
CREATE INDEX idx_atendimentos_usuario_id ON gbp_atendimentos(usuario_id);
CREATE INDEX idx_atendimentos_categoria_id ON gbp_atendimentos(categoria_id);
CREATE INDEX idx_atendimentos_data ON gbp_atendimentos(data_atendimento);