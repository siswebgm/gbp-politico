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
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Habilitar RLS (Row Level Security) na tabela
ALTER TABLE public.gbp_demandas_ruas ENABLE ROW LEVEL SECURITY;

-- Política para permitir inserção de qualquer usuário autenticado
CREATE POLICY "Permitir inserção de demandas por qualquer usuário autenticado" 
ON public.gbp_demandas_ruas
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Política para permitir leitura das próprias demandas
CREATE POLICY "Permitir leitura das próprias demandas" 
ON public.gbp_demandas_ruas
FOR SELECT 
TO authenticated
USING (auth.uid() = empresa_uid::text);

-- Política para permitir atualização apenas pelo dono
CREATE POLICY "Permitir atualização pelo dono" 
ON public.gbp_demandas_ruas
FOR UPDATE 
TO authenticated
USING (auth.uid() = empresa_uid::text)
WITH CHECK (auth.uid() = empresa_uid::text);

-- Política para permitir deleção apenas pelo dono
CREATE POLICY "Permitir deleção pelo dono" 
ON public.gbp_demandas_ruas
FOR DELETE 
TO authenticated
USING (auth.uid() = empresa_uid::text);

-- Função para verificar se uma tabela existe (necessária para o código TypeScript)
CREATE OR REPLACE FUNCTION public.table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    result boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = $1
    ) INTO result;
    
    RETURN result;
END;
$$;

-- Conceder permissões para a função
GRANT EXECUTE ON FUNCTION public.table_exists(text) TO authenticated, service_role;
