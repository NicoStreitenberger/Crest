-- ============================================================
-- CREST STUDIO — Migration 008
-- Create system_settings table for global configuration
-- ============================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  calendly_url text DEFAULT 'https://calendly.com/strn-studio',
  webhook_url text DEFAULT '',
  behance_url text DEFAULT 'https://behance.net/strn-studio',
  linkedin_url text DEFAULT 'https://linkedin.com/company/strn-studio',
  contact_email text DEFAULT 'contact@strn-studio.com',
  maintenance_mode boolean DEFAULT false
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DO $$ BEGIN
  DROP POLICY IF EXISTS "anon_select_settings" ON public.system_settings;
  DROP POLICY IF EXISTS "admin_all_settings" ON public.system_settings;
END $$;

-- Anonymous users (and Netlify Edge Functions) can read settings
CREATE POLICY "anon_select_settings"
  ON public.system_settings FOR SELECT TO anon USING (true);

-- Authenticated administrators can manage all settings
CREATE POLICY "admin_all_settings"
  ON public.system_settings FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Seed one default settings record
INSERT INTO public.system_settings (id, calendly_url, webhook_url, behance_url, linkedin_url, contact_email, maintenance_mode)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'https://calendly.com/strn-studio',
  '',
  'https://behance.net/strn-studio',
  'https://linkedin.com/company/strn-studio',
  'contact@strn-studio.com',
  false
)
ON CONFLICT (id) DO NOTHING;
