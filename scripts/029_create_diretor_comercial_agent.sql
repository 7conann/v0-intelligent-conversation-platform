-- Create Diretor Comercial agent in the agents table and assign to group "6. Resultado"

INSERT INTO agents (
  id,
  name,
  description,
  icon,
  color,
  trigger_word,
  group_name,
  is_active,
  is_system,
  "order",
  display_order,
  created_at
)
VALUES (
  '69b748fb-344b-4b8f-8b4e-0222eded0358',
  'Diretor Comercial',
  'Diretor Comercial',
  '🏢',
  '#8b5cf6',
  '#diretorcomercial',
  '6. Resultado',
  true,
  false,
  1,
  1,
  NOW()
)
ON CONFLICT (id) 
DO UPDATE SET
  group_name = '6. Resultado',
  name = 'Diretor Comercial',
  description = 'Diretor Comercial',
  icon = '🏢',
  color = '#8b5cf6',
  trigger_word = '#diretorcomercial',
  is_active = true;
