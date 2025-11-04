-- Add description column to groups table
ALTER TABLE groups
ADD COLUMN IF NOT EXISTS description text;

-- Add a comment to the column
COMMENT ON COLUMN groups.description IS 'Description of the group to help users understand its purpose';

-- Update existing groups with default descriptions (optional)
UPDATE groups
SET description = 'Grupo para agentes de ' || name
WHERE description IS NULL;
