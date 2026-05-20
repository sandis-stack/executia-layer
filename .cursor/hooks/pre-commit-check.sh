#!/bin/bash

echo ""
echo "EXECUTIA GOVERNANCE CHECK"
echo "=========================="

echo ""
echo "Checking forbidden execution states..."

if grep -R "status.*CONFIRMED\|state.*CONFIRMED\|request_state.*CONFIRMED\|governance_decision.*CONFIRMED\|UNDER_REVIEW\|REQUIRES_REVIEW" api services public --exclude-dir=node_modules 2>/dev/null
then
  echo ""
  echo "BLOCKED:"
  echo "Forbidden execution states detected."
  exit 1
fi

echo "OK"

echo ""
echo "Checking for duplicate Resend logic..."

if grep -R "new Resend" api --exclude-dir=node_modules 2>/dev/null
then
  echo ""
  echo "BLOCKED:"
  echo "Direct Resend usage detected inside API layer."
  echo "Use services/executia-mail.js"
  exit 1
fi

echo "OK"

echo ""
echo "Checking for black backgrounds..."

if grep -R "#000\|#000000\|background:black" public api services --exclude-dir=node_modules 2>/dev/null
then
  echo ""
  echo "BLOCKED:"
  echo "Black background detected."
  exit 1
fi

echo "OK"

echo ""
echo "Running syntax validation..."

find api services -name "*.js" | while read file
do
  node --check "$file" >/dev/null 2>&1

  if [ $? -ne 0 ]; then
    echo ""
    echo "BLOCKED:"
    echo "Syntax error in $file"
    exit 1
  fi
done

echo "OK"

echo ""
echo "EXECUTIA GOVERNANCE CHECK PASSED"
echo ""
