-- Apaga a função antiga para garantir uma substituição limpa
DROP FUNCTION IF EXISTS public.get_analise_votacao_candidato(text, text);

-- Cria a nova função que retorna também as informações do candidato
CREATE OR REPLACE FUNCTION public.get_analise_votacao_candidato(p_tabela text, p_nr_votavel text)
RETURNS TABLE(
    "NM_MUNICIPIO" text,
    "NR_ZONA" text,
    "NR_SECAO" text,
    "QT_APTOS" bigint,
    "QT_COMPARECIMENTO" bigint,
    "QT_ABSTENCOES" bigint,
    "QT_VOTOS" bigint,
    "NM_VOTAVEL" text,
    "SG_PARTIDO" text,
    "DS_CARGO_PERGUNTA" text
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
            SUM(CAST(t."QT_VOTOS" AS integer))::bigint AS "QT_VOTOS",
            -- Adiciona as informações do candidato (serão as mesmas para todas as linhas)
            MAX(t."NM_VOTAVEL") AS "NM_VOTAVEL",
            MAX(t."SG_PARTIDO") AS "SG_PARTIDO",
            MAX(t."DS_CARGO_PERGUNTA") AS "DS_CARGO_PERGUNTA"
         FROM public.%I AS t
         WHERE t."NR_VOTAVEL" = %L
         GROUP BY t."NM_MUNICIPIO", t."NR_ZONA", t."NR_SECAO"
         ORDER BY t."NM_MUNICIPIO", t."NR_ZONA", t."NR_SECAO"',
        p_tabela,
        p_nr_votavel
    );
END;
$function$;
