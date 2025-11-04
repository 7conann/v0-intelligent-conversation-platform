-- Fix agent group assignments
-- This script updates all agents with 'Geral' group to their correct groups based on naming patterns

-- Update agents with "= Visão E+I" pattern to group "1. Visão e Educação"
UPDATE agents
SET group_name = '1. Visão e Educação'
WHERE (name LIKE '%Visão E+I%' OR name LIKE '%Visão e Educação%')
  AND (group_name = 'Geral' OR group_name IS NULL);

-- Update agents with "= Orientador E+I" pattern to group "2. Orientador e Assistente"
UPDATE agents
SET group_name = '2. Orientador e Assistente'
WHERE (name LIKE '%Orientador E+I%' OR name LIKE '%Orientador e Assistente%')
  AND (group_name = 'Geral' OR group_name IS NULL);

-- Update agents with "= Agente E+I" pattern to group "3. Agente (faz por você)"
UPDATE agents
SET group_name = '3. Agente (faz por você)'
WHERE (name LIKE '%Agente E+I%' OR name LIKE '%faz por você%')
  AND (group_name = 'Geral' OR group_name IS NULL);

-- Update agents with "= Clone E+I" pattern to group "4. Clone (faz o papel do outro)"
UPDATE agents
SET group_name = '4. Clone (faz o papel do outro)'
WHERE (name LIKE '%Clone E+I%' OR name LIKE '%faz o papel%')
  AND (group_name = 'Geral' OR group_name IS NULL);

-- Update agents with "= Automação E+I" pattern to group "5. Automação"
UPDATE agents
SET group_name = '5. Automação'
WHERE (name LIKE '%Automação E+I%' OR name LIKE '%Automação%')
  AND (group_name = 'Geral' OR group_name IS NULL);

-- Update agents with "= Resultado E+I" pattern to group "6. Resultado"
UPDATE agents
SET group_name = '6. Resultado'
WHERE (name LIKE '%Resultado E+I%' OR name LIKE '%Resultado%')
  AND (group_name = 'Geral' OR group_name IS NULL);

-- Show the results
SELECT name, group_name, is_active
FROM agents
ORDER BY group_name, display_order;
