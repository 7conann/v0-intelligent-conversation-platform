-- Create groups table to store group metadata (icon, order)
-- This allows each group to have its own icon and custom ordering

CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  icon text NOT NULL DEFAULT '📁',
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_groups_display_order ON groups(display_order);
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);

-- Insert default "Geral" group
INSERT INTO groups (name, icon, display_order)
VALUES ('Geral', '📁', 0)
ON CONFLICT (name) DO NOTHING;

-- Insert existing groups from agents table
INSERT INTO groups (name, icon, display_order)
SELECT DISTINCT 
  group_name,
  '📁' as icon,
  ROW_NUMBER() OVER (ORDER BY group_name) as display_order
FROM agents
WHERE group_name IS NOT NULL 
  AND group_name != 'Geral'
  AND group_name NOT IN (SELECT name FROM groups)
ON CONFLICT (name) DO NOTHING;

-- Verify the groups
SELECT * FROM groups ORDER BY display_order;
