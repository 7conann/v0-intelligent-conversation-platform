-- Habilitar RLS na tabela agents se ainda não estiver habilitado
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura de agentes para usuários autenticados" ON agents;
DROP POLICY IF EXISTS "Permitir atualização de agentes para usuários autenticados" ON agents;

-- Criar política para permitir leitura de todos os agentes para usuários autenticados
CREATE POLICY "Permitir leitura de agentes para usuários autenticados"
ON agents
FOR SELECT
TO authenticated
USING (true);

-- Criar política para permitir atualização de trigger_word para usuários autenticados
CREATE POLICY "Permitir atualização de agentes para usuários autenticados"
ON agents
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
