-- Migrate custom agents from custom_agents table to agents table
-- This script copies custom agents to the main agents table so everything is in one place

-- First, let's see what custom agents exist
-- SELECT * FROM custom_agents;

-- Insert custom agents into the agents table
-- We'll use a high order number (100+) to ensure they appear after default agents
INSERT INTO agents (
  id,
  name,
  trigger_word,
  description,
  is_system,
  "order",
  created_at,
  updated_at
)
SELECT 
  id,
  name,
  trigger_word,
  description,
  false as is_system,  -- Custom agents are not system agents
  100 + ROW_NUMBER() OVER (ORDER BY created_at) as "order",  -- Start at 100 for custom agents
  created_at,
  NOW() as updated_at
FROM custom_agents
WHERE id NOT IN (SELECT id FROM agents)  -- Only insert if not already in agents table
ON CONFLICT (id) DO NOTHING;  -- Skip if already exists

-- Verify the migration
SELECT 
  'agents' as table_name,
  COUNT(*) as count,
  string_agg(name, ', ') as agent_names
FROM agents
UNION ALL
SELECT 
  'custom_agents' as table_name,
  COUNT(*) as count,
  string_agg(name, ', ') as agent_names
FROM custom_agents;
