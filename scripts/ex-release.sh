#!/usr/bin/env bash
set -e

echo "EXECUTIA RELEASE STARTED"

echo "1/6 Checking git status..."
git status --short

echo "2/6 Checking required files..."
test -f vercel.json
test -f api/request/index.js
test -f api/review/access.js
test -f public/review/index.html

echo "3/6 Staging changes..."
git add .

if git diff --cached --quiet; then
  echo "No changes to commit."
else
  MESSAGE="${1:-EXECUTIA runtime release}"
  git commit -m "$MESSAGE"
fi

echo "4/6 Pushing to main..."
git push origin main

echo "5/6 Deploying to production..."
vercel --prod

echo "6/6 Running smoke checks..."
curl -s https://execution.executia.io/api/v1/health | head -c 300 || true
echo
curl -s https://execution.executia.io/review | head -c 120 || true
echo

echo "EXECUTIA RELEASE COMPLETE"
