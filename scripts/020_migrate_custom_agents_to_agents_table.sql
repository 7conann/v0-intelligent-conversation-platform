-- Migrate custom agents to use the main agents table instead of custom_agents table
-- This simplifies the architecture by having all agents in one table

-- Step 1: Add workspace_id and user_id columns to agents table if they don't exist
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Step 2: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_agents_workspace_id ON agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);

-- Step 3: Migrate existing custom_agents to agents table
INSERT INTO agents (
  id,
  name,
  description,
  trigger_word,
  color,
  icon,
  workspace_id,
  user_id,
  is_system,
  "order",
  created_at
)
SELECT 
  id,
  name,
  description,
  trigger_word,
  color,
  icon,
  workspace_id,
  user_id,
  false as is_system,
  "order",
  created_at
FROM custom_agents
ON CONFLICT (id) DO NOTHING;

-- Step 4: Update RLS policies for agents table to handle custom agents
DROP POLICY IF EXISTS "Users can view agents in their workspace" ON agents;
DROP POLICY IF EXISTS "Users can create custom agents" ON agents;
DROP POLICY IF EXISTS "Users can update their own custom agents" ON agents;
DROP POLICY IF EXISTS "Users can delete their own custom agents" ON agents;

-- Enable RLS on agents table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view default (system) agents
CREATE POLICY "Everyone can view system agents"
ON agents FOR SELECT
USING (is_system = true OR workspace_id IS NULL);

-- Policy: Users can view custom agents in their workspace
CREATE POLICY "Users can view custom agents in their workspace"
ON agents FOR SELECT
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE user_id = auth.uid()
  )
);

-- Policy: Users can create custom agents in their workspace
CREATE POLICY "Users can create custom agents"
ON agents FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT id FROM workspaces WHERE user_id = auth.uid()
  )
  AND user_id = auth.uid()
  AND is_system = false
);

-- Policy: Users can update their own custom agents
CREATE POLICY "Users can update their own custom agents"
ON agents FOR UPDATE
USING (user_id = auth.uid() AND is_system = false)
WITH CHECK (user_id = auth.uid() AND is_system = false);

-- Policy: Users can delete their own custom agents
CREATE POLICY "Users can delete their own custom agents"
ON agents FOR DELETE
USING (user_id = auth.uid() AND is_system = false);

-- Step 5: Add comment explaining the new structure
COMMENT ON COLUMN agents.workspace_id IS 'NULL for system/default agents, set for custom agents';
COMMENT ON COLUMN agents.user_id IS 'User who created the custom agent (NULL for system agents)';
