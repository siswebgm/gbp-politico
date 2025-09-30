-- Cria a tabela de tipos de categoria
CREATE TABLE IF NOT EXISTS gbp_categoria_tipos (
    id BIGSERIAL PRIMARY KEY,
    uid UUID DEFAULT uuid_generate_v4() UNIQUE,
    nome VARCHAR(255) NOT NULL,
    empresa_uid UUID REFERENCES gbp_empresas(uid) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(nome, empresa_uid)
);

-- Adiciona política RLS
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

-- Insere tipos padrão
INSERT INTO gbp_categoria_tipos (nome, empresa_uid)
SELECT 'Documentos', uid FROM gbp_empresas
UNION ALL
SELECT 'Benefícios', uid FROM gbp_empresas
UNION ALL
SELECT 'Serviços', uid FROM gbp_empresas
UNION ALL
SELECT 'Outros', uid FROM gbp_empresas;
