-- =============================================================
-- RAKSHANET — Peer Alert System Migration
-- Run this in your Supabase SQL Editor
-- =============================================================

-- ─────────────────────────────────────────
-- Add helper availability fields to profiles
-- ─────────────────────────────────────────
alter table public.profiles
  add column if not exists helper_availability boolean default false,
  add column if not exists helper_location     jsonb default '{}'::jsonb,
  add column if not exists last_seen_at        timestamptz default now();

-- ─────────────────────────────────────────
-- PEER ALERTS TABLE
-- ─────────────────────────────────────────
create table if not exists public.peer_alerts (
  id           uuid primary key default gen_random_uuid(),
  incident_id  uuid references public.incidents(id) on delete cascade,
  sender_id    uuid references public.profiles(id) on delete cascade not null,
  helper_id    uuid references public.profiles(id) on delete cascade not null,
  status       text default 'pending' check (status in ('pending', 'accepted', 'dismissed', 'expired')),
  sender_location jsonb,
  distance_km  float,
  message      text default 'Someone nearby may need your help.',
  created_at   timestamptz default now(),
  responded_at timestamptz
);

-- RLS
alter table public.peer_alerts enable row level security;

create policy "Helpers view own alerts" on public.peer_alerts
  for select using (auth.uid() = helper_id);

create policy "Senders view own sent alerts" on public.peer_alerts
  for select using (auth.uid() = sender_id);

create policy "Insert peer alerts" on public.peer_alerts
  for insert with check (auth.role() = 'authenticated');

create policy "Helpers update alert status" on public.peer_alerts
  for update using (auth.uid() = helper_id);

-- ─────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────
create index if not exists idx_profiles_helper on public.profiles(helper_availability) where helper_availability = true;
create index if not exists idx_peer_alerts_helper_id on public.peer_alerts(helper_id, status);
create index if not exists idx_peer_alerts_created on public.peer_alerts(created_at desc);

-- ─────────────────────────────────────────
-- Enable Realtime (run in Supabase Dashboard → Database → Replication)
-- ─────────────────────────────────────────
-- alter publication supabase_realtime add table public.peer_alerts;
