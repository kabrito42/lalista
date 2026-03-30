-- Fix: profiles RLS "read household profiles" policy causes infinite recursion
-- because it subqueries profiles within a profiles RLS check.
-- Replace with a SECURITY DEFINER helper function to break the recursion.

-- Drop the recursive policy
drop policy if exists "Users can read household profiles" on public.profiles;

-- Create a helper that bypasses RLS to get household_id for current user
create or replace function public.auth_household_id()
returns uuid as $$
  select household_id from public.profiles where id = auth.uid()
$$ language sql security definer stable;

-- Re-create the policy using the helper (no recursion)
create policy "Users can read household profiles"
  on public.profiles for select
  using (household_id = public.auth_household_id());

-- Also update the households policies to use the same helper
drop policy if exists "Users can read own household" on public.households;
create policy "Users can read own household"
  on public.households for select
  using (id = public.auth_household_id());

drop policy if exists "Users can update own household" on public.households;
create policy "Users can update own household"
  on public.households for update
  using (id = public.auth_household_id());
