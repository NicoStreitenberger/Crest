-- ============================================================
-- MIGRATION 007: EXPAND CATEGORY CONSTRAINTS (5 OFFICIAL PILLARS)
-- Date: 2026-06-07
-- Description: Adds 'SPECIAL OPERATIONS' as the 5th closed-nomenclature
--              category across all tables that enforce it.
-- ============================================================

-- ── TABLE: projects ──────────────────────────────────────────

-- Drop the existing category check constraint
ALTER TABLE public.projects
  DROP CONSTRAINT IF EXISTS projects_category_check;

-- Re-add with 5 official pillars
ALTER TABLE public.projects
  ADD CONSTRAINT projects_category_check
  CHECK (category IN (
    'VISUAL INFRASTRUCTURE',
    'DIGITAL SYSTEMS',
    'TANGIBLE MATTER',
    'CREATIVE DIRECTION',
    'SPECIAL OPERATIONS'
  ));

-- ── TABLE: enlist_applications ───────────────────────────────

-- Drop the existing category check constraint
ALTER TABLE public.enlist_applications
  DROP CONSTRAINT IF EXISTS enlist_applications_intervention_flow_check;

-- Re-add with 5 official pillars
ALTER TABLE public.enlist_applications
  ADD CONSTRAINT enlist_applications_intervention_flow_check
  CHECK (intervention_flow IN (
    'VISUAL INFRASTRUCTURE',
    'DIGITAL SYSTEMS',
    'TANGIBLE MATTER',
    'CREATIVE DIRECTION',
    'SPECIAL OPERATIONS'
  ));
