-- 003: Sessions — weekly sessions, meals, automation logs, state machine

-- Session status enum
create type public.session_status as enum (
  'draft',
  'planning',
  'picking',
  'review',
  'finalised',
  'dispatched'
);

-- Weekly Sessions
create table public.weekly_sessions (
  id uuid default gen_random_uuid() primary key,
  household_id uuid not null references public.households(id) on delete cascade,
  session_date date not null default current_date,
  status public.session_status not null default 'draft',
  meal_ingredients jsonb,
  confirmed_other_items jsonb,
  dropped_duplicates jsonb,
  pantry_exclusions jsonb,
  final_list jsonb,
  coles_dispatched boolean not null default false,
  reminders_exported boolean not null default false,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.weekly_sessions enable row level security;

create trigger weekly_sessions_updated_at
  before update on public.weekly_sessions
  for each row execute function public.handle_updated_at();

-- Weekly Meals (recipes selected for a session)
create table public.weekly_meals (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.weekly_sessions(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  notes text,
  created_at timestamptz default now() not null
);

alter table public.weekly_meals enable row level security;

-- Automation Logs
create table public.automation_logs (
  id uuid default gen_random_uuid() primary key,
  session_id uuid not null references public.weekly_sessions(id) on delete cascade,
  message text not null,
  log_type text not null default 'info',
  created_at timestamptz default now() not null
);

alter table public.automation_logs enable row level security;

-- Session status transition validation
-- Valid transitions: draft→planning→picking→review→finalised→dispatched
create or replace function public.validate_session_transition()
returns trigger as $$
declare
  valid_next session_status[];
begin
  -- If status hasn't changed, allow
  if old.status = new.status then
    return new;
  end if;

  case old.status
    when 'draft' then valid_next := array['planning']::session_status[];
    when 'planning' then valid_next := array['picking']::session_status[];
    when 'picking' then valid_next := array['review']::session_status[];
    when 'review' then valid_next := array['finalised']::session_status[];
    when 'finalised' then valid_next := array['dispatched']::session_status[];
    when 'dispatched' then valid_next := array[]::session_status[];
  end case;

  if new.status = any(valid_next) then
    return new;
  end if;

  raise exception 'Invalid session transition from % to %', old.status, new.status;
end;
$$ language plpgsql;

create trigger enforce_session_transition
  before update of status on public.weekly_sessions
  for each row execute function public.validate_session_transition();

-- RPC for advancing session status (convenience function)
create or replace function public.advance_session(p_session_id uuid)
returns public.session_status as $$
declare
  current_status session_status;
  next_status session_status;
begin
  select status into current_status
  from public.weekly_sessions
  where id = p_session_id and household_id = public.current_household_id();

  if not found then
    raise exception 'Session not found or not in your household';
  end if;

  case current_status
    when 'draft' then next_status := 'planning';
    when 'planning' then next_status := 'picking';
    when 'picking' then next_status := 'review';
    when 'review' then next_status := 'finalised';
    when 'finalised' then next_status := 'dispatched';
    when 'dispatched' then raise exception 'Session already dispatched';
  end case;

  update public.weekly_sessions set status = next_status where id = p_session_id;
  return next_status;
end;
$$ language plpgsql security definer;

-- RLS Policies: weekly_sessions
create policy "Household members can read sessions"
  on public.weekly_sessions for select
  using (household_id = public.current_household_id());

create policy "Household members can insert sessions"
  on public.weekly_sessions for insert
  with check (household_id = public.current_household_id());

create policy "Household members can update sessions"
  on public.weekly_sessions for update
  using (household_id = public.current_household_id());

create policy "Household members can delete sessions"
  on public.weekly_sessions for delete
  using (household_id = public.current_household_id());

-- RLS Policies: weekly_meals (scoped via session's household)
create policy "Household members can read weekly meals"
  on public.weekly_meals for select
  using (
    session_id in (select id from public.weekly_sessions where household_id = public.current_household_id())
  );

create policy "Household members can insert weekly meals"
  on public.weekly_meals for insert
  with check (
    session_id in (select id from public.weekly_sessions where household_id = public.current_household_id())
  );

create policy "Household members can update weekly meals"
  on public.weekly_meals for update
  using (
    session_id in (select id from public.weekly_sessions where household_id = public.current_household_id())
  );

create policy "Household members can delete weekly meals"
  on public.weekly_meals for delete
  using (
    session_id in (select id from public.weekly_sessions where household_id = public.current_household_id())
  );

-- RLS Policies: automation_logs (scoped via session's household)
create policy "Household members can read automation logs"
  on public.automation_logs for select
  using (
    session_id in (select id from public.weekly_sessions where household_id = public.current_household_id())
  );

create policy "Household members can insert automation logs"
  on public.automation_logs for insert
  with check (
    session_id in (select id from public.weekly_sessions where household_id = public.current_household_id())
  );
