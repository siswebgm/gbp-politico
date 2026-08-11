-- Criar tabela de itens do carrinho
create table if not exists marketplace.carrinho_itens (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references marketplace.usuarios(id) on delete cascade,
  anuncio_id uuid not null references marketplace.anuncios(id) on delete cascade,
  quantidade integer not null default 1 check (quantidade > 0),
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now(),
  unique(usuario_id, anuncio_id)
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_carrinho_usuario ON marketplace.carrinho_itens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_carrinho_anuncio ON marketplace.carrinho_itens(anuncio_id);

-- Trigger para atualizar atualizado_em
CREATE OR REPLACE FUNCTION marketplace.atualizar_carrinho_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_carrinho_timestamp
  BEFORE UPDATE ON marketplace.carrinho_itens
  FOR EACH ROW
  EXECUTE FUNCTION marketplace.atualizar_carrinho_timestamp();

-- RLS (Row Level Security)
ALTER TABLE marketplace.carrinho_itens ENABLE ROW LEVEL SECURITY;

-- Política: usuários podem ver apenas seus próprios itens do carrinho
CREATE POLICY "Usuários podem ver seus próprios itens do carrinho"
  ON marketplace.carrinho_itens
  FOR SELECT
  USING (usuario_id = auth.uid());

-- Política: usuários podem inserir itens no próprio carrinho
CREATE POLICY "Usuários podem adicionar itens ao próprio carrinho"
  ON marketplace.carrinho_itens
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- Política: usuários podem atualizar seus próprios itens do carrinho
CREATE POLICY "Usuários podem atualizar seus próprios itens do carrinho"
  ON marketplace.carrinho_itens
  FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Política: usuários podem deletar seus próprios itens do carrinho
CREATE POLICY "Usuários podem deletar seus próprios itens do carrinho"
  ON marketplace.carrinho_itens
  FOR DELETE
  USING (usuario_id = auth.uid());

-- Comentários
COMMENT ON TABLE marketplace.carrinho_itens IS 'Itens do carrinho de compras dos usuários';
COMMENT ON COLUMN marketplace.carrinho_itens.usuario_id IS 'ID do usuário dono do carrinho';
COMMENT ON COLUMN marketplace.carrinho_itens.anuncio_id IS 'ID do anúncio/produto no carrinho';
COMMENT ON COLUMN marketplace.carrinho_itens.quantidade IS 'Quantidade do produto no carrinho';
