-- =============================================================
-- RAKSHANET — Raksha Risk Score DB Migration
-- Run this in Supabase SQL Editor AFTER the base schema.sql
-- =============================================================

-- ─────────────────────────────────────────
-- 1. TRUSTED CONTACT ALERTS
-- Stores notifications sent to trusted contacts at Level 3
-- ─────────────────────────────────────────
create table if not exists public.trusted_contact_alerts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete cascade not null,
  contact_name     text not null,          -- Trusted contact's name (fetched from trusted_contacts)
  contact_phone    text,                   -- Trusted contact's phone
  user_full_name   text not null,          -- The user in distress
  message          text not null,          -- Alert message sent
  location_address text,                   -- Human-readable address
  location_lat     double precision,
  location_lng     double precision,
  raksha_score     int,                    -- Score at time of alert
  raksha_level     text,                   -- 'CONFIRMED' | 'CRITICAL'
  incident_id      uuid references public.incidents(id),
  status           text default 'sent'
                   check (status in ('sent', 'acknowledged', 'responded')),
  created_at       timestamptz default now()
);

alter table public.trusted_contact_alerts enable row level security;

create policy "Users can view own trusted contact alerts" on public.trusted_contact_alerts
  for select using (auth.uid() = user_id);

create policy "Users can create trusted contact alerts" on public.trusted_contact_alerts
  for insert with check (auth.uid() = user_id);

create policy "Users can update own trusted contact alerts" on public.trusted_contact_alerts
  for update using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 2. POLICE ALERTS
-- Simulated police station notifications at Level 4
-- ─────────────────────────────────────────
create table if not exists public.police_alerts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references public.profiles(id) on delete cascade not null,
  user_full_name   text not null,
  location_address text,
  location_lat     double precision,
  location_lng     double precision,
  raksha_score     int,
  incident_id      uuid references public.incidents(id),
  station_name     text default 'Nearest PCR Unit',
  pcr_reference    text,                   -- Generated PCR reference number
  status           text default 'dispatched'
                   check (status in ('dispatched', 'acknowledged', 'closed')),
  created_at       timestamptz default now()
);

alter table public.police_alerts enable row level security;

create policy "Users can view own police alerts" on public.police_alerts
  for select using (auth.uid() = user_id);

create policy "Users can create police alerts" on public.police_alerts
  for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 3. RAKSHA SCORE LOG (for analytics / audit trail)
-- Records score transitions for debugging + evidence
-- ─────────────────────────────────────────
create table if not exists public.raksha_score_log (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid references public.profiles(id) on delete cascade not null,
  score               int not null,
  level               text not null,
  audio_score         int default 0,
  motion_score        int default 0,
  route_risk_score    int default 0,
  time_context_score  int default 0,
  created_at          timestamptz default now()
);

alter table public.raksha_score_log enable row level security;

create policy "Users can view own score logs" on public.raksha_score_log
  for select using (auth.uid() = user_id);

create policy "Users can insert own score logs" on public.raksha_score_log
  for insert with check (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- 4. Enable Realtime on new tables
-- Run in Supabase Dashboard → Database → Replication
-- ─────────────────────────────────────────
-- alter publication supabase_realtime add table public.trusted_contact_alerts;
-- alter publication supabase_realtime add table public.police_alerts;

-- ─────────────────────────────────────────
-- 5. Add helper_availability + helper_location to profiles
-- (if not already added by peer_alerts_migration.sql)
-- ─────────────────────────────────────────
alter table public.profiles
  add column if not exists helper_availability boolean default false,
  add column if not exists helper_location jsonb default null;
