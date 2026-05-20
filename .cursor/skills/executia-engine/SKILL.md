# EXECUTIA Engine Skill

## Purpose

This skill governs how AI agents work with the EXECUTIA execution engine.

EXECUTIA is not a normal SaaS platform.
It is an execution governance system.

The engine controls:
- validation
- execution decisions
- ledger truth
- audit materialization
- governance enforcement

## Core Principles

- execution-time truth
- deterministic execution
- governance before commitment
- no duplicate logic
- no shadow state
- one engine authority

## Approved Execution States

- COMMITTED
- BLOCKED
- PENDING_REVIEW
- FAILED
- APPROVED

Never invent additional execution states.

## Approved Execution Flow

REQUEST
→ VALIDATION
→ DECISION
→ REGISTRY
→ LEDGER
→ AUDIT

## API Principles

- APIs must return structured JSON
- preserve backward compatibility
- never expose service role keys
- all privileged actions stay server-side
- never bypass governance validation

## Database Principles

- RLS required
- deterministic schema naming
- immutable ledger philosophy
- audit trail preservation
- avoid SECURITY DEFINER unless unavoidable

## Architectural Constraints

Do not:
- duplicate execution validation
- create secondary execution engines
- introduce mock governance logic
- mix homepage UI with engine logic
- create uncontrolled async execution

## UI Philosophy

The engine UI is:
- institutional
- regulator-grade
- proof-oriented
- operational
- minimal
- deterministic

Never use:
- startup-style gimmicks
- flashy gradients
- gaming aesthetics
- black backgrounds

## Mail / Notification Architecture

Use centralized services only:

- services/mail-template.js
- services/executia-mail.js
- services/executia-notifications.js

Endpoints should orchestrate only.
Notification logic belongs to services layer.

## Verification Standard

Before commit:
- node --check
- verify endpoint response
- verify governance states
- verify no architecture duplication
- verify security consistency
