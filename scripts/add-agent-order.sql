-- Add order column to agents table for drag and drop ordering
ALTER TABLE agents ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Add order column to custom_agents table for drag and drop ordering
ALTER TABLE custom_agents ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Update existing agents with sequential order
UPDATE agents SET "order" = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM agents
) AS subquery
WHERE agents.id = subquery.id;

-- Update existing custom_agents with sequential order
UPDATE custom_agents SET "order" = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM custom_agents
) AS subquery
WHERE custom_agents.id = subquery.id;
