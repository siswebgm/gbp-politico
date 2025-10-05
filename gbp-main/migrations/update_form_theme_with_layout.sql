-- Atualização do form_theme para incluir novos campos de layout
-- Este script atualiza os registros existentes com os valores padrão

-- Atualizar todos os registros existentes que têm form_theme
UPDATE gbp_form_config
SET form_theme = (
  form_theme::jsonb 
  || '{"logoSize": 250, "logoX": 85, "logoY": 50, "textSize": 48, "textX": 45, "textY": 50, "textFontFamily": "Verdana, sans-serif", "textAlignMode": "center"}'::jsonb
)::json
WHERE form_theme IS NOT NULL;

-- Atualizar registros que não têm form_theme (criar o objeto completo)
UPDATE gbp_form_config
SET form_theme = '{
  "primaryColor": "#1976d2",
  "backgroundColor": "#f5f5f5",
  "subtitle": "Registre suas informações",
  "subtitleColor": "#666666",
  "logoSize": 250,
  "logoX": 85,
  "logoY": 50,
  "textSize": 48,
  "textX": 45,
  "textY": 50,
  "textFontFamily": "Verdana, sans-serif",
  "textAlignMode": "center"
}'::json
WHERE form_theme IS NULL;

-- Verificar os resultados
SELECT 
  id,
  form_title,
  form_theme->'logoSize' as logo_size,
  form_theme->'logoX' as logo_x,
  form_theme->'logoY' as logo_y,
  form_theme->'textSize' as text_size,
  form_theme->'textX' as text_x,
  form_theme->'textY' as text_y,
  form_theme->'textFontFamily' as text_font,
  form_theme->'textAlignMode' as text_align
FROM gbp_form_config
WHERE form_theme IS NOT NULL
LIMIT 10;
