-- Apaga a função antiga para garantir uma substituição limpa
DROP FUNCTION IF EXISTS public.get_analise_votacao_candidato(text, text);

-- Cria a função final e definitiva com a consulta SQL corrigida
CREATE OR REPLACE FUNCTION public.get_analise_votacao_candidato(p_tabela text, p_nr_votavel text)
RETURNS TABLE(
    "NM_MUNICIPIO" text,
    "NR_ZONA" text,
    "NR_SECAO" text,
    "QT_APTOS" bigint,
    "QT_COMPARECIMENTO" bigint,
    "QT_ABSTENCOES" bigint,
    "QT_VOTOS" bigint
)
LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE format(
        'SELECT
            t."NM_MUNICIPIO",
            t."NR_ZONA",
            t."NR_SECAO",
            MAX(CAST(t."QT_APTOS" AS integer))::bigint AS "QT_APTOS",
            MAX(CAST(t."QT_COMPARECIMENTO" AS integer))::bigint AS "QT_COMPARECIMENTO",
            MAX(CAST(t."QT_ABSTENCOES" AS integer))::bigint AS "QT_ABSTENCOES",
            SUM(CAST(t."QT_VOTOS" AS integer))::bigint AS "QT_VOTOS"
         FROM public.%I AS t
         WHERE t."NR_VOTAVEL" = %L
         GROUP BY t."NM_MUNICIPIO", t."NR_ZONA", t."NR_SECAO"
         ORDER BY t."NM_MUNICIPIO", t."NR_ZONA", t."NR_SECAO"',
        p_tabela,
        p_nr_votavel
    );
END;
$function$;
