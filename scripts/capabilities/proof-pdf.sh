#!/usr/bin/env bash
set -e

echo "Installing proof-pdf capability..."

test -f api/v1/proof/certificate-pdf.js
test -f public/review/index.html

echo "proof-pdf capability already present."
