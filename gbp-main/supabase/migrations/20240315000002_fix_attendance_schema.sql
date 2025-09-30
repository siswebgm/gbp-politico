-- Drop existing constraints if they exist
ALTER TABLE IF EXISTS gbp_atendimentos 
DROP CONSTRAINT IF EXISTS fk_atendimentos_empresa,
DROP CONSTRAINT IF EXISTS fk_atendimentos_categoria;

-- Recreate the attendance table with proper structure
CREATE TABLE IF NOT EXISTS gbp_atendimentos (
    id BIGSERIAL PRIMARY KEY,
    eleitor_id BIGINT NOT NULL REFERENCES gbp_eleitores(id) ON DELETE CASCADE,
    usuario_id BIGINT NOT NULL REFERENCES gbp_usuarios(id),
    categoria_id BIGINT REFERENCES gbp_categorias_atendimento(id) ON DELETE SET NULL,
    descricao TEXT NOT NULL,
    data_atendimento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    empresa_id BIGINT NOT NULL REFERENCES gbp_empresas(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_atendimentos_empresa_id ON gbp_atendimentos(empresa_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_eleitor_id ON gbp_atendimentos(eleitor_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_usuario_id ON gbp_atendimentos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_categoria_id ON gbp_atendimentos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_data ON gbp_atendimentos(data_atendimento);

-- Add foreign key constraints
ALTER TABLE gbp_atendimentos
ADD CONSTRAINT fk_atendimentos_empresa
FOREIGN KEY (empresa_id)
REFERENCES gbp_empresas(id)
ON DELETE CASCADE;

ALTER TABLE gbp_atendimentos
ADD CONSTRAINT fk_atendimentos_categoria
FOREIGN KEY (categoria_id)
REFERENCES gbp_categorias_atendimento(id)
ON DELETE SET NULL;

-- Create or replace view for attendance details
CREATE OR REPLACE VIEW vw_atendimentos AS
SELECT 
    a.id,
    a.descricao,
    a.data_atendimento,
    a.empresa_id,
    e.nome as eleitor_nome,
    u.nome as usuario_nome,
    c.nome as categoria_nome
FROM gbp_atendimentos a
LEFT JOIN gbp_eleitores e ON a.eleitor_id = e.id
LEFT JOIN gbp_usuarios u ON a.usuario_id = u.id
LEFT JOIN gbp_categorias_atendimento c ON a.categoria_id = c.id;