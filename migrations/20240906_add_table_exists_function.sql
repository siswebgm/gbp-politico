-- Função para verificar se uma tabela existe
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
