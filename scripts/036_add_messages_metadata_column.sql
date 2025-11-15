-- Add metadata column to messages table for storing attachment information
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add comment to explain the column
COMMENT ON COLUMN messages.metadata IS 'Stores attachment information and other message metadata';
