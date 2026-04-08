#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

if [ ! -f .env ]; then
  echo "[deploy] .env not found, copying from .env.example"
  cp .env.example .env
  echo "[deploy] please edit .env before continuing"
  exit 1
fi

echo "[deploy] fetching latest remote state..."
git fetch origin main

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"

if [ "$LOCAL_SHA" != "$REMOTE_SHA" ]; then
  echo "[deploy] update available:"
  git log --oneline --no-decorate "$LOCAL_SHA..$REMOTE_SHA"
  echo
  read -r -p "[deploy] pull latest code now? [Y/n] " answer
  answer="${answer:-Y}"
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    echo "[deploy] pulling latest code..."
    git pull origin main
  else
    echo "[deploy] skipped update, continue with current local code"
  fi
else
  echo "[deploy] already up to date"
fi

echo "[deploy] installing dependencies..."
npm install

echo "[deploy] running type check..."
npx tsc --noEmit

echo "[deploy] recreating pm2 process..."
pm2 delete hdhive-bot >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs

echo "[deploy] saving pm2 process list..."
pm2 save

echo "[deploy] done. tail logs with: pm2 logs hdhive-bot --lines 100"
