-- =============================================================
-- RAKSHANET — Trusted Alert Enhancement Migration
-- Adds whatsapp_link column to trusted_contact_alerts
-- Run this in Supabase SQL Editor
-- =============================================================

-- Add whatsapp_link column if not already present
alter table public.trusted_contact_alerts
  add column if not exists whatsapp_link text;

-- Add sms_sent flag (for future SMS integration)
alter table public.trusted_contact_alerts
  add column if not exists notification_sent boolean default true;

-- Index for faster queries by user and created_at
create index if not exists idx_trusted_contact_alerts_user_created
  on public.trusted_contact_alerts(user_id, created_at desc);

-- Index for police_alerts as well
create index if not exists idx_police_alerts_user_created
  on public.police_alerts(user_id, created_at desc);
