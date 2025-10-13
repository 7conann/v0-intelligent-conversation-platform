-- Create agent_favorites table to track favorite agents per user
create table if not exists public.agent_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, agent_id)
);

-- Enable RLS
alter table public.agent_favorites enable row level security;

-- RLS Policies
create policy "Users can view their own favorite agents"
  on public.agent_favorites for select
  using (auth.uid() = user_id);

create policy "Users can insert their own favorite agents"
  on public.agent_favorites for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own favorite agents"
  on public.agent_favorites for delete
  using (auth.uid() = user_id);

-- Create index
create index agent_favorites_user_id_idx on public.agent_favorites(user_id);
