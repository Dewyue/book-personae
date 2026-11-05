#!/usr/bin/env bash
# Run ON the Ubuntu server (or via: workbench exec ... -- bash setup-server.sh)
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/book-personae}"
DOMAIN="${DOMAIN:-bookpersonae.dewyue.com}"
PORT="${PORT:-3010}"

echo "==> Node / pm2"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2
fi

echo "==> App dir ${APP_DIR}"
mkdir -p "${APP_DIR}/data/uploads"

if [ -f "${APP_DIR}/package.json" ]; then
  cd "${APP_DIR}"
  npm ci
  npm run build
  pm2 startOrReload deploy/ecosystem.config.cjs
  pm2 save
  env PATH="$PATH" pm2 startup systemd -u root --hp /root >/tmp/pm2-startup.txt || true
fi

echo "==> Nginx site for ${DOMAIN}"
if [ -f "${APP_DIR}/deploy/nginx-bookpersonae.dewyue.com.conf" ]; then
  cp "${APP_DIR}/deploy/nginx-bookpersonae.dewyue.com.conf" \
    "/etc/nginx/sites-available/${DOMAIN}"
  ln -sfn "/etc/nginx/sites-available/${DOMAIN}" \
    "/etc/nginx/sites-enabled/${DOMAIN}"
  nginx -t
  systemctl reload nginx
fi

if command -v certbot >/dev/null 2>&1; then
  echo "==> TLS via certbot"
  certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos \
    --register-unsafely-without-email --redirect || \
    echo "certbot skipped/failed — run manually after DNS is ready"
else
  echo "certbot not installed; apt-get install -y certbot python3-certbot-nginx"
fi

echo "Setup done. Visit https://${DOMAIN}"
