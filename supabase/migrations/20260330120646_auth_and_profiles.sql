-- 001: Auth & Profiles — households, profiles, RLS, triggers

-- Households
create table public.households (
  id uuid default gen_random_uuid() primary key,
  name text not null default 'My Household',
  created_at timestamptz default now() not null
);

alter table public.households enable row level security;

-- Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  household_id uuid references public.households(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

-- updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Auto-create household + profile on new user signup
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_household_id uuid;
begin
  -- Create a default household for the new user
  insert into public.households (name)
  values (coalesce(new.raw_user_meta_data->>'full_name', 'My Household') || '''s Household')
  returning id into new_household_id;

  -- Create their profile
  insert into public.profiles (id, display_name, household_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new_household_id
  );

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS Policies: households
-- Users can read their own household
create policy "Users can read own household"
  on public.households for select
  using (
    id in (
      select household_id from public.profiles where id = auth.uid()
    )
  );

-- Users can update their own household
create policy "Users can update own household"
  on public.households for update
  using (
    id in (
      select household_id from public.profiles where id = auth.uid()
    )
  );

-- RLS Policies: profiles
-- Users can read their own profile
create policy "Users can read own profile"
  on public.profiles for select
  using (id = auth.uid());

-- Users can read profiles in their household
create policy "Users can read household profiles"
  on public.profiles for select
  using (
    household_id in (
      select household_id from public.profiles where id = auth.uid()
    )
  );

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());
