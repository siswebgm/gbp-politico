-- Função para adicionar item ao carrinho (upsert)
CREATE OR REPLACE FUNCTION adicionar_ao_carrinho(
  p_usuario_id UUID,
  p_anuncio_id UUID,
  p_quantidade INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  -- Insere ou atualiza usando ON CONFLICT
  INSERT INTO marketplace.carrinho_itens (usuario_id, anuncio_id, quantidade)
  VALUES (p_usuario_id, p_anuncio_id, p_quantidade)
  ON CONFLICT (usuario_id, anuncio_id)
  DO UPDATE SET 
    quantidade = marketplace.carrinho_itens.quantidade + p_quantidade,
    atualizado_em = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário
COMMENT ON FUNCTION adicionar_ao_carrinho IS 'Adiciona ou atualiza item no carrinho do usuário';
