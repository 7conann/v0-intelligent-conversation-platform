-- Atualiza custom_agents com workspace_id NULL para associá-los ao workspace do usuário criador
-- Este script corrige agentes customizados que foram criados antes da correção do código

UPDATE custom_agents ca
SET workspace_id = w.id
FROM workspaces w
WHERE ca.workspace_id IS NULL
  AND ca.user_id = w.user_id;

-- Verifica os resultados
SELECT 
  ca.id,
  ca.name,
  ca.user_id,
  ca.workspace_id,
  w.name as workspace_name
FROM custom_agents ca
LEFT JOIN workspaces w ON ca.workspace_id = w.id
ORDER BY ca.created_at DESC;
