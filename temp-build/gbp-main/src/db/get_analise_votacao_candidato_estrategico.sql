-- Apaga a função antiga para evitar conflitos
DROP FUNCTION IF EXISTS public.get_analise_votacao_candidato(text, text);

-- Cria a nova função com análise estratégica por zona e seção
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
            "NM_MUNICIPIO",
            "NR_ZONA",
            "NR_SECAO",
            -- Usamos MAX pois os valores de aptos, comparecimento e abstenções são por seção e se repetem
            MAX(CAST("QT_APTOS" AS integer)) AS "QT_APTOS",
            MAX(CAST("QT_COMPARECIMENTO" AS integer)) AS "QT_COMPARECIMENTO",
            MAX(CAST("QT_ABSTENCOES" AS integer)) AS "QT_ABSTENCOES",
            SUM(CAST("QT_VOTOS" AS integer)) AS "QT_VOTOS"
         FROM public.%I
         WHERE "NR_VOTAVEL" = %L
         GROUP BY "NM_MUNICIPIO", "NR_ZONA", "NR_SECAO"
         ORDER BY "NM_MUNICIPIO", "NR_ZONA", "NR_SECAO"',
        p_tabela,
        p_nr_votavel
    );
END;
$function$;
