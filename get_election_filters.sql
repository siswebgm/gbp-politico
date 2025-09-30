-- Drop a função se ela já existir para garantir a atualização.
DROP FUNCTION IF EXISTS public.get_election_filters(p_ano_eleicao integer);

CREATE OR REPLACE FUNCTION public.get_election_filters(p_ano_eleicao integer)
 RETURNS TABLE(uf text, cargo text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    table_rec record;
    v_uf text;
    v_cargo_type text;
    v_table_name text;
BEGIN
    -- Itera sobre todas as tabelas no esquema 'public' que correspondem ao padrão de nome.
    FOR table_rec IN 
        SELECT table_name 
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name ~ ('^eleicoes_' || p_ano_eleicao || '_.*_..$')
    LOOP
        v_table_name := table_rec.table_name;

        -- Extrai a sigla do estado (UF) do final do nome da tabela.
        v_uf := right(v_table_name, 2);

        -- Retorna um registro com a UF e o nome da tabela para o cargo.
        -- O nome da tabela é usado como um identificador para o tipo de cargo.
        RETURN QUERY SELECT v_uf, v_table_name;
    END LOOP;

    RETURN;
END;
$function$;

-- Exemplo de como chamar a função (para teste no editor SQL):
-- SELECT * FROM public.get_election_filters(2024);
