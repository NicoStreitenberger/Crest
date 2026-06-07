-- ============================================================
-- STRN Studio — Migration 001
-- Full schema with FK constraints + RLS policies
-- Paste this in Supabase SQL Editor → Run
-- ============================================================

-- -------------------------------------------------------
-- 1. CATEGORIES
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  slug       text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- Seed default categories (idempotent)
INSERT INTO categories (name, slug) VALUES
  ('Brand Identity',    'brand-identity'),
  ('Digital Design',    'digital-design'),
  ('Physical Branding', 'physical-branding'),
  ('UI / UX',           'ui-ux'),
  ('Motion',            'motion')
ON CONFLICT (slug) DO NOTHING;

-- -------------------------------------------------------
-- 2. PROJECTS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title        text NOT NULL,
  slug         text NOT NULL UNIQUE,
  description  text,
  client_name  text,
  main_image   text,
  gallery      jsonb DEFAULT '[]'::jsonb,
  category_id  uuid REFERENCES categories(id) ON DELETE SET NULL,
  is_featured  boolean DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- 3. BLOG POSTS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_posts (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title          text NOT NULL,
  slug           text NOT NULL UNIQUE,
  content        text,
  excerpt        text,
  featured_image text,
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at   timestamptz,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- 4. LEADS
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  email      text NOT NULL,
  message    text,
  status     text NOT NULL DEFAULT 'new' CHECK (status IN ('new','read')),
  created_at timestamptz DEFAULT now()
);

-- -------------------------------------------------------
-- 5. ENABLE ROW LEVEL SECURITY
-- -------------------------------------------------------
ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects    ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts  ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads       ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- 6. RLS POLICIES — Public read on categories, projects, blog_posts
-- -------------------------------------------------------

-- Drop old policies if they exist, then recreate
DO $$ BEGIN
  DROP POLICY IF EXISTS "anon_read_categories"  ON categories;
  DROP POLICY IF EXISTS "anon_read_projects"    ON projects;
  DROP POLICY IF EXISTS "anon_read_blog_posts"  ON blog_posts;
  DROP POLICY IF EXISTS "anon_insert_leads"     ON leads;
  DROP POLICY IF EXISTS "auth_all_categories"   ON categories;
  DROP POLICY IF EXISTS "auth_all_projects"     ON projects;
  DROP POLICY IF EXISTS "auth_all_blog_posts"   ON blog_posts;
  DROP POLICY IF EXISTS "auth_all_leads"        ON leads;
END $$;

-- Anyone can read categories
CREATE POLICY "anon_read_categories" ON categories
  FOR SELECT TO anon USING (true);

-- Anyone can read projects
CREATE POLICY "anon_read_projects" ON projects
  FOR SELECT TO anon USING (true);

-- Anyone can read published blog posts
CREATE POLICY "anon_read_blog_posts" ON blog_posts
  FOR SELECT TO anon USING (status = 'published');

-- Anyone can submit a lead
CREATE POLICY "anon_insert_leads" ON leads
  FOR INSERT TO anon WITH CHECK (true);

-- Authenticated users have full access to all tables
CREATE POLICY "auth_all_categories"  ON categories  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_projects"    ON projects    FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_blog_posts"  ON blog_posts  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_leads"       ON leads       FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- -------------------------------------------------------
-- 7. INDEXES for performance
-- -------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_slug      ON projects(slug);
CREATE INDEX IF NOT EXISTS idx_projects_category  ON projects(category_id);
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug    ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status  ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_pub     ON blog_posts(published_at DESC);

-- -------------------------------------------------------
-- Done!
-- -------------------------------------------------------
SELECT 'Migration 001 applied successfully.' AS result;
