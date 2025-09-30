-- Arquivo com as novas funções RPC para a arquitetura de filtros baseada em tabelas

-- 1. Função para buscar todos os anos de eleição disponíveis
CREATE OR REPLACE FUNCTION public.get_anos_eleicao()
RETURNS TABLE(uid uuid, ano integer)
LANGUAGE sql
AS $$
    SELECT uid, ano FROM public.ano_eleicao ORDER BY ano DESC;
$$;

-- 2. Função para buscar as UFs disponíveis para um ano específico (usando o UID do ano)
CREATE OR REPLACE FUNCTION public.get_ufs_por_ano(p_ano_uid uuid)
RETURNS TABLE(uid uuid, uf character varying)
LANGUAGE sql
AS $$
    SELECT uid, uf FROM public.uf_eleicao WHERE ano_uid = p_ano_uid ORDER BY uf;
$$;

-- 3. Função para buscar os cargos disponíveis para uma UF específica (usando o UID da UF)
CREATE OR REPLACE FUNCTION public.get_cargos_por_uf(p_uf_uid uuid)
RETURNS TABLE(uid uuid, nome_cargo text, nome_tabela text)
LANGUAGE sql
AS $$
    SELECT uid, nome_cargo, nome_tabela FROM public.cargo_eleicao WHERE uf_uid = p_uf_uid ORDER BY nome_cargo;
$$;

-- É necessário recarregar o esquema do PostgREST para que ele reconheça as novas funções
NOTIFY pgrst, 'reload schema';

SELECT 'Novas funções de filtro (get_anos_eleicao, get_ufs_por_ano, get_cargos_por_uf) criadas com sucesso!' AS status;
