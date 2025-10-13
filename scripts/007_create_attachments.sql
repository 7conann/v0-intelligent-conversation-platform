-- Create attachments table for files, images, and audio
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null, -- 'image', 'audio', 'file'
  file_url text not null,
  file_size integer,
  mime_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.attachments enable row level security;

-- RLS Policies
create policy "Users can view attachments from their messages"
  on public.attachments for select
  using (
    exists (
      select 1 from public.messages
      join public.conversations on conversations.id = messages.conversation_id
      where messages.id = attachments.message_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can insert attachments to their messages"
  on public.attachments for insert
  with check (
    auth.uid() = user_id and
    exists (
      select 1 from public.messages
      join public.conversations on conversations.id = messages.conversation_id
      where messages.id = attachments.message_id
      and conversations.user_id = auth.uid()
    )
  );

create policy "Users can delete their own attachments"
  on public.attachments for delete
  using (
    exists (
      select 1 from public.messages
      join public.conversations on conversations.id = messages.conversation_id
      where messages.id = attachments.message_id
      and conversations.user_id = auth.uid()
    )
  );

-- Create index
create index attachments_message_id_idx on public.attachments(message_id);
