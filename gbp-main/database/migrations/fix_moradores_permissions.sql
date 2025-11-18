-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir inserção pública de moradores" ON gbp_moradores;
DROP POLICY IF EXISTS "Permitir inserção pública de dependentes" ON gbp_dependentes;
DROP POLICY IF EXISTS "Permitir leitura de moradores para usuários autenticados" ON gbp_moradores;
DROP POLICY IF EXISTS "Permitir leitura de dependentes para usuários autenticados" ON gbp_dependentes;

-- Habilitar RLS (se ainda não estiver habilitado)
ALTER TABLE gbp_moradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gbp_dependentes ENABLE ROW LEVEL SECURITY;

-- Política para permitir INSERÇÃO PÚBLICA de moradores (sem autenticação)
CREATE POLICY "Permitir inserção pública de moradores"
  ON gbp_moradores
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política para permitir INSERÇÃO PÚBLICA de dependentes (sem autenticação)
CREATE POLICY "Permitir inserção pública de dependentes"
  ON gbp_dependentes
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Política para permitir LEITURA para usuários autenticados
CREATE POLICY "Permitir leitura de moradores para usuários autenticados"
  ON gbp_moradores
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Permitir leitura de dependentes para usuários autenticados"
  ON gbp_dependentes
  FOR SELECT
  TO authenticated
  USING (true);

-- Política para permitir UPDATE/DELETE apenas para usuários autenticados
CREATE POLICY "Permitir atualização de moradores para usuários autenticados"
  ON gbp_moradores
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir exclusão de moradores para usuários autenticados"
  ON gbp_moradores
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Permitir atualização de dependentes para usuários autenticados"
  ON gbp_dependentes
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Permitir exclusão de dependentes para usuários autenticados"
  ON gbp_dependentes
  FOR DELETE
  TO authenticated
  USING (true);
