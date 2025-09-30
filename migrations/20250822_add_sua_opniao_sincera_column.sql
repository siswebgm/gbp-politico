-- Adiciona a coluna opiniao_sincera na tabela ps_gbp_respostas
ALTER TABLE public.ps_gbp_respostas 
ADD COLUMN IF NOT EXISTS opiniao_sincera TEXT;

-- Comentário para documentar a nova coluna
COMMENT ON COLUMN public.ps_gbp_respostas.opiniao_sincera IS 'Campo para armazenar a opinião sincera do participante sobre o candidato';

-- Cria um índice para melhorar buscas por conteúdo da opinião
CREATE INDEX IF NOT EXISTS idx_ps_gbp_respostas_opiniao_sincera 
ON public.ps_gbp_respostas USING GIN (to_tsvector('portuguese', COALESCE(opiniao_sincera, '')));
