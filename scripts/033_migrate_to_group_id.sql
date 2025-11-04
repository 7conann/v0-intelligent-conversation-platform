-- Migration: Change agents.group_name to agents.group_id with foreign key
-- This ensures referential integrity and allows group names to change without breaking relationships

-- Step 1: Add the new group_id column (nullable)
ALTER TABLE public.agents 
ADD COLUMN IF NOT EXISTS group_id uuid;

-- Step 2: Migrate existing data - match group_name to groups.name and set group_id
UPDATE public.agents a
SET group_id = g.id
FROM public.groups g
WHERE a.group_name = g.name;

-- Step 3: For any agents still without a group_id (those with 'Geral' or invalid group_name),
-- set them to the first group (1. Visão e Educação) as default
UPDATE public.agents
SET group_id = (
  SELECT id FROM public.groups 
  WHERE name = '1. Visão e Educação' 
  LIMIT 1
)
WHERE group_id IS NULL AND group_name IS NOT NULL AND group_name != '';

-- Removed NOT NULL constraint to allow agents without groups
-- Step 4: Keep group_id as nullable (agents can exist without a group)
-- ALTER TABLE public.agents 
-- ALTER COLUMN group_id SET NOT NULL;

-- Updated foreign key to CASCADE delete instead of SET NULL
-- Step 5: Add foreign key constraint with ON DELETE SET NULL
ALTER TABLE public.agents
DROP CONSTRAINT IF EXISTS fk_agents_group_id;

ALTER TABLE public.agents
ADD CONSTRAINT fk_agents_group_id 
FOREIGN KEY (group_id) 
REFERENCES public.groups(id) 
ON DELETE SET NULL;

-- Step 6: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_agents_group_id 
ON public.agents(group_id);

-- Step 7: Drop the old group_name column (optional - comment out if you want to keep it for backward compatibility)
-- ALTER TABLE public.agents DROP COLUMN IF EXISTS group_name;

-- Step 8: Also update custom_agents table to use group_id
ALTER TABLE public.custom_agents 
ADD COLUMN IF NOT EXISTS group_id uuid;

UPDATE public.custom_agents ca
SET group_id = g.id
FROM public.groups g
WHERE ca.group_name = g.name;

-- Set default group for custom agents without a valid group
UPDATE public.custom_agents
SET group_id = (
  SELECT id FROM public.groups 
  WHERE name = '1. Visão e Educação' 
  LIMIT 1
)
WHERE group_id IS NULL AND group_name IS NOT NULL AND group_name != '';

-- Updated foreign key for custom_agents to SET NULL on delete
ALTER TABLE public.custom_agents
DROP CONSTRAINT IF EXISTS fk_custom_agents_group_id;

ALTER TABLE public.custom_agents
ADD CONSTRAINT fk_custom_agents_group_id 
FOREIGN KEY (group_id) 
REFERENCES public.groups(id) 
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_custom_agents_group_id 
ON public.custom_agents(group_id);

-- Verification queries (optional - run these to check the migration)
-- SELECT a.name, a.group_name, g.name as new_group_name 
-- FROM agents a 
-- LEFT JOIN groups g ON a.group_id = g.id 
-- LIMIT 20;
