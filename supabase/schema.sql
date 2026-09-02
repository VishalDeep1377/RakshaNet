-- =============================================================
-- RAKSHANET SILENTSHIELD — Database Schema (Supabase)
-- Run this in your Supabase SQL Editor
-- =============================================================

-- ─────────────────────────────────────────
-- 1. PROFILES (extends auth.users)
-- ─────────────────────────────────────────
create table if not exists public.profiles (
  id                    uuid primary key references auth.users on delete cascade,
  full_name             text,
  avatar_url            text,
  phone                 text,
  gender                text,
  age_range             text,
  blood_group           text,
  medical_notes         text,
  preferred_language    text default 'English',
  role                  text default 'user' check (role in ('user', 'responder', 'admin')),
  -- Extended safety profile fields
  home_location         jsonb default '{}'::jsonb,
  work_locations        jsonb default '[]'::jsonb,
  regular_routes        jsonb default '[]'::jsonb,
  emergency_preferences jsonb default '{}'::jsonb,
  silent_trigger_settings jsonb default '{}'::jsonb,
  preferred_responder   jsonb default '{}'::jsonb,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- ─────────────────────────────────────────
-- 2. TRUSTED CONTACTS
-- ─────────────────────────────────────────
create table if not exists public.trusted_contacts (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid references public.profiles(id) on delete cascade not null,
  name                    text not null,
  phone                   text not null,
  relationship            text,
  priority                text default 'Secondary' check (priority in ('Primary', 'Secondary')),
  can_view_location       boolean default true,
  can_receive_evidence    boolean default false,
  notification_preference text default 'SMS + App',
  created_at              timestamptz default now()
);

alter table public.trusted_contacts enable row level security;
create policy "Users manage own trusted contacts" on public.trusted_contacts
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 3. SAFE LOCATIONS
-- ─────────────────────────────────────────
create table if not exists public.safe_locations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  name       text not null,
  address    text,
  latitude   double precision,
  longitude  double precision,
  radius     int default 200,
  is_active  boolean default true,
  created_at timestamptz default now()
);

alter table public.safe_locations enable row level security;
create policy "Users manage own safe locations" on public.safe_locations
  for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 4. RESPONDERS
-- ─────────────────────────────────────────
create table if not exists public.responders (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid references public.profiles(id) on delete cascade not null,
  verification_status   text default 'pending' check (verification_status in ('pending', 'verified', 'suspended')),
  capabilities          text[] default '{}',
  trust_score           float default 0,
  current_location      jsonb,
  is_available          boolean default false,
  gender                text,
  preferred_languages   text[] default '{"English"}',
  responder_type        text default 'community', -- community | ngo | police | medical
  created_at            timestamptz default now()
);

alter table public.responders enable row level security;
create policy "Responders manage own record" on public.responders
  for all using (auth.uid() = user_id);
create policy "Authenticated users can view verified responders" on public.responders
  for select using (auth.role() = 'authenticated' and verification_status = 'verified');

-- ─────────────────────────────────────────
-- 5. INCIDENTS
-- ─────────────────────────────────────────
create table if not exists public.incidents (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade not null,
  status          text default 'Idle'
                  check (status in ('Idle', 'Triggered', 'Dispatched', 'Live', 'Resolved', 'Sealed')),
  risk_score      int default 0 check (risk_score >= 0 and risk_score <= 100),
  score_breakdown jsonb default '{}'::jsonb,
  location        jsonb,  -- { lat, lng, address, accuracy }
  responder_id    uuid references public.responders(id),
  started_at      timestamptz default now(),
  resolved_at     timestamptz,
  metadata        jsonb default '{}'::jsonb  -- trigger method, cancel attempts, etc.
);

alter table public.incidents enable row level security;
create policy "Users view own incidents" on public.incidents
  for select using (auth.uid() = user_id);
create policy "Users create incidents" on public.incidents
  for insert with check (auth.uid() = user_id);
create policy "Users update own incidents" on public.incidents
  for update using (auth.uid() = user_id);
-- Responders can view incidents assigned to them
create policy "Responders view assigned incidents" on public.incidents
  for select using (
    exists (
      select 1 from public.responders r
      where r.id = incidents.responder_id
      and r.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- 6. EVIDENCE CHUNKS
-- ─────────────────────────────────────────
create table if not exists public.evidence_chunks (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade not null,
  chunk_index int not null,
  chunk_type  text default 'metadata' check (chunk_type in ('metadata', 'audio', 'location', 'motion', 'video')),
  hash        text not null,  -- SHA-256 of this chunk
  prev_hash   text,           -- SHA-256 of previous chunk (hash chain)
  media_url   text,           -- Supabase Storage URL (if applicable)
  metadata    jsonb default '{}'::jsonb,
  created_at  timestamptz default now()
);

alter table public.evidence_chunks enable row level security;
-- Only the incident owner can read their evidence
create policy "Incident owner views evidence" on public.evidence_chunks
  for select using (
    exists (
      select 1 from public.incidents i
      where i.id = evidence_chunks.incident_id
      and i.user_id = auth.uid()
    )
  );
create policy "System inserts evidence" on public.evidence_chunks
  for insert with check (
    exists (
      select 1 from public.incidents i
      where i.id = evidence_chunks.incident_id
      and i.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────
-- 7. ACCESS LOGS (Evidence Vault audit)
-- ─────────────────────────────────────────
create table if not exists public.access_logs (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid references public.incidents(id) on delete cascade not null,
  accessor_id uuid references auth.users,
  action      text not null,  -- 'view_vault', 'download_report', 'share_evidence', etc.
  actor_role  text,           -- 'owner' | 'responder' | 'legal' | 'police'
  timestamp   timestamptz default now()
);

alter table public.access_logs enable row level security;
-- Only the incident owner can view access logs for their incidents
create policy "Incident owner views access logs" on public.access_logs
  for select using (
    exists (
      select 1 from public.incidents i
      where i.id = access_logs.incident_id
      and i.user_id = auth.uid()
    )
  );
-- Anyone who has been granted access can insert an access log entry
create policy "Insert access log" on public.access_logs
  for insert with check (auth.role() = 'authenticated');

-- ─────────────────────────────────────────
-- 8. REALTIME: Enable for live updates
-- ─────────────────────────────────────────
-- Run this in Supabase Dashboard → Database → Replication
-- Or uncomment if using the CLI:
-- alter publication supabase_realtime add table public.incidents;
-- alter publication supabase_realtime add table public.responders;

-- ─────────────────────────────────────────
-- 9. MOCK RESPONDERS (Demo seed data)
-- ─────────────────────────────────────────
-- Insert mock responder profiles for demo
-- (Run after creating auth users, or adjust UUIDs)

-- insert into public.responders (user_id, verification_status, capabilities, trust_score, is_available, gender, responder_type)
-- values
--   ('uuid-here', 'verified', '{"first-aid", "female-safety"}', 98, true, 'Female', 'ngo'),
--   ('uuid-here', 'verified', '{"law-enforcement"}', 95, true, 'Mixed', 'police');
