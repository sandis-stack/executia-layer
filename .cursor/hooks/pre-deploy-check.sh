#!/usr/bin/env bash
set -e

echo "EXECUTIA pre-deploy check"

npm test

git status --short
git diff --stat

echo "Ready for deploy if working tree state is intentional."
