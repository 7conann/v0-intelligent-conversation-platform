-- Create conversation_agents table to track which agents are selected/used in each conversation
create table if not exists public.conversation_agents (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  is_selected boolean default false, -- Currently selected
  is_used boolean default false, -- Has been used (sent a message)
  message_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(conversation_id, agent_id)
);

-- Enable RLS
alter table public.conversation_agents enable row level security;

-- RLS Policies
create policy "Users can view agents from their conversations"
  on public.conversation_agents for select
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = conversation_agents.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can insert agents to their conversations"
  on public.conversation_agents for insert
  with check (
    exists (
      select 1 from public.conversations
      where conversations.id = conversation_agents.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can update agents in their conversations"
  on public.conversation_agents for update
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = conversation_agents.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can delete agents from their conversations"
  on public.conversation_agents for delete
  using (
    exists (
      select 1 from public.conversations
      where conversations.id = conversation_agents.conversation_id
      and conversations.user_id = auth.uid()
    )
  );

-- Add updated_at trigger
create trigger set_updated_at
  before update on public.conversation_agents
  for each row
  execute function public.handle_updated_at();

-- Create indexes
create index conversation_agents_conversation_id_idx on public.conversation_agents(conversation_id);
create index conversation_agents_agent_id_idx on public.conversation_agents(agent_id);
