-- Create API logs table to track all message requests and responses
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  
  -- Request data
  request_payload JSONB NOT NULL,
  request_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Response data
  response_body JSONB,
  response_status INTEGER,
  response_timestamp TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  agent_ids TEXT[],
  user_message TEXT,
  assistant_response TEXT,
  error_message TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_conversation_id ON api_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_response_status ON api_logs(response_status);

-- Add RLS policies
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;

-- Added INSERT policies for admins and users
-- Admin can see all logs
CREATE POLICY "Admins can view all logs" ON api_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('kleber.zumiotti@iprocesso.com', 'angelomarchi05@gmail.com')
    )
  );

-- Users can only see their own logs
CREATE POLICY "Users can view own logs" ON api_logs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admin can insert logs for anyone
CREATE POLICY "Admins can insert all logs" ON api_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('kleber.zumiotti@iprocesso.com', 'angelomarchi05@gmail.com')
    )
  );

-- Users can only insert their own logs
CREATE POLICY "Users can insert own logs" ON api_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Added UPDATE policies for admins and users
-- Admin can update all logs
CREATE POLICY "Admins can update all logs" ON api_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.email IN ('kleber.zumiotti@iprocesso.com', 'angelomarchi05@gmail.com')
    )
  );

-- Users can only update their own logs
CREATE POLICY "Users can update own logs" ON api_logs
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
