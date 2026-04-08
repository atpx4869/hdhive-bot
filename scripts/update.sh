#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$PROJECT_DIR"

echo "[update] update.sh is now an alias of deploy.sh"
exec bash "$PROJECT_DIR/scripts/deploy.sh"
