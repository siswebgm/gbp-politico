-- ============================================================================
-- Marketplace - Views
-- ============================================================================
-- Views auxiliares para simplificar consultas do frontend.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Produtos com dados agregados (imagem principal, vendedor, categoria)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW marketplace.anuncios_publicos AS
SELECT
  p.id,
  p.titulo,
  p.slug,
  p.descricao,
  p.preco,
  p.condicao,
  p.quantidade,
  p.cidade,
  p.condominio,
  p.endereco,
  p.latitude,
  p.longitude,
  p.visualizacoes,
  p.situacao,
  p.destaque,
  p.negociavel,
  p.aceita_troca,
  p.video_url,
  p.criado_em,
  p.atualizado_em,
  c.id   AS categoria_id,
  c.nome AS categoria_nome,
  c.slug AS categoria_slug,
  sc.id   AS subcategoria_id,
  sc.nome AS subcategoria_nome,
  sc.slug AS subcategoria_slug,
  u.id       AS vendedor_id,
  u.nome     AS vendedor_nome,
  u.slug     AS vendedor_slug,
  u.foto_url AS vendedor_foto_url,
  u.cidade     AS vendedor_cidade,
  u.avaliacao   AS vendedor_avaliacao,
  (
    SELECT pi.url
    FROM marketplace.anuncio_imagens pi
    WHERE pi.anuncio_id = p.id
    ORDER BY pi.ordem ASC, pi.criado_em ASC
    LIMIT 1
  ) AS capa_url,
  (
    SELECT count(*)
    FROM marketplace.anuncio_imagens pi
    WHERE pi.anuncio_id = p.id
  ) AS total_imagens
FROM marketplace.anuncios p
LEFT JOIN marketplace.categorias c ON c.id = p.categoria_id
LEFT JOIN marketplace.subcategorias sc ON sc.id = p.subcategoria_id
LEFT JOIN marketplace.usuarios u ON u.id = p.usuario_id
WHERE p.situacao = 'ativo';

COMMENT ON VIEW marketplace.anuncios_publicos IS 'Produtos ativos com dados agregados de categoria, vendedor e imagem de capa';

-- ----------------------------------------------------------------------------
-- Perfil público do vendedor (contagens agregadas)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW marketplace.perfis_vendedores AS
SELECT
  u.id,
  u.slug,
  u.nome,
  u.foto_url,
  u.biografia,
  u.cidade,
  u.estado,
  u.avaliacao,
  u.total_avaliacoes,
  u.criado_em,
  count(p.id) FILTER (WHERE p.situacao = 'ativo') AS total_anuncios_ativos,
  count(p.id) FILTER (WHERE p.situacao = 'vendido')   AS total_anuncios_vendidos
FROM marketplace.usuarios u
LEFT JOIN marketplace.anuncios p ON p.usuario_id = u.id
WHERE u.situacao = 'ativo'
GROUP BY u.id;

COMMENT ON VIEW marketplace.perfis_vendedores IS 'Dados públicos e estatísticas de cada vendedor';

-- ----------------------------------------------------------------------------
-- Salas de chat com última mensagem
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW marketplace.conversas_com_ultima_mensagem AS
SELECT
  cr.id,
  cr.anuncio_id,
  cr.comprador_id,
  cr.vendedor_id,
  cr.criado_em,
  cr.ultima_mensagem_em,
  p.titulo      AS anuncio_titulo,
  p.slug       AS anuncio_slug,
  (
    SELECT pi.url
    FROM marketplace.anuncio_imagens pi
    WHERE pi.anuncio_id = p.id
    ORDER BY pi.ordem ASC
    LIMIT 1
  ) AS anuncio_imagem_url,
  lm.conteudo    AS ultima_mensagem_conteudo,
  lm.remetente_id  AS ultima_mensagem_remetente_id,
  lm.criado_em AS ultima_mensagem_criado_em,
  (
    SELECT count(*)
    FROM marketplace.mensagens m
    WHERE m.conversa_id = cr.id AND m.lida_em IS NULL
  ) AS nao_lidas
FROM marketplace.conversas cr
JOIN marketplace.anuncios p ON p.id = cr.anuncio_id
LEFT JOIN LATERAL (
  SELECT conteudo, remetente_id, criado_em
  FROM marketplace.mensagens
  WHERE conversa_id = cr.id
  ORDER BY criado_em DESC
  LIMIT 1
) lm ON true;

COMMENT ON VIEW marketplace.conversas_com_ultima_mensagem IS 'Salas de chat com preview da última mensagem e contagem de não lidas';
