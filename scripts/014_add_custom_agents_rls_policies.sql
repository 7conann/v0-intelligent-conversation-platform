-- Add RLS policies for custom_agents table
-- Allow workspace members to view custom agents
-- Only allow admins to create custom agents
-- Only allow creator or admins to modify/delete

-- Enable RLS on custom_agents table
ALTER TABLE custom_agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view custom agents in their workspace" ON custom_agents;
DROP POLICY IF EXISTS "Admins can create custom agents" ON custom_agents;
DROP POLICY IF EXISTS "Users can update their own custom agents" ON custom_agents;
DROP POLICY IF EXISTS "Users can delete their own custom agents" ON custom_agents;
DROP POLICY IF EXISTS "Admins can update any custom agent" ON custom_agents;
DROP POLICY IF EXISTS "Admins can delete any custom agent" ON custom_agents;

-- Policy for SELECT: All authenticated users can view custom agents in workspaces they have access to
CREATE POLICY "Users can view custom agents in their workspace"
ON custom_agents
FOR SELECT
TO authenticated
USING (
  workspace_id IN (
    SELECT id FROM workspaces WHERE user_id = auth.uid()
  )
);

-- Policy for INSERT: Only admins can create custom agents
CREATE POLICY "Admins can create custom agents"
ON custom_agents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'kleber.zumiotti@iprocesso.com',
    'angelomarchi05@gmail.com'
  )
);

-- Policy for UPDATE: Users can update their own custom agents
CREATE POLICY "Users can update their own custom agents"
ON custom_agents
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy for UPDATE: Admins can update any custom agent
CREATE POLICY "Admins can update any custom agent"
ON custom_agents
FOR UPDATE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'kleber.zumiotti@iprocesso.com',
    'angelomarchi05@gmail.com'
  )
)
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'kleber.zumiotti@iprocesso.com',
    'angelomarchi05@gmail.com'
  )
);

-- Policy for DELETE: Users can delete their own custom agents
CREATE POLICY "Users can delete their own custom agents"
ON custom_agents
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Policy for DELETE: Admins can delete any custom agent
CREATE POLICY "Admins can delete any custom agent"
ON custom_agents
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' IN (
    'kleber.zumiotti@iprocesso.com',
    'angelomarchi05@gmail.com'
  )
);
