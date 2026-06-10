-- Tasks table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  mood_at_creation integer check (mood_at_creation between 1 and 5),
  is_multi_phase boolean default false,
  phases_json jsonb,
  is_completed boolean default false,
  created_at timestamptz default now(),
  completed_at timestamptz
);

alter table public.tasks enable row level security;

create policy "Users can read own tasks"
  on public.tasks for select
  using (auth.uid() = user_id);

create policy "Users can insert own tasks"
  on public.tasks for insert
  with check (auth.uid() = user_id);

create policy "Users can update own tasks"
  on public.tasks for update
  using (auth.uid() = user_id);

-- Steps table
create table if not exists public.steps (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.tasks(id) on delete cascade not null,
  step_order integer not null,
  title text not null,
  instruction text not null,
  estimated_minutes integer not null,
  phase integer default 1,
  is_completed boolean default false,
  is_active boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.steps enable row level security;

create policy "Users can read own steps"
  on public.steps for select
  using (
    auth.uid() in (
      select user_id from public.tasks where id = task_id
    )
  );

create policy "Users can insert own steps"
  on public.steps for insert
  with check (
    auth.uid() in (
      select user_id from public.tasks where id = task_id
    )
  );

create policy "Users can update own steps"
  on public.steps for update
  using (
    auth.uid() in (
      select user_id from public.tasks where id = task_id
    )
  );
