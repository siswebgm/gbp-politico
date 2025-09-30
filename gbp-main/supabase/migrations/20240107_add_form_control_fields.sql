-- Adiciona as novas colunas à tabela gbp_form_config
ALTER TABLE public.gbp_form_config 
ADD COLUMN IF NOT EXISTS max_registrations INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Atualiza as políticas de segurança para incluir os novos campos
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
