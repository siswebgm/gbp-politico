-- Tabela para múltiplos conteúdos de aniversário por empresa
-- Mantém compatibilidade com colunas antigas em gbp_empresas para n8n

CREATE TABLE IF NOT EXISTS public.gbp_aniversario_conteudos (
  uid uuid NOT NULL DEFAULT gen_random_uuid(),
  empresa_uid uuid NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('texto', 'imagem', 'video', 'audio')),
  conteudo text,
  bloco integer DEFAULT 0, -- Agrupa conteúdos do mesmo bloco
  ordem integer DEFAULT 0,
  ativo boolean DEFAULT true,
  genero text NULL, -- 'Masculino', 'Feminino', 'Outro', NULL = todos
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT gbp_aniversario_conteudos_pkey PRIMARY KEY (uid),
  CONSTRAINT gbp_aniversario_conteudos_empresa_uid_fkey 
    FOREIGN KEY (empresa_uid) 
    REFERENCES public.gbp_empresas(uid) 
    ON DELETE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_aniversario_conteudos_empresa 
  ON public.gbp_aniversario_conteudos(empresa_uid);

CREATE INDEX IF NOT EXISTS idx_aniversario_conteudos_empresa_tipo 
  ON public.gbp_aniversario_conteudos(empresa_uid, tipo, ordem);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_aniversario_conteudos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aniversario_conteudos_updated_at ON public.gbp_aniversario_conteudos;
CREATE TRIGGER trg_aniversario_conteudos_updated_at
  BEFORE UPDATE ON public.gbp_aniversario_conteudos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_aniversario_conteudos_updated_at();

-- Migrar dados existentes de gbp_empresas para a nova tabela
-- Isso garante que empresas existentes tenham seus conteúdos migrados
INSERT INTO public.gbp_aniversario_conteudos (empresa_uid, tipo, conteudo, ordem, ativo)
SELECT 
  uid as empresa_uid,
  'texto' as tipo,
  texto_aniversario as conteudo,
  0 as ordem,
  true as ativo
FROM public.gbp_empresas
WHERE texto_aniversario IS NOT NULL 
  AND texto_aniversario != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.gbp_aniversario_conteudos 
    WHERE empresa_uid = gbp_empresas.uid AND tipo = 'texto'
  );

INSERT INTO public.gbp_aniversario_conteudos (empresa_uid, tipo, conteudo, ordem, ativo)
SELECT 
  uid as empresa_uid,
  'imagem' as tipo,
  imagem_aniversario as conteudo,
  0 as ordem,
  true as ativo
FROM public.gbp_empresas
WHERE imagem_aniversario IS NOT NULL 
  AND imagem_aniversario != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.gbp_aniversario_conteudos 
    WHERE empresa_uid = gbp_empresas.uid AND tipo = 'imagem'
  );

INSERT INTO public.gbp_aniversario_conteudos (empresa_uid, tipo, conteudo, ordem, ativo)
SELECT 
  uid as empresa_uid,
  'video' as tipo,
  video_aniversario as conteudo,
  0 as ordem,
  true as ativo
FROM public.gbp_empresas
WHERE video_aniversario IS NOT NULL 
  AND video_aniversario != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.gbp_aniversario_conteudos 
    WHERE empresa_uid = gbp_empresas.uid AND tipo = 'video'
  );

INSERT INTO public.gbp_aniversario_conteudos (empresa_uid, tipo, conteudo, ordem, ativo)
SELECT 
  uid as empresa_uid,
  'audio' as tipo,
  audio_aniversario as conteudo,
  0 as ordem,
  true as ativo
FROM public.gbp_empresas
WHERE audio_aniversario IS NOT NULL 
  AND audio_aniversario != ''
  AND NOT EXISTS (
    SELECT 1 FROM public.gbp_aniversario_conteudos 
    WHERE empresa_uid = gbp_empresas.uid AND tipo = 'audio'
  );

-- Comentários
COMMENT ON TABLE public.gbp_aniversario_conteudos IS 'Múltiplos conteúdos de mensagem de aniversário por empresa';
COMMENT ON COLUMN public.gbp_aniversario_conteudos.tipo IS 'Tipo do conteúdo: texto, imagem, video ou audio';
COMMENT ON COLUMN public.gbp_aniversario_conteudos.conteudo IS 'URL do arquivo ou texto da mensagem';
COMMENT ON COLUMN public.gbp_aniversario_conteudos.ordem IS 'Ordem de exibição/envio';
COMMENT ON COLUMN public.gbp_aniversario_conteudos.ativo IS 'Se o conteúdo está ativo para envio';
