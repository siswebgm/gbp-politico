-- ============================================================================
-- Marketplace - Realtime
-- ============================================================================
-- O Supabase Realtime escuta o WAL (Write-Ahead Log) do Postgres diretamente
-- na tabela FÍSICA onde a escrita ocorre. Como marketplace.mensagens é a
-- tabela real (public.mensagens é apenas uma view-ponte), é ela que deve
-- ser adicionada à publicação "supabase_realtime" — não a view.
--
-- O cliente no frontend deve se inscrever informando schema: "marketplace"
-- (e não "public") no channel do Realtime, pois é isso que aparece no WAL.
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE marketplace.mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace.conversas;

-- Necessário para replicação de UPDATE/DELETE com todos os campos antigos
ALTER TABLE marketplace.mensagens REPLICA IDENTITY FULL;
ALTER TABLE marketplace.conversas REPLICA IDENTITY FULL;
