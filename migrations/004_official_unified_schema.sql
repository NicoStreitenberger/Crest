-- ============================================================
-- STRN / CREST Studio — Migration 004
-- Official Unified Schema for projects, articles, and enlist_applications
-- Paste this in Supabase SQL Editor → Run
-- ============================================================

-- Drop old tables if they exist to start clean
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS blog_posts CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS enlist_applications CASCADE;

-- 1. Table: projects (Alimenta /systems.html y /system-post.html)
CREATE TABLE projects (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at           timestamptz DEFAULT now(),
  client_name          text NOT NULL,
  slug                 text NOT NULL UNIQUE,
  category             text NOT NULL CHECK (category IN ('VISUAL INFRASTRUCTURE', 'DIGITAL SYSTEMS', 'TANGIBLE MATTER', 'CREATIVE DIRECTION')),
  year                 integer NOT NULL,
  main_image           text,
  project_images       text[] DEFAULT '{}'::text[],
  strategy_description text,
  is_featured          boolean DEFAULT false
);

-- 2. Table: articles (Alimenta /currents.html y /current-post.html)
CREATE TABLE articles (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at     timestamptz DEFAULT now(),
  title          text NOT NULL,
  slug           text NOT NULL UNIQUE,
  read_time      text,
  published_date text,
  body_content   text
);

-- 3. Table: enlist_applications (Recibe datos desde /enlist.html)
CREATE TABLE enlist_applications (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at        timestamptz DEFAULT now(),
  brand_name        text NOT NULL,
  client_email      text NOT NULL,
  discipline_needed text,
  market_scenario   text,
  budget_range      text,
  status            text DEFAULT 'PENDING_REVIEW'
);

-- Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE enlist_applications ENABLE ROW LEVEL SECURITY;

-- 4. RLS POLICIES

-- Public SELECT access for projects and articles
CREATE POLICY "anon_select_projects" ON projects FOR SELECT TO anon USING (true);
CREATE POLICY "anon_select_articles" ON articles FOR SELECT TO anon USING (true);

-- Restricted INSERT access for enlist_applications (public submission)
CREATE POLICY "anon_insert_enlist_applications" ON enlist_applications FOR INSERT TO anon WITH CHECK (true);

-- Full administrative access for Authenticated Users (Admin)
CREATE POLICY "admin_all_projects" ON projects FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_articles" ON articles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "admin_all_enlist_applications" ON enlist_applications FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed Initial Projects Data (optional for starting state)
INSERT INTO projects (client_name, slug, category, year, main_image, strategy_description, is_featured) VALUES
  ('MODO PATRIA', 'modo-patria', 'VISUAL INFRASTRUCTURE', 2026, 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800', 'Construcción de la infraestructura visual identitaria y sistema estratégico de marca para la firma streetwear.', true)
ON CONFLICT (slug) DO NOTHING;

-- Seed Initial Articles Data (optional for starting state)
INSERT INTO articles (title, slug, read_time, published_date, body_content) VALUES
  ('DISCIPLINA EN ENTORNOS DE ALTA COMPETENCIA', 'disciplina-en-entornos-de-alta-competencia', '4 MIN READ', 'MAY 2026', '<p>El verdadero rendimiento se forja bajo la presión y el cálculo estratégico. Sin adornos superfluos, construimos estructuras visuales que resisten.</p>')
ON CONFLICT (slug) DO NOTHING;
