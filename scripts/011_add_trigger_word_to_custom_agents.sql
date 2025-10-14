-- Add trigger_word column to custom_agents table
ALTER TABLE custom_agents
ADD COLUMN IF NOT EXISTS trigger_word TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN custom_agents.trigger_word IS 'Palavra-chave para ativar o agente customizado (ex: #vendas, #suporte)';
