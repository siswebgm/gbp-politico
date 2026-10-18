-- Adiciona FK de gbp_assinaturas -> gbp_planos (hoje não existe,
-- o que quebra embeds PostgREST como select=*,gbp_planos(*)).
-- Execute no Supabase SQL Editor. Opcional — o código atual já
-- busca o plano em query separada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'gbp_assinaturas_plano_id_fkey'
  ) THEN
    ALTER TABLE gbp_assinaturas
      ADD CONSTRAINT gbp_assinaturas_plano_id_fkey
      FOREIGN KEY (plano_id) REFERENCES gbp_planos(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Recarrega o schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
