-- Adicionar campo de anexos na tabela gbp_atendimentos
-- Rode este script no Supabase SQL Editor

-- Verificar se a coluna já existe antes de adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'gbp_atendimentos' 
        AND column_name = 'anexos'
    ) THEN
        ALTER TABLE public.gbp_atendimentos 
        ADD COLUMN anexos jsonb DEFAULT '[]'::jsonb;
        
        RAISE NOTICE 'Coluna anexos adicionada com sucesso.';
    ELSE
        RAISE NOTICE 'Coluna anexos já existe.';
    END IF;
END $$;

-- Adicionar comentário na coluna
COMMENT ON COLUMN public.gbp_atendimentos.anexos IS 'Array de URLs dos arquivos anexados ao atendimento (PDF, imagens, etc.)';
