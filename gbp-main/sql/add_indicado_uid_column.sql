-- Adicionar coluna indicado_uid na tabela gbp_eleitores
-- Esta coluna armazena o UID do eleitor que indicou este cadastro

-- Verificar se a coluna já existe antes de adicionar
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'gbp_eleitores' 
        AND column_name = 'indicado_uid'
    ) THEN
        -- Adicionar a coluna indicado_uid
        ALTER TABLE public.gbp_eleitores 
        ADD COLUMN indicado_uid uuid NULL;

        -- Adicionar comentário na coluna
        COMMENT ON COLUMN public.gbp_eleitores.indicado_uid IS 'UID do eleitor que indicou este cadastro';

        -- Criar índice para melhorar performance de consultas
        CREATE INDEX IF NOT EXISTS idx_eleitores_indicado_uid 
        ON public.gbp_eleitores(indicado_uid);

        -- Adicionar foreign key (opcional, se quiser garantir integridade referencial)
        -- ALTER TABLE public.gbp_eleitores 
        -- ADD CONSTRAINT fk_eleitores_indicado 
        -- FOREIGN KEY (indicado_uid) 
        -- REFERENCES public.gbp_eleitores(uid) 
        -- ON DELETE SET NULL;

        RAISE NOTICE 'Coluna indicado_uid adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Coluna indicado_uid já existe.';
    END IF;
END $$;
