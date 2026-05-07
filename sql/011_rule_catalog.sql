-- EXECUTIA RULE CATALOG v1
-- Institutional rule registry for deterministic execution validation.

CREATE TABLE IF NOT EXISTS public.rule_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  severity text NOT NULL CHECK (severity IN ('BLOCKING', 'REVIEW', 'INFO')),
  jurisdiction text NOT NULL DEFAULT 'GLOBAL',
  request_type text NOT NULL DEFAULT 'ANY',
  active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.rule_catalog
(rule_code, title, description, severity, jurisdiction, request_type, active, version, config)
VALUES
('ACTOR_REQUIRED', 'Actor required', 'Execution request must define actor.', 'REVIEW', 'GLOBAL', 'ANY', true, 1, '{}'),
('SUBJECT_REQUIRED', 'Subject required', 'Execution request must define subject.', 'REVIEW', 'GLOBAL', 'ANY', true, 1, '{}'),
('APPROVAL_LIMIT', 'Approval limit', 'Amount must not exceed configured approval limit.', 'BLOCKING', 'GLOBAL', 'ANY', true, 1, '{"field":"amount","operator":"lte","context_key":"approval_limit"}'),
('OPERATOR_REQUIRED', 'Operator required', 'Execution requires operator review when rule_context.requires_operator is true.', 'REVIEW', 'GLOBAL', 'ANY', true, 1, '{"context_key":"requires_operator"}')
ON CONFLICT (rule_code) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  severity = EXCLUDED.severity,
  jurisdiction = EXCLUDED.jurisdiction,
  request_type = EXCLUDED.request_type,
  active = EXCLUDED.active,
  version = EXCLUDED.version,
  config = EXCLUDED.config,
  updated_at = now();
