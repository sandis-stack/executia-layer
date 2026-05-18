#!/usr/bin/env bash
set -e

echo "Installing qr-verification capability..."

python3 - <<'PY'
from pathlib import Path

p = Path("api/v1/proof/certificate.js")
s = p.read_text()

old = '''        review_id,

        immutable_chain_verified:
          verified,'''

new = '''        review_id,

        verification_url:
          `https://execution.executia.io/proof-explorer/?review_id=${review_id}`,

        qr_verification_payload:
          `EXECUTIA_VERIFY:${review_id}`,

        immutable_chain_verified:
          verified,'''

if old not in s:
    raise SystemExit("CERTIFICATE_INSERT_POINT_NOT_FOUND")

s = s.replace(old, new, 1)

p.write_text(s)
PY

python3 - <<'PY'
from pathlib import Path

p = Path("public/proof-explorer/index.html")
s = p.read_text()

old = '''    <input id="reviewId" placeholder="Review ID" />
    <button onclick="verifyProof()">VERIFY PROOF</button>'''

new = '''    <input id="reviewId" placeholder="Review ID" />
    <button onclick="verifyProof()">VERIFY PROOF</button>

<script>
const params = new URLSearchParams(window.location.search);
const reviewIdParam = params.get("review_id");

if(reviewIdParam){
  window.addEventListener("load", ()=>{
    document.getElementById("reviewId").value = reviewIdParam;
    verifyProof();
  });
}
</script>'''

if old not in s:
    raise SystemExit("PROOF_EXPLORER_INSERT_POINT_NOT_FOUND")

s = s.replace(old, new, 1)

p.write_text(s)
PY

echo "qr-verification capability installed."
