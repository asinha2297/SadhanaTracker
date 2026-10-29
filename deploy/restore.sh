#!/usr/bin/env bash
# Restores a backup made by backup.sh: stops the app, replaces the database with the backup, starts the app.
# Usage: sudo deploy/restore.sh /var/backups/sadhana/sadhana-2026-10-29T220000Z.dump
set -euo pipefail

file=${1:?usage: restore.sh <backup file>}
ENV_FILE=${ENV_FILE:-/etc/sadhana/env}
SERVICE=${SERVICE:-sadhana}

[ -r "$file" ] || { echo "No such file: $file" >&2; exit 1; }
if [ -r "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

systemctl stop "$SERVICE"
trap 'systemctl start "$SERVICE"' EXIT

case "$file" in
  *.dump)
    [ -n "${DATABASE_URL:-}" ] || { echo "DATABASE_URL is not set; this backup is for PostgreSQL" >&2; exit 1; }
    pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$DATABASE_URL" "$file"
    ;;
  *.tar.gz)
    dir=${PGLITE_DIR:-/var/lib/sadhana/pglite}
    rm -rf "$dir"
    tar --extract --gzip --file="$file" --directory="$(dirname "$dir")"
    chown -R sadhana:sadhana "$dir"
    ;;
  *)
    echo "Unknown backup type: $file (expected .dump or .tar.gz)" >&2
    exit 1
    ;;
esac
echo "Restored $file; the app is starting again"
