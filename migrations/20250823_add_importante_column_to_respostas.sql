-- Adiciona a coluna importante na tabela ps_gbp_respostas
ALTER TABLE public.ps_gbp_respostas 
ADD COLUMN IF NOT EXISTS importante BOOLEAN NOT NULL DEFAULT FALSE;

-- Cria um índice para melhorar buscas por opiniões importantes
CREATE INDEX IF NOT EXISTS idx_ps_gbp_respostas_importante 
ON public.ps_gbp_respostas(importante) 
WHERE importante = TRUE;

-- Função para marcar/desmarcar uma opinião como importante
CREATE OR REPLACE FUNCTION public.marcar_opiniao_importante(
    p_resposta_uid UUID,
    p_importante BOOLEAN
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $$
BEGIN
    UPDATE public.ps_gbp_respostas 
    SET importante = p_importante
    WHERE uid = p_resposta_uid;
    
    RETURN FOUND;
END;
$$;

-- Permissões para a função
GRANT EXECUTE ON FUNCTION public.marcar_opiniao_importante(UUID, BOOLEAN) TO authenticated;

-- Comentário para documentar a nova coluna
COMMENT ON COLUMN public.ps_gbp_respostas.importante IS 'Indica se a opinião foi marcada como importante pelo administrador';
