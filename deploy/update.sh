#!/usr/bin/env bash
# Deploys the latest commit of the branch: pull, install, build, restart, then wait for the API to answer.
# Usage: sudo /opt/sadhana/deploy/update.sh
set -euo pipefail

APP_DIR=${APP_DIR:-/opt/sadhana}
BRANCH=${BRANCH:-main}
SERVICE=${SERVICE:-sadhana}
ENV_FILE=${ENV_FILE:-/etc/sadhana/env}

as_app() { sudo -u sadhana -H env npm_config_cache=/var/cache/sadhana/npm "$@"; }
port=$(set -a; [ -r "$ENV_FILE" ] && . "$ENV_FILE"; echo "${PORT:-3000}")

cd "$APP_DIR"
as_app git fetch --quiet origin "$BRANCH"
as_app git checkout --quiet "$BRANCH"
as_app git merge --quiet --ff-only "origin/$BRANCH"
as_app npm ci --no-audit --no-fund
as_app npm run build
systemctl restart "$SERVICE"

for _ in $(seq 1 30); do
  if curl --fail --silent "http://127.0.0.1:$port/api/health" >/dev/null 2>&1; then
    echo "Deployed $(as_app git rev-parse --short HEAD); the API answers on port $port"
    exit 0
  fi
  sleep 1
done
echo "The API did not answer within 30 seconds. Last log lines:" >&2
journalctl -u "$SERVICE" -n 40 --no-pager >&2
exit 1
