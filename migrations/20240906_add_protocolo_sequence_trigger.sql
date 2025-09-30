-- Create a function to generate the next protocol number for a company
CREATE OR REPLACE FUNCTION public.gerar_numero_protocolo(empresa_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
    ultimo_protocolo NUMERIC;
    proximo_numero NUMERIC;
BEGIN
    -- Get the highest protocol number for the company
    SELECT COALESCE(MAX(numero_protocolo), 0) 
    INTO ultimo_protocolo
    FROM public.gbp_demandas_ruas
    WHERE empresa_uid = empresa_uuid;
    
    -- Increment the last protocol number
    proximo_numero := ultimo_protocolo + 1;
    
    RETURN proximo_numero;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger function to set the protocol number before insert
CREATE OR REPLACE FUNCTION public.set_numero_protocolo()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set the protocol number if it's not already set
    IF NEW.numero_protocolo IS NULL THEN
        NEW.numero_protocolo := public.gerar_numero_protocolo(NEW.empresa_uid);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trg_set_numero_protocolo
BEFORE INSERT ON public.gbp_demandas_ruas
FOR EACH ROW
EXECUTE FUNCTION public.set_numero_protocolo();

-- Update existing records with protocol numbers if needed
DO $$
DECLARE
    empresa_record RECORD;
BEGIN
    -- For each company, update existing records with sequential numbers
    FOR empresa_record IN SELECT DISTINCT empresa_uid FROM public.gbp_demandas_ruas ORDER BY empresa_uid
    LOOP
        UPDATE public.gbp_demandas_ruas
        SET numero_protocolo = subquery.rownum
        FROM (
            SELECT 
                uid,
                ROW_NUMBER() OVER (ORDER BY criado_em) as rownum
            FROM public.gbp_demandas_ruas
            WHERE empresa_uid = empresa_record.empresa_uid
            ORDER BY criado_em
        ) AS subquery
        WHERE public.gbp_demandas_ruas.uid = subquery.uid
        AND public.gbp_demandas_ruas.empresa_uid = empresa_record.empresa_uid;
    END LOOP;
END $$;
