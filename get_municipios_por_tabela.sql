CREATE OR REPLACE FUNCTION get_municipios_por_tabela(p_table_name TEXT)
RETURNS TABLE(municipio TEXT)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validação básica para evitar nomes de tabelas maliciosos ou malformados
    IF p_table_name IS NULL OR p_table_name !~ '^[a-zA-Z0-9_]+$' THEN
        RAISE EXCEPTION 'Nome de tabela inválido: %', p_table_name;
    END IF;

    RETURN QUERY EXECUTE format(
        'SELECT DISTINCT "NM_MUNICIPIO" FROM public.%I ORDER BY "NM_MUNICIPIO" ASC',
        p_table_name
    );
END;
$$;
