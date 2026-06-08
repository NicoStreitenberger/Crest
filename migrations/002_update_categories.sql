-- ============================================================
-- STRN / CREST Studio — Migration 002
-- Standardize categories to closed uppercase nomenclature
-- Paste this in Supabase SQL Editor → Run
-- ============================================================

-- 1. Disable RLS temporarily or work within superuser context
-- 2. Clear old categories
-- Note: If there are existing projects referencing old categories, we may need to handle them.
-- To be safe, we will delete references or set them to NULL, then delete old categories.

UPDATE projects SET category_id = NULL;
DELETE FROM categories;

-- 3. Insert the new standardized uppercase categories
INSERT INTO categories (name, slug) VALUES
  ('VISUAL INFRASTRUCTURE', 'visual-infrastructure'),
  ('DIGITAL SYSTEMS',       'digital-systems'),
  ('TANGIBLE MATTER',       'tangible-matter'),
  ('CREATIVE DIRECTION',    'creative-direction');

-- 4. Verify
SELECT * FROM categories;
