#!/bin/bash
set -euo pipefail

if [ -z "${1:-}" ]; then
  echo "Usage: bash scripts/deploy.sh \"commit message\""
  exit 1
fi

if git diff --cached --quiet; then
  echo "Nothing staged. Stage your files first: git add <files>"
  exit 1
fi

git commit -m "$1"
git push
vercel --prod
