#!/usr/bin/env bash
# Backs up the Sadhana Tracker database: pg_dump for PostgreSQL, or a copy of the PGlite folder (the app is
# stopped for the few seconds that takes). Keeps KEEP_DAYS of files in BACKUP_DIR and, when BACKUP_UPLOAD_URL
# is set, uploads each file there with one HTTP PUT (an OCI Object Storage pre-authenticated request URL for
# the bucket works as is). Run by sadhana-backup.timer nightly; run it by hand any time: sudo deploy/backup.sh
set -euo pipefail

ENV_FILE=${ENV_FILE:-/etc/sadhana/env}
BACKUP_DIR=${BACKUP_DIR:-/var/backups/sadhana}
KEEP_DAYS=${KEEP_DAYS:-14}
SERVICE=${SERVICE:-sadhana}

if [ -r "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE"
  set +a
fi

umask 077
mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y-%m-%dT%H%M%SZ)

if [ -n "${DATABASE_URL:-}" ]; then
  file="$BACKUP_DIR/sadhana-$stamp.dump"
  pg_dump --format=custom --no-owner --no-privileges --file="$file" "$DATABASE_URL"
else
  dir=${PGLITE_DIR:-/var/lib/sadhana/pglite}
  file="$BACKUP_DIR/sadhana-$stamp.tar.gz"
  systemctl stop "$SERVICE"
  trap 'systemctl start "$SERVICE"' EXIT
  tar --create --gzip --file="$file" --directory="$(dirname "$dir")" "$(basename "$dir")"
fi

if [ -n "${BACKUP_UPLOAD_URL:-}" ]; then
  curl --fail --silent --show-error --retry 3 --upload-file "$file" "${BACKUP_UPLOAD_URL%/}/$(basename "$file")"
fi

find "$BACKUP_DIR" -name 'sadhana-*' -type f -mtime +"$KEEP_DAYS" -delete
echo "Backed up to $file ($(du -h "$file" | cut -f1))"
