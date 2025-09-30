-- Adiciona as foreign keys na tabela gbp_atendimentos
ALTER TABLE public.gbp_atendimentos
    ADD CONSTRAINT gbp_atendimentos_eleitor_uid_fkey 
    FOREIGN KEY (eleitor_uid) 
    REFERENCES public.gbp_eleitores(uid) 
    ON DELETE CASCADE;

-- Atualiza a consulta para usar o relacionamento correto
COMMENT ON CONSTRAINT gbp_atendimentos_eleitor_uid_fkey ON public.gbp_atendimentos IS 'Relacionamento com a tabela de eleitores'; 