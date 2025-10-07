-- Corrigir políticas RLS da tabela gbp_planos para evitar erro 406

-- Habilitar RLS na tabela gbp_planos (se ainda não estiver)
ALTER TABLE gbp_planos ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Usuários podem ver planos da própria empresa" ON gbp_planos;
DROP POLICY IF EXISTS "Apenas admins podem criar planos" ON gbp_planos;
DROP POLICY IF EXISTS "Apenas admins podem atualizar planos" ON gbp_planos;
DROP POLICY IF EXISTS "Apenas admins podem deletar planos" ON gbp_planos;

-- Política para SELECT: usuários autenticados podem ver planos da própria empresa
CREATE POLICY "select_planos_propria_empresa"
ON gbp_planos
FOR SELECT
TO authenticated
USING (
  empresa_uid IN (
    SELECT empresa_uid 
    FROM gbp_usuarios 
    WHERE email = auth.jwt()->>'email'
  )
);

-- Política para INSERT: apenas admins podem criar planos
CREATE POLICY "insert_planos_apenas_admin"
ON gbp_planos
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM gbp_usuarios 
    WHERE email = auth.jwt()->>'email'
    AND empresa_uid = gbp_planos.empresa_uid
    AND (nivel_acesso = 'admin' OR adm_empresa = true)
  )
);

-- Política para UPDATE: apenas admins podem atualizar planos
CREATE POLICY "update_planos_apenas_admin"
ON gbp_planos
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM gbp_usuarios 
    WHERE email = auth.jwt()->>'email'
    AND empresa_uid = gbp_planos.empresa_uid
    AND (nivel_acesso = 'admin' OR adm_empresa = true)
  )
);

-- Política para DELETE: apenas admins podem deletar planos
CREATE POLICY "delete_planos_apenas_admin"
ON gbp_planos
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM gbp_usuarios 
    WHERE email = auth.jwt()->>'email'
    AND empresa_uid = gbp_planos.empresa_uid
    AND (nivel_acesso = 'admin' OR adm_empresa = true)
  )
);

-- Comentários
COMMENT ON POLICY "select_planos_propria_empresa" ON gbp_planos IS 'Permite que usuários vejam planos da própria empresa';
COMMENT ON POLICY "insert_planos_apenas_admin" ON gbp_planos IS 'Apenas administradores podem criar planos';
COMMENT ON POLICY "update_planos_apenas_admin" ON gbp_planos IS 'Apenas administradores podem atualizar planos';
COMMENT ON POLICY "delete_planos_apenas_admin" ON gbp_planos IS 'Apenas administradores podem deletar planos';
