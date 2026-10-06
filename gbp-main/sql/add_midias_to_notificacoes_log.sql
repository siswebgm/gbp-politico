-- Adiciona coluna para suportar multiplos anexos por notificacao
-- midias: JSONB array no formato [{"tipo":"imagem|video|audio|pdf","url":"...","nome":"arquivo.jpg"}]
ALTER TABLE gbp_notificacoes_log
ADD COLUMN IF NOT EXISTS midias JSONB DEFAULT NULL;
