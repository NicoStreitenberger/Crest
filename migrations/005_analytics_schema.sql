-- ============================================================
-- STRN / CREST Studio — Migration 005
-- Private Telemetry Analytics Events Table
-- ============================================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  event_name text NOT NULL,
  metadata   jsonb DEFAULT '{}'::jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Anonymous write access (public telemetry tracking)
CREATE POLICY "anon_insert_analytics_events" ON analytics_events 
  FOR INSERT TO anon WITH CHECK (true);

-- Full administrative access for Authenticated Users (Admin)
CREATE POLICY "admin_all_analytics_events" ON analytics_events 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
