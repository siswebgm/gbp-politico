-- Apaga a função antiga, se existir
DROP FUNCTION IF EXISTS public.get_analise_votacao_candidato(text, text);

-- Cria a nova função com parâmetros nomeados
CREATE OR REPLACE FUNCTION public.get_analise_votacao_candidato(p_tabela text, p_nr_votavel text)
RETURNS TABLE(nm_municipio text, qt_votos bigint)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT "NM_MUNICIPIO", SUM("QT_VOTOS")::bigint AS qt_votos
         FROM public.%I
         WHERE "NR_VOTAVEL" = %L
         GROUP BY "NM_MUNICIPIO"
         ORDER BY SUM("QT_VOTOS") DESC',
        p_tabela,
        p_nr_votavel
    );
END;
$function$;
