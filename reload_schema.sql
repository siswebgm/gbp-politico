-- Força o PostgREST a recarregar o esquema da API para reconhecer novas funções e tabelas.
NOTIFY pgrst, 'reload schema';
