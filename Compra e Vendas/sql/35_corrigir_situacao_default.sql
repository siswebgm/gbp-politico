-- ============================================================================
-- Corrige o default e a validação da coluna situacao em anuncios
-- ============================================================================
-- Ocorria: "new row for relation 'anuncios' violates check constraint 'products_status_check'"
-- Causa provável: default antigo 'active' ou nulo, após renomear a coluna de status para situacao.

-- Atualiza valores inválidos para 'ativo'
UPDATE marketplace.anuncios
SET situacao = 'ativo'
WHERE situacao IS NULL
   OR situacao NOT IN ('ativo', 'pausado', 'vendido', 'removido');

-- Garante o default correto
ALTER TABLE marketplace.anuncios
  ALTER COLUMN situacao SET DEFAULT 'ativo';

-- Recria o trigger para garantir que novos registros sempre tenham situacao válida
CREATE OR REPLACE FUNCTION marketplace.definir_slug_anuncio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS NULL THEN
    NEW.id := gen_random_uuid();
  END IF;

  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := marketplace.slugify(coalesce(NULLIF(NEW.titulo, ''), 'anuncio'))
                || '-' || substring(NEW.id::text, 1, 8);
  END IF;

  IF NEW.situacao IS NULL
     OR NEW.situacao NOT IN ('ativo', 'pausado', 'vendido', 'removido') THEN
    NEW.situacao := 'ativo';
  END IF;

  RETURN NEW;
END;
$$;
