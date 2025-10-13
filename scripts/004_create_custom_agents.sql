-- Create custom_agents table (user-created agent compositions)
create table if not exists public.custom_agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  icon text not null,
  color text not null,
  agent_ids uuid[] not null, -- Array of agent IDs that compose this custom agent
  is_favorite boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.custom_agents enable row level security;

-- RLS Policies
create policy "Users can view their own custom agents"
  on public.custom_agents for select
  using (auth.uid() = user_id);

create policy "Users can insert their own custom agents"
  on public.custom_agents for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own custom agents"
  on public.custom_agents for update
  using (auth.uid() = user_id);

create policy "Users can delete their own custom agents"
  on public.custom_agents for delete
  using (auth.uid() = user_id);

-- Add updated_at trigger
create trigger set_updated_at
  before update on public.custom_agents
  for each row
  execute function public.handle_updated_at();
