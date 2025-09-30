-- Criação da tabela gbp_demandas_ruas
CREATE TABLE IF NOT EXISTS public.gbp_demandas_ruas (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_uid UUID NOT NULL,
    tipo_de_demanda VARCHAR(100) NOT NULL,
    descricao_do_problema TEXT NOT NULL,
    nivel_de_urgencia VARCHAR(10) CHECK (nivel_de_urgencia IN ('baixa', 'média', 'alta')) DEFAULT 'média',
    requerente_nome VARCHAR(255) NOT NULL,
    requerente_cpf VARCHAR(14) NOT NULL,
    requerente_whatsapp VARCHAR(20) NOT NULL,
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(20),
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    uf CHAR(2) NOT NULL,
    cep VARCHAR(9) NOT NULL,
    referencia TEXT,
    boletim_ocorrencia VARCHAR(3) DEFAULT 'não',
    link_da_demanda TEXT,
    fotos_do_problema TEXT[],
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido', 'cancelado')),
    observacoes TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    aceite_termos BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_empresa FOREIGN KEY (empresa_uid) REFERENCES public.gbp_empresas(uid) ON DELETE CASCADE
);

-- Índices para melhorar consultas comuns
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_empresa_uid ON public.gbp_demandas_ruas(empresa_uid);
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_criado_em ON public.gbp_demandas_ruas(criado_em);
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_status ON public.gbp_demandas_ruas(status);

-- Comentários para documentação
COMMENT ON TABLE public.gbp_demandas_ruas IS 'Tabela para armazenar as demandas de manutenção de ruas';
COMMENT ON COLUMN public.gbp_demandas_ruas.uid IS 'Identificador único da demanda';
COMMENT ON COLUMN public.gbp_demandas_ruas.empresa_uid IS 'Referência à empresa responsável pela demanda';
COMMENT ON COLUMN public.gbp_demandas_ruas.tipo_de_demanda IS 'Tipo da demanda (ex: buraco, iluminação, etc)';
COMMENT ON COLUMN public.gbp_demandas_ruas.status IS 'Status atual da demanda (pendente, em_andamento, concluido, cancelado)';

-- Permissões
GRANT ALL ON TABLE public.gbp_demandas_ruas TO authenticated, service_role;
GRANT ALL ON SEQUENCE public.gbp_demandas_ruas_uid_seq TO authenticated, service_role;
