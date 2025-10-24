-- Create table for user agent preferences (which agents to show/hide in sidebar)
CREATE TABLE IF NOT EXISTS agent_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, agent_id)
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_agent_preferences_user ON agent_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_preferences_agent ON agent_preferences(agent_id);

-- Enable RLS
ALTER TABLE agent_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own preferences
CREATE POLICY "Users can view their own agent preferences"
  ON agent_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own agent preferences"
  ON agent_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own agent preferences"
  ON agent_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own agent preferences"
  ON agent_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION handle_agent_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_agent_preferences_updated_at
  BEFORE UPDATE ON agent_preferences
  FOR EACH ROW
  EXECUTE FUNCTION handle_agent_preferences_updated_at();
