-- Remover qualquer coluna ou constraint relacionada a empresa_id
ALTER TABLE IF EXISTS gbp_categorias 
  DROP COLUMN IF EXISTS empresa_id,
  DROP CONSTRAINT IF EXISTS fk_categorias_empresa_id;

-- Garantir que empresa_uid existe e é NOT NULL
ALTER TABLE gbp_categorias 
  ALTER COLUMN empresa_uid SET NOT NULL;

-- Recriar a constraint de foreign key usando empresa_uid
ALTER TABLE gbp_categorias 
  ADD CONSTRAINT fk_categorias_empresa 
  FOREIGN KEY (empresa_uid) 
  REFERENCES gbp_empresas(uid) 
  ON DELETE CASCADE;

-- Remover qualquer trigger antigo relacionado a empresa_id
DROP TRIGGER IF EXISTS set_empresa_id_trigger ON gbp_categorias;
DROP FUNCTION IF EXISTS set_empresa_id();

-- Criar trigger para garantir empresa_uid
CREATE OR REPLACE FUNCTION validate_empresa_uid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.empresa_uid IS NULL THEN
        RAISE EXCEPTION 'empresa_uid não pode ser nulo';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_empresa_uid_trigger
    BEFORE INSERT OR UPDATE ON gbp_categorias
    FOR EACH ROW
    EXECUTE FUNCTION validate_empresa_uid();