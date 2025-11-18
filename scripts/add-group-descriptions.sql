-- Script para adicionar descrições aos grupos existentes (caso necessário)
-- A coluna 'description' já existe na tabela 'groups'

-- Exemplos de como adicionar descrições aos grupos existentes:

-- UPDATE groups SET description = 'Agentes especializados em marketing e comunicação' WHERE name = 'Marketing';
-- UPDATE groups SET description = 'Agentes focados em vendas e relacionamento com clientes' WHERE name = 'Vendas';
-- UPDATE groups SET description = 'Agentes de suporte técnico e atendimento ao cliente' WHERE name = 'Suporte';

-- Para verificar todos os grupos e suas descrições:
SELECT id, name, icon, description, display_order, created_at 
FROM groups 
ORDER BY display_order;

-- Caso precise adicionar a coluna description (mas ela já existe no seu banco):
-- ALTER TABLE groups ADD COLUMN IF NOT EXISTS description TEXT;
