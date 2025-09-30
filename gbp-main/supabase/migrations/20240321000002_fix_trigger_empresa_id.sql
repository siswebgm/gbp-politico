-- Drop o trigger antigo que usa empresa_id
DROP TRIGGER IF EXISTS set_empresa_id_trigger ON gbp_categorias;
DROP FUNCTION IF EXISTS set_empresa_id();

-- Criar nova função para set_empresa_uid
CREATE OR REPLACE FUNCTION set_empresa_uid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.empresa_uid IS NULL THEN
        RAISE EXCEPTION 'empresa_uid não pode ser nulo';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar novo trigger usando empresa_uid
CREATE TRIGGER set_empresa_uid_trigger
    BEFORE INSERT ON gbp_categorias
    FOR EACH ROW
    EXECUTE FUNCTION set_empresa_uid(); 