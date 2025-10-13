-- Seed default agents if they don't exist
-- Using proper UUIDs instead of simple integers
-- Added trigger_word, description, and is_system columns to satisfy NOT NULL constraints
INSERT INTO agents (id, name, icon, color, trigger_word, description, is_system, created_at)
VALUES 
  ('a0000000-0000-0000-0000-000000000001'::uuid, 'Estratégia', '🎯', '#a78bfa', 'estrategia', 'Especialista em planejamento estratégico e tomada de decisões', true, NOW()),
  ('a0000000-0000-0000-0000-000000000002'::uuid, 'Dados', '📊', '#60a5fa', 'dados', 'Especialista em análise de dados e insights', true, NOW()),
  ('a0000000-0000-0000-0000-000000000003'::uuid, 'RH', '👥', '#34d399', 'rh', 'Especialista em recursos humanos e gestão de pessoas', true, NOW()),
  ('a0000000-0000-0000-0000-000000000004'::uuid, 'Finanças', '💰', '#fbbf24', 'financas', 'Especialista em finanças e planejamento financeiro', true, NOW()),
  ('a0000000-0000-0000-0000-000000000005'::uuid, 'Marketing', '📱', '#f472b6', 'marketing', 'Especialista em marketing e estratégias de comunicação', true, NOW()),
  ('a0000000-0000-0000-0000-000000000006'::uuid, 'Vendas', '🎁', '#fb923c', 'vendas', 'Especialista em vendas e relacionamento com clientes', true, NOW())
ON CONFLICT (id) DO NOTHING;
