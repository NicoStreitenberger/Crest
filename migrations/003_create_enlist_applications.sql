-- ============================================================
-- STRN / CREST Studio — Migration 003
-- Create enlist_applications table for strategic client briefing forms
-- Paste this in Supabase SQL Editor → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS enlist_applications (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_name          text NOT NULL,
  contact_email       text NOT NULL,
  intervention_flow   text NOT NULL,
  scenario_desc       text NOT NULL,
  estimated_budget    text NOT NULL,
  created_at          timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE enlist_applications ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "anon_insert_enlist_applications" ON enlist_applications;
  DROP POLICY IF EXISTS "auth_all_enlist_applications" ON enlist_applications;
END $$;

-- Anonymous users can submit application forms
CREATE POLICY "anon_insert_enlist_applications" ON enlist_applications
  FOR INSERT TO anon WITH CHECK (true);

-- Authenticated administrators can read/manage all applications
CREATE POLICY "auth_all_enlist_applications" ON enlist_applications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Verify
SELECT 'Migration 003 applied successfully.' AS result;
