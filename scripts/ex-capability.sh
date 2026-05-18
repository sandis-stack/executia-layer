#!/usr/bin/env bash
set -e

CAPABILITY="$1"

if [ -z "$CAPABILITY" ]; then
  echo "Usage: ./scripts/ex-capability.sh <capability-name>"
  echo ""
  echo "Available:"
  echo "  proof-pdf"
  echo "  proof-explorer"
  echo "  regulator-mode"
  exit 1
fi

SCRIPT="scripts/capabilities/${CAPABILITY}.sh"

if [ ! -f "$SCRIPT" ]; then
  echo "Capability not found: $CAPABILITY"
  echo "Expected file: $SCRIPT"
  exit 1
fi

echo "EXECUTIA CAPABILITY STARTED: $CAPABILITY"

bash "$SCRIPT"

./scripts/ex-release.sh "Add EXECUTIA capability: $CAPABILITY"

echo "EXECUTIA CAPABILITY COMPLETE: $CAPABILITY"
