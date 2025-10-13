-- Create agents table (system-defined agents)
create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  icon text not null,
  color text not null,
  trigger_word text not null,
  is_system boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS (agents are readable by all authenticated users)
alter table public.agents enable row level security;

create policy "Authenticated users can view agents"
  on public.agents for select
  using (auth.role() = 'authenticated');

-- Insert default agents
insert into public.agents (name, description, icon, color, trigger_word) values
  ('Estratégia', 'Agente especializado em estratégia e planejamento', 'BarChart3', '#a855f7', 'estrategia'),
  ('Tecnologia', 'Agente especializado em tecnologia e desenvolvimento', 'Code', '#06b6d4', 'tecnologia'),
  ('Dados', 'Agente especializado em análise de dados', 'Database', '#10b981', 'dados'),
  ('RH', 'Agente especializado em recursos humanos', 'Users', '#f59e0b', 'rh'),
  ('Finanças', 'Agente especializado em finanças', 'DollarSign', '#ef4444', 'financas'),
  ('Marketing', 'Agente especializado em marketing', 'Megaphone', '#ec4899', 'marketing'),
  ('Vendas', 'Agente especializado em vendas', 'TrendingUp', '#8b5cf6', 'vendas'),
  ('Operações', 'Agente especializado em operações', 'Settings', '#14b8a6', 'operacoes'),
  ('Jurídico', 'Agente especializado em questões jurídicas', 'Scale', '#6366f1', 'juridico'),
  ('Produto', 'Agente especializado em produto', 'Package', '#f97316', 'produto'),
  ('Design', 'Agente especializado em design', 'Palette', '#d946ef', 'design'),
  ('Suporte', 'Agente especializado em suporte ao cliente', 'HeadphonesIcon', '#0ea5e9', 'suporte');
