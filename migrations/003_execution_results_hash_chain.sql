-- Migration 003: Add hash chain columns to execution_results
-- Safe to re-run (IF NOT EXISTS).
-- Run in Supabase SQL Editor.

ALTER TABLE execution_results
  ADD COLUMN IF NOT EXISTS hash      text,
  ADD COLUMN IF NOT EXISTS prev_hash text;

-- Index for chain traversal performance
CREATE INDEX IF NOT EXISTS idx_execution_results_created_at
  ON execution_results(created_at ASC);
