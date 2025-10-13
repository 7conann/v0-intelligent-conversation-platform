-- Create conversations table
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  title text not null default 'Nova Conversa',
  is_favorite boolean default false,
  is_archived boolean default false,
  position integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.conversations enable row level security;

-- RLS Policies
create policy "Users can view their own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users can insert their own conversations"
  on public.conversations for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own conversations"
  on public.conversations for update
  using (auth.uid() = user_id);

create policy "Users can delete their own conversations"
  on public.conversations for delete
  using (auth.uid() = user_id);

-- Add updated_at trigger
create trigger set_updated_at
  before update on public.conversations
  for each row
  execute function public.handle_updated_at();

-- Create index for faster queries
create index conversations_user_id_idx on public.conversations(user_id);
create index conversations_is_favorite_idx on public.conversations(is_favorite);
create index conversations_is_archived_idx on public.conversations(is_archived);
