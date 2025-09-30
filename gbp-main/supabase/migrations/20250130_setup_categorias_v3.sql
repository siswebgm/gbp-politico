-- Primeiro: Criar a tabela de tipos
CREATE TABLE IF NOT EXISTS gbp_categoria_tipos (
    id BIGSERIAL PRIMARY KEY,
    uid UUID DEFAULT uuid_generate_v4() UNIQUE,
    nome VARCHAR(255) NOT NULL,
    empresa_uid UUID REFERENCES gbp_empresas(uid) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nome, empresa_uid)
);

-- Configurar segurança
ALTER TABLE gbp_categoria_tipos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa pode ver seus tipos de categoria" ON gbp_categoria_tipos
    FOR SELECT
    USING (auth.uid() IN (
        SELECT usuario_uid FROM gbp_usuarios_empresa WHERE empresa_uid = gbp_categoria_tipos.empresa_uid
    ));

CREATE POLICY "Empresa pode criar seus tipos de categoria" ON gbp_categoria_tipos
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT usuario_uid FROM gbp_usuarios_empresa WHERE empresa_uid = gbp_categoria_tipos.empresa_uid
    ));

CREATE POLICY "Empresa pode atualizar seus tipos de categoria" ON gbp_categoria_tipos
    FOR UPDATE
    USING (auth.uid() IN (
        SELECT usuario_uid FROM gbp_usuarios_empresa WHERE empresa_uid = gbp_categoria_tipos.empresa_uid
    ));

CREATE POLICY "Empresa pode deletar seus tipos de categoria" ON gbp_categoria_tipos
    FOR DELETE
    USING (auth.uid() IN (
        SELECT usuario_uid FROM gbp_usuarios_empresa WHERE empresa_uid = gbp_categoria_tipos.empresa_uid
    ));

-- Inserir tipos padrão
INSERT INTO gbp_categoria_tipos (nome, empresa_uid)
SELECT 'Documentos', uid FROM gbp_empresas
UNION ALL
SELECT 'Benefícios', uid FROM gbp_empresas
UNION ALL
SELECT 'Serviços', uid FROM gbp_empresas
UNION ALL
SELECT 'Outros', uid FROM gbp_empresas;

-- Segundo: Atualizar a tabela de categorias
ALTER TABLE gbp_categorias 
ADD COLUMN tipo_uid UUID REFERENCES gbp_categoria_tipos(uid) ON DELETE SET NULL;

-- Migrar dados existentes
WITH tipos_por_empresa AS (
  SELECT DISTINCT ON (nome, empresa_uid) 
    uid as tipo_uid,
    nome,
    empresa_uid
  FROM gbp_categoria_tipos
)
UPDATE gbp_categorias c
SET tipo_uid = t.tipo_uid
FROM tipos_por_empresa t
WHERE c.tipo = t.nome
AND c.empresa_uid = t.empresa_uid;

-- Remover coluna antiga
ALTER TABLE gbp_categorias DROP COLUMN tipo;
