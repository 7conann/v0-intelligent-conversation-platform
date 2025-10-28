-- Add fields for agent management: grouping, soft delete, and ordering
-- This allows agents to be organized, deactivated instead of deleted, and reordered

-- Add is_active field for soft delete (default true for existing agents)
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add group_name field for grouping agents
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS group_name text DEFAULT 'Geral';

-- Add display_order field for custom ordering (separate from the 'order' field)
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 0;

-- Update existing agents to have sequential display_order based on current order
UPDATE agents
SET display_order = COALESCE("order", 0)
WHERE display_order = 0;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);
CREATE INDEX IF NOT EXISTS idx_agents_group_name ON agents(group_name);
CREATE INDEX IF NOT EXISTS idx_agents_display_order ON agents(display_order);

-- Verify the changes
SELECT 
  name,
  is_active,
  group_name,
  display_order,
  "order"
FROM agents
ORDER BY display_order;
