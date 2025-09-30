-- Arquivo para popular as tabelas de controle de filtro com dados de exemplo

-- Inserir dados apenas se ainda não existirem para evitar duplicatas

DO $$
DECLARE
    v_ano_uid uuid;
    v_uf_uid uuid;
BEGIN
    -- 1. Insere o ano 2022 e obtém o seu UID
    INSERT INTO public.ano_eleicao (ano) VALUES (2022) ON CONFLICT (ano) DO NOTHING;
    SELECT uid INTO v_ano_uid FROM public.ano_eleicao WHERE ano = 2022;

    -- Verifica se o ano foi encontrado ou inserido
    IF v_ano_uid IS NOT NULL THEN
        -- 2. Insere a UF 'PE' para o ano de 2022 e obtém o seu UID
        INSERT INTO public.uf_eleicao (ano_uid, uf) VALUES (v_ano_uid, 'PE') ON CONFLICT DO NOTHING;
        SELECT uid INTO v_uf_uid FROM public.uf_eleicao WHERE ano_uid = v_ano_uid AND uf = 'PE';

        -- Verifica se a UF foi encontrada ou inserida
        IF v_uf_uid IS NOT NULL THEN
            -- 3. Insere o cargo e o nome da tabela para a UF 'PE' no ano de 2022
            INSERT INTO public.cargo_eleicao (uf_uid, nome_cargo, nome_tabela)
            VALUES (v_uf_uid, 'Deputados', 'elecoes_2022_depudados_pe')
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END;
$$;

SELECT 'Dados de exemplo para 2022/PE inseridos com sucesso!' AS status;
