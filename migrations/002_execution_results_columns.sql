-- Migration 002: Add missing columns to execution_results
-- Run this in Supabase SQL editor (safe to re-run — uses IF NOT EXISTS)

ALTER TABLE execution_results
  ADD COLUMN IF NOT EXISTS decision      text,
  ADD COLUMN IF NOT EXISTS actor         text,
  ADD COLUMN IF NOT EXISTS subject       text,
  ADD COLUMN IF NOT EXISTS amount        numeric,
  ADD COLUMN IF NOT EXISTS request_type  text,
  ADD COLUMN IF NOT EXISTS rule_context  jsonb,
  ADD COLUMN IF NOT EXISTS proof         jsonb;
