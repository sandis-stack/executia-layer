#!/usr/bin/env bash
set -e

echo "EXECUTIA pre-commit check"

npm test

git diff --check

echo "OK"
