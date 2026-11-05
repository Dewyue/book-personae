#!/usr/bin/env bash
# Deploy via Aliyun Workbench CLI (no public SSH key needed).
set -euo pipefail

INSTANCE="${INSTANCE_ID:?Set INSTANCE_ID=i-xxx}"
REGION="${REGION:-cn-hangzhou}"
REMOTE_DIR="/var/www/book-personae"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="${HOME}/.local/bin:${PATH}"

WB=(workbench -r "$REGION")

echo "==> packing source"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
tar -C "$ROOT" -czf "$TMP/book-personae.tgz" \
  --exclude node_modules --exclude .next --exclude data --exclude .git \
  --exclude .env.local --exclude .vercel .

echo "==> upload"
"${WB[@]}" upload "$TMP/book-personae.tgz" --instance "$INSTANCE" --target /tmp/book-personae.tgz

echo "==> remote extract + build"
"${WB[@]}" exec --instance "$INSTANCE" -- bash -lc "
set -euo pipefail
mkdir -p '${REMOTE_DIR}/data/uploads'
tar -xzf /tmp/book-personae.tgz -C '${REMOTE_DIR}'
cd '${REMOTE_DIR}'
npm ci
npm run build
bash deploy/setup-server.sh
"
echo "Done."
