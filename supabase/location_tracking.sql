-- =============================================================
-- RAKSHANET — Location Snapshots Migration
-- Stores GPS snapshots taken during SOS incidents.
-- =============================================================

create table if not exists public.location_snapshots (
  id              uuid primary key default gen_random_uuid(),
  incident_id     uuid references public.incidents(id) on delete cascade,
  lat             double precision not null,
  lng             double precision not null,
  accuracy        double precision,             -- metres
  address         text,
  trigger_method  text,                         -- 'manual','shake','volume_up_3x','triple_tap','long_press','live_tracking','auto_distress'
  ts              timestamptz not null default now()
);

-- Index for fast lookups by incident
create index if not exists location_snapshots_incident_idx
  on public.location_snapshots (incident_id, ts desc);

-- Row-level security
alter table public.location_snapshots enable row level security;

-- Only the owner of the incident can read their own snapshots
create policy "owner can read snapshots"
  on public.location_snapshots for select
  using (
    exists (
      select 1 from public.incidents i
      where i.id = location_snapshots.incident_id
        and i.user_id = auth.uid()
    )
  );

-- Only the owner can insert snapshots (via service or client)
create policy "owner can insert snapshots"
  on public.location_snapshots for insert
  with check (
    exists (
      select 1 from public.incidents i
      where i.id = location_snapshots.incident_id
        and i.user_id = auth.uid()
    )
  );

-- Trusted contacts of the owner can also read snapshots
-- (requires a trusted_contacts join — adjust if your schema differs)
create policy "trusted contacts can read snapshots"
  on public.location_snapshots for select
  using (
    exists (
      select 1
      from public.incidents i
      join public.trusted_contacts tc on tc.user_id = i.user_id
      where i.id = location_snapshots.incident_id
        and tc.contact_user_id = auth.uid()
    )
  );
