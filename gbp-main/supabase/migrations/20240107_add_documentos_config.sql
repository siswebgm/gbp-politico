-- Adiciona a coluna documentos_config como JSONB para armazenar a lista de documentos requeridos
ALTER TABLE public.gbp_form_config 
ADD COLUMN IF NOT EXISTS documentos_config JSONB DEFAULT '{"documentos": []}';

-- Atualiza os registros existentes com a estrutura padrão
UPDATE public.gbp_form_config
SET documentos_config = '{"documentos": []}'
WHERE documentos_config IS NULL;

-- Adiciona validação para garantir a estrutura correta do JSON
ALTER TABLE public.gbp_form_config
ADD CONSTRAINT documentos_config_check 
CHECK (
  (documentos_config IS NULL) OR 
  (
    jsonb_typeof(documentos_config->'documentos') = 'array' AND
    (
      SELECT bool_and(
        jsonb_typeof(doc->'id') = 'string' AND
        jsonb_typeof(doc->'nome') = 'string' AND
        jsonb_typeof(doc->'required') = 'boolean'
      )
      FROM jsonb_array_elements(documentos_config->'documentos') doc
    )
  )
);

-- Atualiza as políticas de segurança para incluir o novo campo
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.gbp_form_config;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON public.gbp_form_config;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON public.gbp_form_config;

CREATE POLICY "Enable read access for authenticated users" ON public.gbp_form_config
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.gbp_categorias_eleitor c
            WHERE c.id = categoria_id
            AND c.empresa_id IN (
                SELECT empresa_id FROM public.gbp_usuarios_empresa WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Enable insert access for authenticated users" ON public.gbp_form_config
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.gbp_categorias_eleitor c
            WHERE c.id = categoria_id
            AND c.empresa_id IN (
                SELECT empresa_id FROM public.gbp_usuarios_empresa WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Enable update access for authenticated users" ON public.gbp_form_config
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.gbp_categorias_eleitor c
            WHERE c.id = categoria_id
            AND c.empresa_id IN (
                SELECT empresa_id FROM public.gbp_usuarios_empresa WHERE user_id = auth.uid()
            )
        )
    );

-- Adiciona comentário na coluna para documentação
COMMENT ON COLUMN public.gbp_form_config.documentos_config IS 'Configuração dos documentos necessários para o formulário. Estrutura: {"documentos": [{"id": string, "nome": string, "required": boolean}]}';
