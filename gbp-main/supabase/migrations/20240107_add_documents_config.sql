-- Adiciona a coluna documentos_config como JSONB para armazenar a lista de documentos requeridos
ALTER TABLE public.gbp_form_config 
ADD COLUMN IF NOT EXISTS documentos_config JSONB DEFAULT '{"documentos": []}';

-- Atualiza os registros existentes com a estrutura padrão
UPDATE public.gbp_form_config
SET documentos_config = '{"documentos": []}'
WHERE documentos_config IS NULL;
