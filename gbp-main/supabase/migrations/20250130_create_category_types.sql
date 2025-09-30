-- Cria a tabela de tipos de categoria
CREATE TABLE IF NOT EXISTS gbp_categoria_tipos (
    uid UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    empresa_uid UUID REFERENCES gbp_empresas(uid) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(nome, empresa_uid)
);

-- Insere tipos padrão para todas as empresas existentes
INSERT INTO gbp_categoria_tipos (nome, empresa_uid)
SELECT 'Documentos', uid FROM gbp_empresas
UNION ALL
SELECT 'Benefícios', uid FROM gbp_empresas
UNION ALL
SELECT 'Serviços', uid FROM gbp_empresas
UNION ALL
SELECT 'Outros', uid FROM gbp_empresas;

-- Atualiza a coluna tipo na tabela gbp_categorias para referenciar a nova tabela
ALTER TABLE gbp_categorias
ADD COLUMN tipo_uid UUID REFERENCES gbp_categoria_tipos(uid) ON DELETE SET NULL;

-- Migra os dados existentes
UPDATE gbp_categorias c
SET tipo_uid = t.uid
FROM gbp_categoria_tipos t
WHERE c.tipo = t.nome
AND c.empresa_uid = t.empresa_uid;
