-- Migration v2/002: Add execution_status to governance_reviews
ALTER TABLE governance_reviews
ADD COLUMN IF NOT EXISTS execution_status text DEFAULT 'PENDING_REVIEW';
