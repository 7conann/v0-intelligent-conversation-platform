-- Adicionar políticas RLS para a tabela agents
-- Permitir INSERT apenas para emails autorizados
-- Permitir SELECT e UPDATE para todos os usuários autenticados

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "Allow authorized users to insert agents" ON agents;
DROP POLICY IF EXISTS "Allow authenticated users to view agents" ON agents;
DROP POLICY IF EXISTS "Allow authenticated users to update agents" ON agents;

-- Política para SELECT: todos os usuários autenticados podem ver agentes
CREATE POLICY "Allow authenticated users to view agents"
ON agents
FOR SELECT
TO authenticated
USING (true);

-- Política para UPDATE: todos os usuários autenticados podem atualizar agentes
CREATE POLICY "Allow authenticated users to update agents"
ON agents
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para INSERT: apenas emails autorizados podem criar novos agentes
CREATE POLICY "Allow authorized users to insert agents"
ON agents
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' IN (
    'kleber.zumiotti@iprocesso.com',
    'angelomarchi05@gmail.com'
  )
);

-- Garantir que RLS está habilitado
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
