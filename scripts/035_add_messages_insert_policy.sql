-- Add INSERT policy for messages table
-- This allows authenticated users to insert their own messages

-- Enable RLS if not already enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing INSERT policy if exists
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
DROP POLICY IF EXISTS "Allow insert messages" ON messages;

-- Create INSERT policy for authenticated users
-- Users can insert messages in conversations they own
CREATE POLICY "Users can insert their own messages" 
ON messages FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE conversations.id = messages.conversation_id 
    AND conversations.user_id = auth.uid()
  )
);

-- Admin policy for INSERT
DROP POLICY IF EXISTS "Admins can insert any message" ON messages;

CREATE POLICY "Admins can insert any message" 
ON messages FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.email IN ('kleber.zumiotti@iprocesso.com', 'angelomarchi05@gmail.com')
  )
);
