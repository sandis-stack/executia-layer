#!/usr/bin/env bash
set -e

echo "Installing operator-signatures capability..."

python3 - <<'PY'
from pathlib import Path

p = Path("engine/execution-resume-engine.js")
s = p.read_text()

needle = '''const proofHashEvent =
  await insertGovernanceEvent({'''

insert = '''const cryptoSignature =
  crypto
    .createHash("sha256")
    .update(JSON.stringify({
      review_id,
      execution_id,
      operator_id,
      operator_email,
      approved_at:new Date().toISOString(),
      governance_state:GOVERNANCE_STATES.COMMITTED
    }))
    .digest("hex");

const operatorSignatureEvent =
  await insertGovernanceEvent({
    supabase,
    event:{
      id:crypto.randomUUID(),
      review_id,
      execution_id,
      actor:operator_email || operator_id || "SYSTEM",
      event_type:"OPERATOR_SIGNATURE_RECORDED",
      payload:{
        operator_id,
        operator_email,
        signature_algorithm:"SHA256",
        signature:cryptoSignature,
        governance_state:GOVERNANCE_STATES.COMMITTED
      },
      created_at:new Date().toISOString()
    }
  })

''' + needle

if needle not in s:
    raise SystemExit("INSERT_POINT_NOT_FOUND")

s = s.replace(needle, insert, 1)

old = '''proofHashEvent,
settlementEvent,
reconciliationEvent'''

new = '''operatorSignatureEvent,
proofHashEvent,
settlementEvent,
reconciliationEvent'''

if old not in s:
    raise SystemExit("RETURN_BLOCK_NOT_FOUND")

s = s.replace(old, new, 1)

p.write_text(s)
PY

echo "operator-signatures capability installed."
