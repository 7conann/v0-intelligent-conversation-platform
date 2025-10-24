-- Fix existing custom_agents that have NULL workspace_id
-- This script will update all custom_agents with NULL workspace_id
-- to use the workspace_id from the user's first workspace

UPDATE custom_agents
SET workspace_id = (
  SELECT id 
  FROM workspaces 
  WHERE workspaces.user_id = custom_agents.user_id 
  LIMIT 1
)
WHERE workspace_id IS NULL;

-- Verify the update
SELECT 
  ca.id,
  ca.name,
  ca.user_id,
  ca.workspace_id,
  w.name as workspace_name
FROM custom_agents ca
LEFT JOIN workspaces w ON w.id = ca.workspace_id
ORDER BY ca.created_at DESC;
