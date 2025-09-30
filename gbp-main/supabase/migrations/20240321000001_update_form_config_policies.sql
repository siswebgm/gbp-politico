-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON gbp_form_config;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON gbp_form_config;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON gbp_form_config;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON gbp_form_config;

-- Create new policies using empresa_uid
CREATE POLICY "Enable read access for authenticated users" ON gbp_form_config
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM gbp_categorias c
            WHERE c.id = categoria_id
            AND c.empresa_uid IN (
                SELECT empresa_uid FROM gbp_usuarios WHERE uid = auth.uid()
            )
        )
    );

CREATE POLICY "Enable insert access for authenticated users" ON gbp_form_config
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM gbp_categorias c
            WHERE c.id = categoria_id
            AND c.empresa_uid IN (
                SELECT empresa_uid FROM gbp_usuarios WHERE uid = auth.uid()
            )
        )
    );

CREATE POLICY "Enable update access for authenticated users" ON gbp_form_config
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM gbp_categorias c
            WHERE c.id = categoria_id
            AND c.empresa_uid IN (
                SELECT empresa_uid FROM gbp_usuarios WHERE uid = auth.uid()
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM gbp_categorias c
            WHERE c.id = categoria_id
            AND c.empresa_uid IN (
                SELECT empresa_uid FROM gbp_usuarios WHERE uid = auth.uid()
            )
        )
    );

CREATE POLICY "Enable delete access for authenticated users" ON gbp_form_config
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM gbp_categorias c
            WHERE c.id = categoria_id
            AND c.empresa_uid IN (
                SELECT empresa_uid FROM gbp_usuarios WHERE uid = auth.uid()
            )
        )
    ); 