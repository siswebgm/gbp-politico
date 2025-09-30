-- Drop existing constraints if they exist
ALTER TABLE IF EXISTS gbp_eleitores 
DROP CONSTRAINT IF EXISTS fk_eleitores_categoria;

-- Add foreign key constraint for categoria_id
ALTER TABLE gbp_eleitores
ADD CONSTRAINT fk_eleitores_categoria
FOREIGN KEY (categoria_id)
REFERENCES gbp_categorias_eleitor(id)
ON DELETE SET NULL;

-- Create index for categoria_id
CREATE INDEX IF NOT EXISTS idx_eleitores_categoria_id ON gbp_eleitores(categoria_id);