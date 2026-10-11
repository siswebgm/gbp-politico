-- Permite "documentos livres" dentro das pastas personalizadas:
-- itens criados pelo usuário diretamente na pasta (título + observação),
-- sem vínculo com documentos dos módulos.
--
-- Mudanças em gbp_documentos_pasta_itens:
--   1. documento_uid passa a aceitar NULL (item livre não aponta para doc existente)
--   2. documento_tipo passa a aceitar 'livre' (além dos 4 tipos de módulo)
--   3. novas colunas titulo e observacao
--
-- A UNIQUE(pasta_uid, documento_tipo, documento_uid) continua valendo:
-- NULLs nunca conflitam, então itens livres podem ser adicionados à vontade.

ALTER TABLE gbp_documentos_pasta_itens
  ALTER COLUMN documento_uid DROP NOT NULL;

ALTER TABLE gbp_documentos_pasta_itens
  DROP CONSTRAINT IF EXISTS gbp_documentos_pasta_itens_documento_tipo_check;

ALTER TABLE gbp_documentos_pasta_itens
  ADD CONSTRAINT gbp_documentos_pasta_itens_documento_tipo_check
  CHECK (documento_tipo IN ('oficio', 'projeto_lei', 'requerimento', 'emenda', 'livre'));

ALTER TABLE gbp_documentos_pasta_itens
  ADD COLUMN IF NOT EXISTS titulo TEXT;

ALTER TABLE gbp_documentos_pasta_itens
  ADD COLUMN IF NOT EXISTS observacao TEXT;

-- Anexo opcional do item (arquivo enviado pelo usuário)
ALTER TABLE gbp_documentos_pasta_itens
  ADD COLUMN IF NOT EXISTS arquivo_url TEXT;

ALTER TABLE gbp_documentos_pasta_itens
  ADD COLUMN IF NOT EXISTS arquivo_nome TEXT;

ALTER TABLE gbp_documentos_pasta_itens
  ADD COLUMN IF NOT EXISTS arquivo_path TEXT;

-- Anexos múltiplos: array JSONB [{url, nome, path}] — até 3 arquivos por item
ALTER TABLE gbp_documentos_pasta_itens
  ADD COLUMN IF NOT EXISTS arquivos JSONB DEFAULT '[]'::jsonb;

-- Migra anexos antigos (colunas únicas) para o array
UPDATE gbp_documentos_pasta_itens
SET arquivos = jsonb_build_array(
  jsonb_build_object('url', arquivo_url, 'nome', arquivo_nome, 'path', arquivo_path)
)
WHERE arquivo_url IS NOT NULL
  AND (arquivos IS NULL OR arquivos = '[]'::jsonb);
