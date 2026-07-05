-- Inbox messages table for in-app notifications
create table if not exists public.inbox_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text check (category in ('insight', 're_entry', 'milestone')) not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

alter table public.inbox_messages enable row level security;

create policy "Users can read own messages"
  on public.inbox_messages for select
  using (auth.uid() = user_id);

create policy "Users can update own messages"
  on public.inbox_messages for update
  using (auth.uid() = user_id);
