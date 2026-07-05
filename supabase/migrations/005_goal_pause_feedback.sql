-- Add status column to tasks table
alter table public.tasks
  add column if not exists status text default 'active'
  check (status in ('active', 'paused', 'completed', 'archived'));

alter table public.tasks
  add column if not exists paused_at timestamptz;

-- Add parent_step_id to steps table for sub-step breakdown
alter table public.steps
  add column if not exists parent_step_id uuid references public.steps(id) on delete cascade;

-- Feedback table
create table if not exists public.feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id uuid references public.tasks(id) on delete set null,
  reason text not null,
  feedback_text text,
  created_at timestamptz default now()
);

alter table public.feedback enable row level security;

create policy "Users can insert own feedback"
  on public.feedback for insert
  with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on public.feedback for select
  using (auth.uid() = user_id);
