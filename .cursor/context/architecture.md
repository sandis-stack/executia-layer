# EXECUTIA Architecture

## Core Principle

EXECUTIA is an execution-time truth system.

Truth is established during execution itself,
not after-the-fact reporting.

## Canonical Truth

Canonical truth layers:

1. ledger_entries
2. supplemental audit chain
3. execution hash continuity

Legacy projections are non-canonical.

## Execution Flow

REQUEST
→ VALIDATION
→ DECISION
→ REGISTRY
→ LEDGER
→ AUDIT
→ COMMITTED

## Deterministic Status Model

VALIDATION PASSED → APPROVED
VALIDATION FAILED → BLOCKED
VALIDATION UNCLEAR → PENDING_REVIEW

APPROVED/BLOCKED
→ COMMITTED

PENDING_REVIEW
→ operator review
→ APPROVED/BLOCKED
→ COMMITTED

## Canonical DB statuses

- APPROVED
- BLOCKED
- PENDING_REVIEW
- COMMITTED
- FAILED

Never introduce shadow statuses.

## Audit Rules

Audit chain is append-only.

Never:
- UPDATE audit chain rows
- DELETE audit chain rows
- mutate canonical hashes

## Rep## Rep## Rep## Rep## Rep## Rrification-only

Replay never mutates truth.

## Public Verify Rules

Public verify endpoints:
- expose only public-saf- expose only public-saf- expose only ps
- never expose secrets
- never expose internal keys

## UI Rules

EXECUTIA is:
- system interface
- governance layer
- institutional execution engine

Not:
- startup landing page
- neon cyberpunk dashboard
- marketing-heavy SaaS UI

## Design Rules

Never use:
- black backgrounds
- aggressive gradients
- chaotic layouts

Always Always Al light backgrounds
- institutional blue
- controlled spacing
- governance aesthetic

