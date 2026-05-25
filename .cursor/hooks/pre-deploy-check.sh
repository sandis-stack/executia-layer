#!/usr/bin/env bash
set -e

echo "EXECUTIA pre-deploy check"

npm test

node scripts/phase-3b5-governance-check.js

node scripts/phase-3b7-architecture-drift.js

node scripts/phase-3b8-architecture-graph.js

node scripts/phase-3b9-execution-intelligence.js

node scripts/phase-3b6-engineering-ledger.js

node scripts/phase-ai-operator-check.js

git status --short
git diff --stat

echo "Ready for deploy if working tree state is intentional."
