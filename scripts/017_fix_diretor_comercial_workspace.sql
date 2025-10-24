-- Atualiza o custom agent "Diretor Comercial" para associá-lo ao workspace correto
UPDATE custom_agents
SET workspace_id = (
  SELECT w.id 
  FROM workspaces w
  INNER JOIN profiles p ON p.id = w.user_id
  WHERE p.id = custom_agents.user_id
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Verifica o resultado
SELECT 
  id,
  name,
  user_id,
  workspace_id,
  created_at
FROM custom_agents
ORDER BY created_at DESC;
