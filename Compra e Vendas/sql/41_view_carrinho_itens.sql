-- Criar view no schema public que acessa marketplace.carrinho_itens
CREATE OR REPLACE VIEW public.carrinho_itens AS
SELECT * FROM marketplace.carrinho_itens;

-- Permitir operações na view
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carrinho_itens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carrinho_itens TO anon;

-- Comentário
COMMENT ON VIEW public.carrinho_itens IS 'View que expõe marketplace.carrinho_itens no schema public para acesso via Supabase client';
