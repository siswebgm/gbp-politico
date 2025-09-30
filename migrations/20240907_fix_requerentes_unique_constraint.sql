-- Migração para corrigir a restrição de unicidade na tabela gbp_requerentes_demanda_rua

-- Primeiro, removemos a restrição de unicidade existente no CPF
ALTER TABLE public.gbp_requerentes_demanda_rua
DROP CONSTRAINT IF EXISTS gbp_requerentes_demanda_rua_cpf_key;

-- Em seguida, adicionamos uma nova restrição de unicidade composta
ALTER TABLE public.gbp_requerentes_demanda_rua
ADD CONSTRAINT gbp_requerentes_demanda_rua_cpf_empresa_uid_key 
UNIQUE (cpf, empresa_uid);

-- Atualizamos o índice existente para incluir empresa_uid também
DROP INDEX IF EXISTS idx_gbp_requerentes_demanda_rua_cpf;

-- Criamos um novo índice composto
CREATE INDEX IF NOT EXISTS idx_gbp_requerentes_demanda_rua_cpf_empresa_uid 
ON public.gbp_requerentes_demanda_rua(cpf, empresa_uid);

-- Comentário explicativo para documentação
COMMENT ON CONSTRAINT gbp_requerentes_demanda_rua_cpf_empresa_uid_key 
ON public.gbp_requerentes_demanda_rua 
IS 'Restrição de unicidade composta que permite o mesmo CPF em empresas diferentes, mas não duplicado na mesma empresa';
