-- Migration 007: Truth anchoring layer
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS truth_anchors (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_type     text NOT NULL DEFAULT 'INTERNAL_TIMESTAMP',
  source_table    text NOT NULL,
  source_id       uuid NOT NULL,
  source_hash     text NOT NULL,
  anchor_payload  jsonb DEFAULT '{}'::jsonb,
  anchored_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_truth_anchors_source_id    ON truth_anchors(source_id);
CREATE INDEX IF NOT EXISTS idx_truth_anchors_source_hash  ON truth_anchors(source_hash);
CREATE INDEX IF NOT EXISTS idx_truth_anchors_anchored_at  ON truth_anchors(anchored_at ASC);
