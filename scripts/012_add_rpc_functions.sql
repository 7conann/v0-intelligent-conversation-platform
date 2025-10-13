-- Function to increment agent message count
CREATE OR REPLACE FUNCTION increment_agent_message_count(
  p_conversation_id UUID,
  p_agent_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE conversation_agents
  SET 
    message_count = message_count + 1,
    is_used = true
  WHERE conversation_id = p_conversation_id
    AND agent_id = p_agent_id;
  
  -- If no row was updated, insert a new one
  IF NOT FOUND THEN
    INSERT INTO conversation_agents (conversation_id, agent_id, is_selected, is_used, message_count)
    VALUES (p_conversation_id, p_agent_id, false, true, 1);
  END IF;
END;
$$ LANGUAGE plpgsql;
