-- Criação da tabela gbp_requerentes_demanda_rua
CREATE TABLE IF NOT EXISTS public.gbp_requerentes_demanda_rua (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL UNIQUE,
    whatsapp VARCHAR(20) NOT NULL,
    genero VARCHAR(30),
    cep VARCHAR(9),
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    cidade VARCHAR(100),
    uf CHAR(2),
    referencia TEXT,
    empresa_uid UUID NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_empresa_requerente FOREIGN KEY (empresa_uid) 
      REFERENCES public.gbp_empresas(uid) ON DELETE CASCADE
);

-- Adicionar coluna requerente_uid na tabela gbp_demandas_ruas
ALTER TABLE public.gbp_demandas_ruas 
ADD COLUMN IF NOT EXISTS requerente_uid UUID 
  REFERENCES public.gbp_requerentes_demanda_rua(uid) ON DELETE SET NULL;

-- Índices para melhorar buscas
CREATE INDEX IF NOT EXISTS idx_gbp_requerentes_demanda_rua_cpf 
  ON public.gbp_requerentes_demanda_rua(cpf);
  
CREATE INDEX IF NOT EXISTS idx_gbp_requerentes_demanda_rua_empresa_uid 
  ON public.gbp_requerentes_demanda_rua(empresa_uid);

-- Comentários para documentação
COMMENT ON TABLE public.gbp_requerentes_demanda_rua 
  IS 'Tabela para armazenar os dados dos requerentes de demandas de rua';
  
COMMENT ON COLUMN public.gbp_requerentes_demanda_rua.uid 
  IS 'Identificador único do requerente';
  
COMMENT ON COLUMN public.gbp_requerentes_demanda_rua.cpf 
  IS 'CPF do requerente (apenas números)';
  
COMMENT ON COLUMN public.gbp_requerentes_demanda_rua.empresa_uid 
  IS 'Referência à empresa do requerente';

-- Permissões
GRANT ALL ON TABLE public.gbp_requerentes_demanda_rua TO authenticated, service_role;

-- Script para migração de dados (executar após a criação da tabela)
-- 1. Inserir requerentes únicos baseados no CPF
INSERT INTO public.gbp_requerentes_demanda_rua (
    nome, cpf, whatsapp, genero, cep, logradouro, 
    numero, bairro, cidade, uf, referencia, empresa_uid
)
SELECT DISTINCT ON (requerente_cpf)
    requerente_nome, 
    requerente_cpf, 
    requerente_whatsapp, 
    genero, 
    cep, 
    logradouro, 
    numero, 
    bairro, 
    cidade, 
    uf, 
    referencia,
    empresa_uid
FROM public.gbp_demandas_ruas
ON CONFLICT (cpf) DO NOTHING;

-- 2. Atualizar as referências na tabela de demandas
UPDATE public.gbp_demandas_ruas d
SET requerente_uid = r.uid
FROM public.gbp_requerentes_demanda_rua r
WHERE d.requerente_cpf = r.cpf;

-- 3. (Opcional) Remover as colunas duplicadas após confirmar que a migração foi bem-sucedida
-- ALTER TABLE public.gbp_demandas_ruas
-- DROP COLUMN requerente_nome,
-- DROP COLUMN requerente_cpf,
-- DROP COLUMN requerente_whatsapp,
-- DROP COLUMN genero,
-- DROP COLUMN cep,
-- DROP COLUMN logradouro,
-- DROP COLUMN numero,
-- DROP COLUMN bairro,
-- DROP COLUMN cidade,
-- DROP COLUMN uf,
-- DROP COLUMN referencia;
