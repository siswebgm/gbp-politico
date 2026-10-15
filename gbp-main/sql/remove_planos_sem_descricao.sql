-- Remover planos sem descrição ou com descrição null
DELETE FROM gbp_planos 
WHERE descricao IS NULL OR descricao = '' OR descricao = 'Sem descrição';
