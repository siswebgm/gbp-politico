-- Criação da tabela de participantes se não existir
CREATE TABLE IF NOT EXISTS public.ps_gbp_participantes (
    uid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    faixa_etaria TEXT,
    cep TEXT,
    cidade TEXT,
    bairro TEXT,
    numero TEXT,
    complemento TEXT,
    dados_completos JSONB NOT NULL DEFAULT '{}'::jsonb,
    empresa_uid UUID REFERENCES public.gbp_empresas(uid) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para melhorar o desempenho
CREATE INDEX IF NOT EXISTS idx_participantes_empresa_uid ON public.ps_gbp_participantes(empresa_uid);
CREATE INDEX IF NOT EXISTS idx_participantes_telefone ON public.ps_gbp_participantes(telefone);
CREATE INDEX IF NOT EXISTS idx_participantes_email ON public.ps_gbp_participantes(email);

-- Adicionar coluna participante_uid à tabela de respostas se não existir
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'ps_gbp_respostas' 
                  AND column_name = 'participante_uid') THEN
        ALTER TABLE public.ps_gbp_respostas
        ADD COLUMN participante_uid UUID REFERENCES public.ps_gbp_participantes(uid) ON DELETE CASCADE;
    END IF;
END $$;

-- Criar função para atualizar o timestamp de atualização
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar o campo updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_participantes_updated_at') THEN
        CREATE TRIGGER update_participantes_updated_at
        BEFORE UPDATE ON public.ps_gbp_participantes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Criar política de segurança de linha (RLS) se necessário
ALTER TABLE public.ps_gbp_participantes ENABLE ROW LEVEL SECURITY;

-- Exemplo de política (ajuste conforme necessário)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ps_gbp_participantes' AND policyname = 'Permitir leitura para usuários da empresa') THEN
        CREATE POLICY "Permitir leitura para usuários da empresa"
        ON public.ps_gbp_participantes
        FOR SELECT
        USING (auth.uid() IN (
            SELECT uid FROM public.gbp_usuarios 
            WHERE empresa_uid = ps_gbp_participantes.empresa_uid
        ));
    END IF;
END $$;

-- Função para migrar dados existentes (executar uma vez após a implantação)
CREATE OR REPLACE FUNCTION migrar_dados_participantes()
RETURNS void AS $$
DECLARE
    resposta_record RECORD;
    participante_uid UUID;
    dados_participante JSONB;
BEGIN
    -- Para cada resposta existente, criar um registro na tabela de participantes se não existir
    FOR resposta_record IN SELECT * FROM public.ps_gbp_respostas WHERE participante_uid IS NULL LOOP
        -- Extrair dados do participante da resposta
        dados_participante := jsonb_build_object(
            'nome', resposta_record.participante_nome,
            'telefone', resposta_record.participante_telefone,
            'faixa_etaria', resposta_record.participante_faixa_etaria,
            'cep', resposta_record.participante_cep,
            'cidade', resposta_record.participante_cidade,
            'bairro', resposta_record.participante_bairro,
            'numero', resposta_record.participante_numero,
            'complemento', resposta_record.participante_complemento,
            'dados_completos', COALESCE(resposta_record.participante_dados, '{}'::jsonb)
        );
        
        -- Inserir participante se não existir com base no telefone (ou outro identificador único)
        IF resposta_record.participante_telefone IS NOT NULL THEN
            INSERT INTO public.ps_gbp_participantes (
                nome, telefone, email, faixa_etaria, cep, cidade, bairro, 
                numero, complemento, dados_completos, empresa_uid, created_at
            )
            SELECT 
                resposta_record.participante_nome,
                resposta_record.participante_telefone,
                NULL, -- email pode ser adicionado se disponível
                resposta_record.participante_faixa_etaria,
                resposta_record.participante_cep,
                resposta_record.participante_cidade,
                resposta_record.participante_bairro,
                resposta_record.participante_numero,
                resposta_record.participante_complemento,
                COALESCE(resposta_record.participante_dados, '{}'::jsonb),
                resposta_record.empresa_uid,
                COALESCE(resposta_record.created_at, NOW())
            WHERE NOT EXISTS (
                SELECT 1 FROM public.ps_gbp_participantes 
                WHERE telefone = resposta_record.participante_telefone
                AND empresa_uid = resposta_record.empresa_uid
            )
            RETURNING uid INTO participante_uid;
            
            -- Se o participante já existir, obter o UID existente
            IF participante_uid IS NULL THEN
                SELECT uid INTO participante_uid 
                FROM public.ps_gbp_participantes 
                WHERE telefone = resposta_record.participante_telefone
                AND empresa_uid = resposta_record.empresa_uid;
            END IF;
            
            -- Atualizar a resposta com o UID do participante
            IF participante_uid IS NOT NULL THEN
                UPDATE public.ps_gbp_respostas
                SET participante_uid = participante_uid
                WHERE ctid = resposta_record.ctid; -- Usando ctid para identificar unicamente a linha
            END IF;
        END IF;
    END LOOP;
    
    -- Remover colunas desnecessárias após a migração (opcional, descomente se desejar remover as colunas)
    -- ALTER TABLE public.ps_gbp_respostas
    -- DROP COLUMN IF EXISTS participante_nome,
    -- DROP COLUMN IF EXISTS participante_telefone,
    -- DROP COLUMN IF EXISTS participante_faixa_etaria,
    -- DROP COLUMN IF EXISTS participante_cep,
    -- DROP COLUMN IF EXISTS participante_cidade,
    -- DROP COLUMN IF EXISTS participante_bairro,
    -- DROP COLUMN IF EXISTS participante_numero,
    -- DROP COLUMN IF EXISTS participante_complemento,
    -- DROP COLUMN IF EXISTS participante_dados;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Executar a migração (descomente esta linha para executar a migração)
-- SELECT migrar_dados_participantes();

-- Função para obter ou criar um participante (útil para a aplicação)
CREATE OR REPLACE FUNCTION obter_ou_criar_participante(
    p_nome TEXT,
    p_telefone TEXT,
    p_email TEXT,
    p_faixa_etaria TEXT,
    p_cep TEXT,
    p_cidade TEXT,
    p_bairro TEXT,
    p_numero TEXT,
    p_complemento TEXT,
    p_dados_completos JSONB,
    p_empresa_uid UUID
)
RETURNS UUID AS $$
DECLARE
    v_participante_uid UUID;
BEGIN
    -- Tentar encontrar um participante existente com base no telefone
    SELECT uid INTO v_participante_uid
    FROM public.ps_gbp_participantes
    WHERE telefone = p_telefone
    AND empresa_uid = p_empresa_uid
    LIMIT 1;
    
    -- Se não encontrado, criar um novo
    IF v_participante_uid IS NULL THEN
        INSERT INTO public.ps_gbp_participantes (
            nome, telefone, email, faixa_etaria, cep, cidade, bairro, 
            numero, complemento, dados_completos, empresa_uid
        )
        VALUES (
            p_nome, p_telefone, p_email, p_faixa_etaria, p_cep, p_cidade, p_bairro,
            p_numero, p_complemento, p_dados_completos, p_empresa_uid
        )
        RETURNING uid INTO v_participante_uid;
    END IF;
    
    RETURN v_participante_uid;
END;
$$ LANGUAGE plpgsql;
