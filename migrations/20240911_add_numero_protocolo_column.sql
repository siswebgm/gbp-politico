-- Adicionar a coluna numero_protocolo à tabela gbp_demandas_ruas
ALTER TABLE public.gbp_demandas_ruas 
ADD COLUMN IF NOT EXISTS numero_protocolo INTEGER;

-- Criar uma sequência para gerar números de protocolo
CREATE SEQUENCE IF NOT EXISTS public.numero_protocolo_seq
    INCREMENT 1
    START 1
    MINVALUE 1
    NO MAXVALUE
    CACHE 1;

-- Atualizar registros existentes com números sequenciais
DO $$
DECLARE
    empresa_record RECORD;
    contador INTEGER := 1;
BEGIN
    -- Para cada empresa, atualizar registros existentes com números sequenciais
    FOR empresa_record IN SELECT DISTINCT empresa_uid FROM public.gbp_demandas_ruas ORDER BY empresa_uid
    LOOP
        -- Atualizar registros existentes com números sequenciais para a empresa atual
        UPDATE public.gbp_demandas_ruas
        SET numero_protocolo = subquery.rownum
        FROM (
            SELECT 
                uid,
                ROW_NUMBER() OVER (ORDER BY criado_em) as rownum
            FROM public.gbp_demandas_ruas
            WHERE empresa_uid = empresa_record.empresa_uid
        ) subquery
        WHERE public.gbp_demandas_ruas.uid = subquery.uid
        AND public.gbp_demandas_ruas.empresa_uid = empresa_record.empresa_uid;
        
        -- Atualizar o contador para a próxima empresa
        contador := contador + 1;
    END LOOP;
END $$;

-- Atualizar a sequência para o próximo número disponível
SELECT setval('public.numero_protocolo_seq', COALESCE((SELECT MAX(numero_protocolo) FROM public.gbp_demandas_ruas), 1));

-- Criar uma função para gerar o próximo número de protocolo para uma empresa
CREATE OR REPLACE FUNCTION public.gerar_numero_protocolo(empresa_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    ultimo_protocolo INTEGER;
    proximo_numero INTEGER;
BEGIN
    -- Obter o maior número de protocolo para a empresa
    SELECT COALESCE(MAX(numero_protocolo), 0) 
    INTO ultimo_protocolo
    FROM public.gbp_demandas_ruas
    WHERE empresa_uid = empresa_uuid;
    
    -- Incrementar o último número de protocolo
    proximo_numero := ultimo_protocolo + 1;
    
    RETURN proximo_numero;
END;
$$ LANGUAGE plpgsql;

-- Criar uma função de trigger para definir o número do protocolo antes da inserção
CREATE OR REPLACE FUNCTION public.set_numero_protocolo()
RETURNS TRIGGER AS $$
BEGIN
    -- Definir o número do protocolo apenas se não estiver definido
    IF NEW.numero_protocolo IS NULL THEN
        NEW.numero_protocolo := public.gerar_numero_protocolo(NEW.empresa_uid);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar o trigger
CREATE OR REPLACE TRIGGER trg_set_numero_protocolo
BEFORE INSERT ON public.gbp_demandas_ruas
FOR EACH ROW
EXECUTE FUNCTION public.set_numero_protocolo();

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.gbp_demandas_ruas.numero_protocolo IS 'Número sequencial de protocolo único por empresa';

-- Atualizar permissões
GRANT USAGE ON SEQUENCE public.numero_protocolo_seq TO authenticated, service_role;
