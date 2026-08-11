-- Criar tabela de avaliações entre usuários
CREATE TABLE IF NOT EXISTS marketplace.avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  avaliador_id uuid NOT NULL REFERENCES marketplace.usuarios(id) ON DELETE CASCADE,
  avaliado_id uuid NOT NULL REFERENCES marketplace.usuarios(id) ON DELETE CASCADE,
  anuncio_id uuid REFERENCES marketplace.anuncios(id) ON DELETE SET NULL,
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  criado_em timestamptz DEFAULT NOW(),
  atualizado_em timestamptz DEFAULT NOW(),
  UNIQUE(avaliador_id, avaliado_id, anuncio_id)
);

CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliado ON marketplace.avaliacoes(avaliado_id);
CREATE INDEX IF NOT EXISTS idx_avaliacoes_avaliador ON marketplace.avaliacoes(avaliador_id);

-- Função que atualiza a média de avaliação do usuário
CREATE OR REPLACE FUNCTION marketplace.atualizar_avaliacao_usuario()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace.usuarios
  SET
    avaliacao = (
      SELECT COALESCE(AVG(nota), 0)
      FROM marketplace.avaliacoes
      WHERE avaliado_id = NEW.avaliado_id
    ),
    total_avaliacoes = (
      SELECT COUNT(*)
      FROM marketplace.avaliacoes
      WHERE avaliado_id = NEW.avaliado_id
    ),
    atualizado_em = NOW()
  WHERE id = NEW.avaliado_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar avaliação após inserção
DROP TRIGGER IF EXISTS trigger_atualizar_avaliacao_insert ON marketplace.avaliacoes;
CREATE TRIGGER trigger_atualizar_avaliacao_insert
  AFTER INSERT ON marketplace.avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION marketplace.atualizar_avaliacao_usuario();

-- Trigger para atualizar avaliação após atualização
DROP TRIGGER IF EXISTS trigger_atualizar_avaliacao_update ON marketplace.avaliacoes;
CREATE TRIGGER trigger_atualizar_avaliacao_update
  AFTER UPDATE ON marketplace.avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION marketplace.atualizar_avaliacao_usuario();

-- Trigger para atualizar avaliação após deleção
DROP TRIGGER IF EXISTS trigger_atualizar_avaliacao_delete ON marketplace.avaliacoes;
CREATE TRIGGER trigger_atualizar_avaliacao_delete
  AFTER DELETE ON marketplace.avaliacoes
  FOR EACH ROW
  EXECUTE FUNCTION marketplace.atualizar_avaliacao_usuario();

-- RLS
ALTER TABLE marketplace.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver avaliações"
  ON marketplace.avaliacoes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuários podem inserir avaliações"
  ON marketplace.avaliacoes
  FOR INSERT
  TO authenticated
  WITH CHECK (avaliador_id = auth.uid());

CREATE POLICY "Usuários podem atualizar próprias avaliações"
  ON marketplace.avaliacoes
  FOR UPDATE
  TO authenticated
  USING (avaliador_id = auth.uid())
  WITH CHECK (avaliador_id = auth.uid());

CREATE POLICY "Usuários podem deletar próprias avaliações"
  ON marketplace.avaliacoes
  FOR DELETE
  TO authenticated
  USING (avaliador_id = auth.uid());

COMMENT ON TABLE marketplace.avaliacoes IS 'Avaliações entre usuários para produtos e serviços';
