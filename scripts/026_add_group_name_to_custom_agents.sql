-- Add group_name column to custom_agents table
ALTER TABLE custom_agents
ADD COLUMN IF NOT EXISTS group_name TEXT;

-- Add a comment to the column
COMMENT ON COLUMN custom_agents.group_name IS 'The group this custom agent belongs to';

-- Update existing custom agent "Diretor Comercial" to be in group "6. Resultado"
UPDATE custom_agents
SET group_name = '6. Resultado'
WHERE name = 'Diretor Comercial';
