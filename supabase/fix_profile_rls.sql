-- =====================================================================
-- RakshaNet: Fix Profile RLS policies
-- Run this in your Supabase Dashboard → SQL Editor
-- =====================================================================

-- 1. Add INSERT policy for profiles so users can create their own row
--    (needed in case the auth trigger failed or profile row is missing)
create policy if not exists "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- 2. Ensure the profile row exists for any currently logged-in user
--    (This handles edge cases where the auth trigger didn't fire)
-- NOTE: Run this manually for any users who are missing a profile row:
-- insert into public.profiles (id) values ('<user-uuid-here>') on conflict (id) do nothing;

-- 3. Verify RLS is enabled (should already be, but just in case)
alter table public.profiles enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.safe_locations enable row level security;

-- =====================================================================
-- How to test: In Supabase Dashboard → Table Editor → profiles
-- Check that your user's row exists. If not, run:
-- insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;
-- =====================================================================
