#!/usr/bin/env bash
# Sets up the Sharanagati Sadhana Tracker on a fresh Ubuntu 24.04 server (an Oracle Cloud instance, for one):
# Node 24, Caddy (automatic HTTPS), PostgreSQL, the app under /opt/sadhana as the `sadhana` user, systemd units,
# a nightly backup timer and the firewall openings for 80/443. Safe to run again: it keeps /etc/sadhana/env.
#
#   sudo SADHANA_DOMAIN=sadhana.example.org ADMIN_PHONE="+91 98450 00001" bash deploy/install.sh
#
# Optional: REPO_URL (default: the GitHub repository), BRANCH (main), DATABASE=postgres|pglite (postgres).
set -euo pipefail

REPO_URL=${REPO_URL:-https://github.com/asinha2297/SadhanaTracker.git}
BRANCH=${BRANCH:-main}
DATABASE=${DATABASE:-postgres}
APP_DIR=/opt/sadhana
ENV_DIR=/etc/sadhana
ENV_FILE=$ENV_DIR/env
BOOTSTRAP_FILE=$ENV_DIR/bootstrap.env
NPM_CACHE=/var/cache/sadhana/npm

die() { echo "install.sh: $*" >&2; exit 1; }
step() { echo; echo "== $*"; }

[ "$(id -u)" = 0 ] || die "run as root: sudo bash deploy/install.sh"
if [ -r /etc/os-release ]; then
  # shellcheck disable=SC1091
  . /etc/os-release
  [ "${ID:-}" = ubuntu ] && [ "${VERSION_ID:-}" = 24.04 ] || echo "Note: written for Ubuntu 24.04; found ${PRETTY_NAME:-unknown}. Continuing."
fi
[ -n "${SADHANA_DOMAIN:-}" ] || read -r -p "Domain name that points at this server (e.g. sadhana.example.org): " SADHANA_DOMAIN
[ -n "${SADHANA_DOMAIN:-}" ] || die "SADHANA_DOMAIN is required"
[ -n "${ADMIN_PHONE:-}" ] || read -r -p "Mobile number of the first administrator (e.g. +91 98450 00001): " ADMIN_PHONE
[ -n "${ADMIN_PHONE:-}" ] || die "ADMIN_PHONE is required"
case "$DATABASE" in postgres | pglite) ;; *) die "DATABASE must be postgres or pglite" ;; esac

step "Packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl git gnupg xz-utils debian-keyring debian-archive-keyring apt-transport-https

step "Node 24"
install_node() {
  if [ -x /usr/local/bin/node ] && /usr/local/bin/node -v | grep -q '^v24\.'; then
    echo "Node $(/usr/local/bin/node -v) is already installed"
    return
  fi
  local arch tmp tarball dir
  case "$(uname -m)" in
    x86_64) arch=x64 ;;
    aarch64 | arm64) arch=arm64 ;;
    *) die "unsupported CPU architecture: $(uname -m)" ;;
  esac
  tmp=$(mktemp -d)
  curl -fsSL https://nodejs.org/dist/latest-v24.x/SHASUMS256.txt -o "$tmp/SHASUMS256.txt"
  tarball=$(grep -o "node-v24\.[0-9.]*-linux-$arch\.tar\.xz" "$tmp/SHASUMS256.txt" | head -n 1)
  [ -n "$tarball" ] || die "no Node 24 build for linux-$arch"
  curl -fsSL "https://nodejs.org/dist/latest-v24.x/$tarball" -o "$tmp/$tarball"
  (cd "$tmp" && grep " $tarball\$" SHASUMS256.txt | sha256sum --check --quiet -)
  mkdir -p /usr/local/lib/nodejs
  tar -xJf "$tmp/$tarball" -C /usr/local/lib/nodejs
  dir="/usr/local/lib/nodejs/${tarball%.tar.xz}"
  ln -sfn "$dir/bin/node" /usr/local/bin/node
  ln -sfn "$dir/bin/npm" /usr/local/bin/npm
  ln -sfn "$dir/bin/npx" /usr/local/bin/npx
  rm -rf "$tmp"
  echo "Installed Node $(/usr/local/bin/node -v)"
}
install_node

step "Caddy"
if ! command -v caddy >/dev/null; then
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -q
  apt-get install -y -q caddy
fi

step "Application user and code"
id sadhana >/dev/null 2>&1 || useradd --system --no-create-home --home-dir "$APP_DIR" --shell /usr/sbin/nologin sadhana
mkdir -p "$NPM_CACHE"
chown -R sadhana:sadhana "$(dirname "$NPM_CACHE")"
as_app() { sudo -u sadhana -H env npm_config_cache=$NPM_CACHE "$@"; }
if [ -d "$APP_DIR/.git" ]; then
  (cd "$APP_DIR" && as_app git fetch --quiet origin "$BRANCH" && as_app git checkout --quiet "$BRANCH" && as_app git merge --quiet --ff-only "origin/$BRANCH")
else
  [ ! -e "$APP_DIR" ] || die "$APP_DIR exists but is not a git checkout"
  mkdir -p "$APP_DIR"
  chown sadhana:sadhana "$APP_DIR"
  as_app git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

step "Settings in $ENV_FILE"
mkdir -p "$ENV_DIR"
if [ "$DATABASE" = postgres ]; then
  apt-get install -y -q postgresql
  systemctl enable --quiet --now postgresql
fi
if [ -f "$ENV_FILE" ]; then
  echo "Keeping the existing $ENV_FILE"
else
  DATABASE_URL=""
  if [ "$DATABASE" = postgres ]; then
    db_password=$(openssl rand -hex 24)
    if sudo -u postgres psql -tAc "select 1 from pg_roles where rolname = 'sadhana'" | grep -q 1; then
      sudo -u postgres psql -q -v ON_ERROR_STOP=1 -c "alter role sadhana password '$db_password'"
    else
      sudo -u postgres psql -q -v ON_ERROR_STOP=1 -c "create role sadhana login password '$db_password'"
    fi
    sudo -u postgres psql -tAc "select 1 from pg_database where datname = 'sadhana'" | grep -q 1 ||
      sudo -u postgres psql -q -v ON_ERROR_STOP=1 -c "create database sadhana owner sadhana"
    DATABASE_URL="postgres://sadhana:$db_password@127.0.0.1:5432/sadhana"
  fi
  cat > "$ENV_FILE" <<EOF
# Production settings for the Sadhana Tracker API; see deploy/sadhana.env.example for every option.
# Restart after changes: sudo systemctl restart sadhana
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
SESSION_SECRET=$(openssl rand -base64 48 | tr -d '\n')
DATABASE_URL=$DATABASE_URL
TRUST_PROXY=1
# BACKUP_UPLOAD_URL=
EOF
  chown root:sadhana "$ENV_FILE"
  chmod 0640 "$ENV_FILE"
  echo "Wrote $ENV_FILE"
fi
if [ ! -f "$BOOTSTRAP_FILE" ]; then
  cat > "$BOOTSTRAP_FILE" <<EOF
BOOTSTRAP_ADMIN_PHONE=$ADMIN_PHONE
BOOTSTRAP_ADMIN_PASSWORD=hari-$(openssl rand -hex 3)-$(openssl rand -hex 3)
EOF
  chmod 0600 "$BOOTSTRAP_FILE"
fi

DATABASE_URL=$(sed -n 's/^DATABASE_URL=//p' "$ENV_FILE")

step "Build"
(cd "$APP_DIR" && as_app npm ci --no-audit --no-fund && as_app npm run build)

step "Services"
install -m 0644 "$APP_DIR/deploy/sadhana.service" "$APP_DIR/deploy/sadhana-backup.service" "$APP_DIR/deploy/sadhana-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --quiet sadhana sadhana-backup.timer
systemctl restart sadhana
systemctl start sadhana-backup.timer
sed "s/sadhana\.example\.org/$SADHANA_DOMAIN/" "$APP_DIR/deploy/Caddyfile" > /etc/caddy/Caddyfile
systemctl enable --quiet caddy
systemctl reload caddy 2>/dev/null || systemctl restart caddy

step "Firewall: ports 80 and 443"
if command -v iptables >/dev/null; then
  for port in 80 443; do
    iptables -C INPUT -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT 2>/dev/null ||
      iptables -I INPUT 1 -p tcp --dport "$port" -m conntrack --ctstate NEW -j ACCEPT
  done
  command -v netfilter-persistent >/dev/null && netfilter-persistent save >/dev/null
fi
if command -v ufw >/dev/null && ufw status | grep -q '^Status: active'; then
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
fi

step "Health"
port=$(set -a; . "$ENV_FILE"; echo "${PORT:-3000}")
for _ in $(seq 1 30); do
  curl --fail --silent "http://127.0.0.1:$port/api/health" >/dev/null 2>&1 && break
  sleep 1
done
curl --fail --silent "http://127.0.0.1:$port/api/health" >/dev/null || { journalctl -u sadhana -n 40 --no-pager >&2; die "the API did not start; see the log above"; }

bootstrap_password=$(sed -n 's/^BOOTSTRAP_ADMIN_PASSWORD=//p' "$BOOTSTRAP_FILE")
if [ -n "$DATABASE_URL" ]; then database_note="PostgreSQL on this machine"; else database_note="PGlite in /var/lib/sadhana/pglite"; fi
cat <<EOF

Sharanagati Sadhana Tracker is installed and running.

  Site            https://$SADHANA_DOMAIN  (the certificate appears once the domain's DNS points at this server
                  and port 80/443 are open in the cloud firewall; see deploy/oracle-cloud.md)
  First sign-in   mobile number $ADMIN_PHONE, one-time password: $bootstrap_password
                  Then choose a new password, add devotees in Master admin, and remove the bootstrap settings:
                  sudo rm $BOOTSTRAP_FILE
  Database        $database_note
  Backups         nightly at 03:30 IST to /var/backups/sadhana (14 days). For off-site copies set
                  BACKUP_UPLOAD_URL in $ENV_FILE. Test: sudo systemctl start sadhana-backup.service
  Updates         sudo $APP_DIR/deploy/update.sh
  Logs            journalctl -u sadhana -f
EOF
