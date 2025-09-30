-- Arquivo de Setup para a nova arquitetura de filtros de eleição

-- Tabela 1: Armazena os anos de eleição disponíveis
CREATE TABLE IF NOT EXISTS public.ano_eleicao (
    uid uuid NOT NULL DEFAULT gen_random_uuid(),
    ano integer NOT NULL,
    CONSTRAINT ano_eleicao_pkey PRIMARY KEY (uid),
    CONSTRAINT ano_eleicao_ano_key UNIQUE (ano)
);

-- Tabela 2: Armazena as UFs disponíveis para cada ano
CREATE TABLE IF NOT EXISTS public.uf_eleicao (
    uid uuid NOT NULL DEFAULT gen_random_uuid(),
    ano_uid uuid NOT NULL,
    uf character varying(2) NOT NULL,
    CONSTRAINT uf_eleicao_pkey PRIMARY KEY (uid),
    CONSTRAINT uf_eleicao_ano_uid_fkey FOREIGN KEY (ano_uid) REFERENCES public.ano_eleicao(uid) ON DELETE CASCADE
);

-- Tabela 3: Armazena os cargos e a tabela de dados correspondente para cada UF/Ano
CREATE TABLE IF NOT EXISTS public.cargo_eleicao (
    uid uuid NOT NULL DEFAULT gen_random_uuid(),
    uf_uid uuid NOT NULL,
    nome_cargo text NOT NULL, -- Ex: 'Deputados Federais'
    nome_tabela text NOT NULL, -- Ex: 'elecoes_2022_depudados_pe'
    CONSTRAINT cargo_eleicao_pkey PRIMARY KEY (uid),
    CONSTRAINT cargo_eleicao_uf_uid_fkey FOREIGN KEY (uf_uid) REFERENCES public.uf_eleicao(uid) ON DELETE CASCADE
);

-- Mensagem de sucesso
SELECT 'Tabelas de controle de filtro (ano_eleicao, uf_eleicao, cargo_eleicao) criadas com sucesso!' AS status;
