-- Apaga as funções antigas, se existirem
DROP FUNCTION IF EXISTS public.get_analise_votacao_candidato(text, text);

-- Cria a nova função com a correção do tipo de dado para a soma
CREATE OR REPLACE FUNCTION public.get_analise_votacao_candidato(p_tabela text, p_nr_votavel text)
RETURNS TABLE(nm_municipio text, qt_votos bigint)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE format(
        -- Adicionado CAST para converter a coluna de votos para integer antes de somar
        'SELECT "NM_MUNICIPIO", SUM(CAST("QT_VOTOS" AS integer)) AS qt_votos
         FROM public.%I
         WHERE "NR_VOTAVEL" = %L
         GROUP BY "NM_MUNICIPIO"
         ORDER BY SUM(CAST("QT_VOTOS" AS integer)) DESC',
        p_tabela,
        p_nr_votavel
    );
END;
$function$;
