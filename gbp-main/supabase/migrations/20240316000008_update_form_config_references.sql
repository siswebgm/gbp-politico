-- Atualizar a referência na tabela gbp_form_config
ALTER TABLE IF EXISTS gbp_form_config 
DROP CONSTRAINT IF EXISTS gbp_form_config_categoria_id_fkey;

ALTER TABLE IF EXISTS gbp_form_config
ADD CONSTRAINT gbp_form_config_categoria_id_fkey
FOREIGN KEY (categoria_id)
REFERENCES gbp_categorias(id)
ON DELETE CASCADE; 