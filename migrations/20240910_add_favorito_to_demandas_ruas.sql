-- Adiciona a coluna favorito na tabela gbp_demandas_ruas
ALTER TABLE public.gbp_demandas_ruas 
ADD COLUMN favorito BOOLEAN NOT NULL DEFAULT false;

-- Cria um índice para melhorar a performance de buscas por favoritos
CREATE INDEX IF NOT EXISTS idx_gbp_demandas_ruas_favorito 
ON public.gbp_demandas_ruas (favorito);

-- Comentário para documentação
COMMENT ON COLUMN public.gbp_demandas_ruas.favorito IS 'Indica se a demanda foi marcada como favorita pelo usuário';

-- Atualiza a política de segurança para permitir atualização do campo favorito
-- (se estiver usando RLS - Row Level Security)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'gbp_demandas_ruas' AND policyname = 'Permitir atualização de favoritos') THEN
        DROP POLICY "Permitir atualização de favoritos" ON public.gbp_demandas_ruas;
    END IF;
    
    CREATE POLICY "Permitir atualização de favoritos"
    ON public.gbp_demandas_ruas
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    -- Ignora erros caso a política já exista ou não possa ser criada
    RAISE NOTICE 'Não foi possível criar/atualizar a política de segurança: %', SQLERRM;
END $$;
