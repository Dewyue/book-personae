#!/usr/bin/env bash
# Deploy book-personae to Aliyun ECS. Build on the server (better-sqlite3).
set -euo pipefail

HOST="${DEPLOY_HOST:-root@8.159.128.193}"
REMOTE_DIR="${DEPLOY_DIR:-/var/www/book-personae}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -d "${ROOT}/private/core" ]; then
  echo "ERROR: private/core missing — refuse to deploy stubs-only build."
  echo "Keep proprietary modules in private/core on this machine."
  exit 1
fi

echo "==> rsync source (incl. private/core) -> ${HOST}:${REMOTE_DIR}"
ssh "$HOST" "mkdir -p '${REMOTE_DIR}/data/uploads' '${REMOTE_DIR}/private'"
rsync -avz --delete \
  --exclude node_modules \
  --exclude .next \
  --exclude data \
  --exclude .git \
  --exclude .env.local \
  --exclude .vercel \
  "${ROOT}/" "${HOST}:${REMOTE_DIR}/"

echo "==> remote install + build + pm2"
ssh "$HOST" bash -s <<REMOTE
set -euo pipefail
cd '${REMOTE_DIR}'
mkdir -p data/uploads
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run build
if command -v pm2 >/dev/null 2>&1; then
  pm2 startOrReload deploy/ecosystem.config.cjs
  pm2 save
else
  echo "pm2 not found; start manually: cd ${REMOTE_DIR} && npm start"
fi
REMOTE

echo "Done. Check https://bookpersonae.dewyue.com"
