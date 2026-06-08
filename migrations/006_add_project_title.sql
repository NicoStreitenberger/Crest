-- ============================================================
-- STRN / CREST Studio — Migration 006
-- Add project_title column to projects table
-- ============================================================

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_title text;
