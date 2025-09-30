-- Habilitar RLS para a tabela de categorias
ALTER TABLE gbp_categorias ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
CREATE POLICY "Empresa pode ver suas categorias" ON gbp_categorias
    FOR SELECT
    USING (auth.uid() IN (
        SELECT uid FROM gbp_usuarios WHERE empresa_uid = gbp_categorias.empresa_uid
    ));

-- Política para INSERT
CREATE POLICY "Empresa pode criar suas categorias" ON gbp_categorias
    FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT uid FROM gbp_usuarios WHERE empresa_uid = gbp_categorias.empresa_uid
    ));

-- Política para UPDATE
CREATE POLICY "Empresa pode atualizar suas categorias" ON gbp_categorias
    FOR UPDATE
    USING (auth.uid() IN (
        SELECT uid FROM gbp_usuarios WHERE empresa_uid = gbp_categorias.empresa_uid
    ));

-- Política para DELETE
CREATE POLICY "Empresa pode deletar suas categorias" ON gbp_categorias
    FOR DELETE
    USING (auth.uid() IN (
        SELECT uid FROM gbp_usuarios WHERE empresa_uid = gbp_categorias.empresa_uid
    ));
