-- Apaga as funções antigas para evitar conflitos
DROP FUNCTION IF EXISTS public.get_analise_votacao_candidato(text, text);

-- Cria a função final com os nomes de coluna corretos (maiúsculas)
CREATE OR REPLACE FUNCTION public.get_analise_votacao_candidato(p_tabela text, p_nr_votavel text)
-- Define a tabela de retorno com os nomes em maiúsculas
RETURNS TABLE("NM_MUNICIPIO" text, "QT_VOTOS" bigint)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE format(
        -- Usa "AS" com nomes de coluna entre aspas para preservar as maiúsculas
        'SELECT "NM_MUNICIPIO", SUM(CAST("QT_VOTOS" AS integer)) AS "QT_VOTOS"
         FROM public.%I
         WHERE "NR_VOTAVEL" = %L
         GROUP BY "NM_MUNICIPIO"
         ORDER BY SUM(CAST("QT_VOTOS" AS integer)) DESC',
        p_tabela,
        p_nr_votavel
    );
END;
$function$;
