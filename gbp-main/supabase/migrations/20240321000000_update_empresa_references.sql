-- Drop foreign key constraints
ALTER TABLE gbp_atendimentos DROP CONSTRAINT IF EXISTS fk_atendimentos_empresa;
ALTER TABLE gbp_eleitores DROP CONSTRAINT IF EXISTS fk_eleitores_empresa;
ALTER TABLE gbp_indicados DROP CONSTRAINT IF EXISTS gbp_indicados_empresa_id_fkey;
ALTER TABLE gbp_resultados_eleitorais DROP CONSTRAINT IF EXISTS gbp_resultados_eleitorais_empresa_id_fkey;
ALTER TABLE gbp_categorias DROP CONSTRAINT IF EXISTS fk_categorias_empresa;

-- Drop indexes
DROP INDEX IF EXISTS idx_atendimentos_empresa_id;
DROP INDEX IF EXISTS idx_eleitores_empresa_id;
DROP INDEX IF EXISTS idx_indicados_empresa_id;
DROP INDEX IF EXISTS idx_resultados_empresa_id;
DROP INDEX IF EXISTS idx_categorias_empresa_id;

-- Add empresa_uid column to tables
ALTER TABLE gbp_atendimentos 
  ADD COLUMN IF NOT EXISTS empresa_uid UUID,
  DROP COLUMN IF EXISTS empresa_id;

ALTER TABLE gbp_eleitores 
  ADD COLUMN IF NOT EXISTS empresa_uid UUID,
  DROP COLUMN IF EXISTS empresa_id;

ALTER TABLE gbp_indicados 
  ADD COLUMN IF NOT EXISTS empresa_uid UUID,
  DROP COLUMN IF EXISTS empresa_id;

ALTER TABLE gbp_resultados_eleitorais 
  ADD COLUMN IF NOT EXISTS empresa_uid UUID,
  DROP COLUMN IF EXISTS empresa_id;

ALTER TABLE gbp_categorias 
  ADD COLUMN IF NOT EXISTS empresa_uid UUID,
  DROP COLUMN IF EXISTS empresa_id;

-- Add foreign key constraints with UUID type
ALTER TABLE gbp_atendimentos
  ADD CONSTRAINT fk_atendimentos_empresa
  FOREIGN KEY (empresa_uid)
  REFERENCES gbp_empresas(uid)
  ON DELETE CASCADE;

ALTER TABLE gbp_eleitores
  ADD CONSTRAINT fk_eleitores_empresa
  FOREIGN KEY (empresa_uid)
  REFERENCES gbp_empresas(uid)
  ON DELETE CASCADE;

ALTER TABLE gbp_indicados
  ADD CONSTRAINT fk_indicados_empresa
  FOREIGN KEY (empresa_uid)
  REFERENCES gbp_empresas(uid)
  ON DELETE CASCADE;

ALTER TABLE gbp_resultados_eleitorais
  ADD CONSTRAINT fk_resultados_empresa
  FOREIGN KEY (empresa_uid)
  REFERENCES gbp_empresas(uid)
  ON DELETE CASCADE;

ALTER TABLE gbp_categorias
  ADD CONSTRAINT fk_categorias_empresa
  FOREIGN KEY (empresa_uid)
  REFERENCES gbp_empresas(uid)
  ON DELETE CASCADE;

-- Create new indexes for empresa_uid
CREATE INDEX IF NOT EXISTS idx_atendimentos_empresa_uid ON gbp_atendimentos(empresa_uid);
CREATE INDEX IF NOT EXISTS idx_eleitores_empresa_uid ON gbp_eleitores(empresa_uid);
CREATE INDEX IF NOT EXISTS idx_indicados_empresa_uid ON gbp_indicados(empresa_uid);
CREATE INDEX IF NOT EXISTS idx_resultados_empresa_uid ON gbp_resultados_eleitorais(empresa_uid);
CREATE INDEX IF NOT EXISTS idx_categorias_empresa_uid ON gbp_categorias(empresa_uid);

-- Update RLS policies for gbp_resultados_eleitorais
DROP POLICY IF EXISTS "Users can view their company's resultados" ON gbp_resultados_eleitorais;
DROP POLICY IF EXISTS "Users can insert resultados for their company" ON gbp_resultados_eleitorais;
DROP POLICY IF EXISTS "Users can update their company's resultados" ON gbp_resultados_eleitorais;
DROP POLICY IF EXISTS "Users can delete their company's resultados" ON gbp_resultados_eleitorais;

CREATE POLICY "Users can view their company's resultados"
    ON gbp_resultados_eleitorais FOR SELECT
    USING (auth.uid() IN (
        SELECT uid FROM gbp_usuarios WHERE empresa_uid = gbp_resultados_eleitorais.empresa_uid
    ));

CREATE POLICY "Users can insert resultados for their company"
    ON gbp_resultados_eleitorais FOR INSERT
    WITH CHECK (auth.uid() IN (
        SELECT uid FROM gbp_usuarios WHERE empresa_uid = gbp_resultados_eleitorais.empresa_uid
    ));

CREATE POLICY "Users can update their company's resultados"
    ON gbp_resultados_eleitorais FOR UPDATE
    USING (auth.uid() IN (
        SELECT uid FROM gbp_usuarios WHERE empresa_uid = gbp_resultados_eleitorais.empresa_uid
    ))
    WITH CHECK (auth.uid() IN (
        SELECT uid FROM gbp_usuarios WHERE empresa_uid = gbp_resultados_eleitorais.empresa_uid
    ));

CREATE POLICY "Users can delete their company's resultados"
    ON gbp_resultados_eleitorais FOR DELETE
    USING (auth.uid() IN (
        SELECT uid FROM gbp_usuarios WHERE empresa_uid = gbp_resultados_eleitorais.empresa_uid
    )); 