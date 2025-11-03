-- Fix Diretor Comercial custom agent to be in group "6. Resultado"
UPDATE custom_agents
SET group_name = '6. Resultado'
WHERE name = 'Diretor Comercial'
  AND workspace_id = 'a73f38cd-8ec3-4c42-82e4-4388b9e0ea0f';

-- Verify the update
SELECT id, name, group_name, icon, color
FROM custom_agents
WHERE name = 'Diretor Comercial';
