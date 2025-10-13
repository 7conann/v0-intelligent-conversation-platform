-- Create workspaces table
create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  api_url text,
  api_key text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.workspaces enable row level security;

-- RLS Policies for workspaces
create policy "Users can view their own workspaces"
  on public.workspaces for select
  using (auth.uid() = user_id);

create policy "Users can insert their own workspaces"
  on public.workspaces for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own workspaces"
  on public.workspaces for update
  using (auth.uid() = user_id);

create policy "Users can delete their own workspaces"
  on public.workspaces for delete
  using (auth.uid() = user_id);

-- Add updated_at trigger
create trigger set_updated_at
  before update on public.workspaces
  for each row
  execute function public.handle_updated_at();
