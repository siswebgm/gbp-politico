-- Remove a constraint única do CPF
ALTER TABLE gbp_eleitores DROP CONSTRAINT gbp_eleitores_cpf_key;

-- Criar um novo índice que considera CPF + empresa_id + created_by
CREATE UNIQUE INDEX idx_unique_cpf_per_user 
ON gbp_eleitores(cpf, empresa_id, created_by) 
WHERE deleted_at IS NULL;
