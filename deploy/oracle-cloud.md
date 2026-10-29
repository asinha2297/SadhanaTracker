# Running the Sadhana Tracker on Oracle Cloud

One small Ubuntu virtual machine runs everything: Caddy terminates HTTPS and proxies to the Node API, which serves the web app and talks to PostgreSQL on the same machine. A systemd timer backs the database up every night, locally and, if you give it a bucket, to OCI Object Storage.

**Always Free only.** Everything here uses Oracle's Always Free resources and nothing paid: one Ampere A1 instance (2 OCPUs and 12 GB, the whole free allowance since Oracle halved it in 2026), its boot volume, and up to 20 GB of Object Storage for backups. No load balancer, no managed database, no account upgrade. Keep the account on the free tier and stay inside the *Always Free-eligible* choices in the console.

Everything below is in the `deploy/` folder of the repository:

| File | Purpose |
|---|---|
| `install.sh` | One-shot setup of a fresh Ubuntu 24.04 server (Node, Caddy, PostgreSQL, the app, services, firewall). Re-runnable. |
| `update.sh` | Deploy the latest commit: pull, build, restart, check. |
| `backup.sh`, `restore.sh` | Nightly backup (run by the timer) and the matching restore. |
| `sadhana.service` | The API under systemd, restarted on failure and on reboot, sandboxed. |
| `sadhana-backup.service`, `sadhana-backup.timer` | The nightly backup at 03:30 IST. |
| `Caddyfile` | HTTPS with automatic Let's Encrypt certificates, compression, access log. |
| `sadhana.env.example` | Every production setting, explained. The real file lives at `/etc/sadhana/env`. |

## 1. Before you start

- A domain name you control (for example `sadhana.yourtemple.org`). HTTPS is not optional: the sign-in cookie is only sent over HTTPS.
- An Oracle Cloud account on the Always Free tier. Know the one catch: Oracle may reclaim an Always Free instance it considers idle (over 7 days, 95th-percentile CPU below 20%, plus network and memory below 20% on A1 shapes; see [Always Free resources](https://docs.oracle.com/en-us/iaas/Content/FreeTier/resourceref.htm)), and a congregation's app will look idle by that measure. The answer within the free tier is not to pay but to be able to rebuild: the nightly backup leaves the instance (section 7), and a fresh instance plus `install.sh` plus `restore.sh` brings the app back in about fifteen minutes (section 10). Some people schedule light CPU work so the instance never looks idle; Oracle does not endorse that, so it is your call.
- Always Free instances can only be created in the account's home region, and A1 capacity there is often exhausted. If creation fails with *Out of host capacity*, try another availability domain or simply try again later; it usually succeeds within a few attempts.
- If the GitHub repository is private, the server needs read access: a deploy key or an HTTPS token in `REPO_URL`.

## 2. Create the instance

1. **Compute → Instances → Create instance.**
2. Image: **Canonical Ubuntu 24.04**. Shape: **VM.Standard.A1.Flex** with **2 OCPUs and 12 GB**, which is the entire Always Free allowance; one instance that uses all of it is the simplest arrangement. The console marks the shape *Always Free-eligible*; if it does not, something is outside the free tier. The AMD Micro shape has 1 GB of memory, which is too little to build the web app.
3. Add your SSH public key. Keep the default boot volume (about 47 GB).
4. Note the public IP address once it is running.

## 3. Open ports 80 and 443 in the cloud firewall

Networking → Virtual cloud networks → your VCN → the subnet's **security list** → **Add ingress rules**:

| Source | Protocol | Destination port |
|---|---|---|
| 0.0.0.0/0 | TCP | 80 |
| 0.0.0.0/0 | TCP | 443 |

The instance's own firewall (Ubuntu images on OCI block everything except SSH) is opened by `install.sh`.

## 4. Point the domain at the server

Create an **A record** for your domain with the instance's public IP. Caddy can only obtain a certificate once `dig +short sadhana.yourtemple.org` answers with that address.

## 5. Install

```bash
ssh ubuntu@<public ip>
sudo apt-get update && sudo apt-get install -y git
git clone https://github.com/asinha2297/SadhanaTracker.git /tmp/sadhana-setup
sudo SADHANA_DOMAIN=sadhana.yourtemple.org ADMIN_PHONE="+91 98450 00001" bash /tmp/sadhana-setup/deploy/install.sh
```

The script takes a few minutes (the web app is built on the server). It ends by printing the first administrator's one-time password. It also:

- installs Node 24 from nodejs.org (checksum verified), Caddy from its official repository and PostgreSQL from Ubuntu;
- creates the `sadhana` system user, the database role and database with a generated password, and `/etc/sadhana/env` with a generated `SESSION_SECRET`;
- clones the repository to `/opt/sadhana`, builds it, installs and starts the services and the backup timer;
- writes `/etc/caddy/Caddyfile` for your domain and opens ports 80 and 443 locally.

Running it again later is safe: it keeps `/etc/sadhana/env`, updates the code and rebuilds.

## 6. First sign-in

1. Open `https://sadhana.yourtemple.org`. If the certificate is not there yet, wait a minute after DNS has propagated and check `sudo journalctl -u caddy -n 30`.
2. Sign in with the administrator's mobile number and the printed one-time password, then choose a new password.
3. Add devotees in **Master admin**; each gets a one-time password to hand over in person.
4. Remove the bootstrap settings: `sudo rm /etc/sadhana/bootstrap.env` (they are ignored once accounts exist, but the password should not linger on disk).

## 7. Backups

Every night at 03:30 IST the timer writes `/var/backups/sadhana/sadhana-<timestamp>.dump` (a `pg_dump` custom-format file) and keeps 14 days of them. That protects against mistakes, not against losing the instance. For an off-site copy:

1. **Storage → Buckets → Create bucket**, private, for example `sadhana-backups` (Always Free includes 20 GB).
2. On the bucket: **Pre-Authenticated Requests → Create**, target *Bucket*, access type *Permit object writes*, expiry one year ahead. Copy the URL; it is shown once.
3. Put it in `/etc/sadhana/env` as `BACKUP_UPLOAD_URL=<that url>` and run `sudo systemctl start sadhana-backup.service`. The file appears in the bucket.
4. Put the expiry date in a calendar: a new request URL is needed before it lapses.

Try a restore once, so the day it matters is not the first time:

```bash
sudo /opt/sadhana/deploy/restore.sh /var/backups/sadhana/sadhana-<timestamp>.dump
```

It stops the app, replaces the database with the backup and starts the app again.

## 8. Updating

```bash
sudo /opt/sadhana/deploy/update.sh
```

Pulls `main`, installs, builds, restarts and waits for the API to answer. Database migrations run on start. Devotees stay signed in; a request that lands during the restart (a few seconds) is retried by the app's offline queue.

## 9. Keeping an eye on it

- **Uptime:** point a free external monitor (UptimeRobot, Better Stack, or similar) at `https://sadhana.yourtemple.org/api/health`, expecting `{"ok":true}`. The endpoint answers 503 when the database does not respond, so one check covers both.
- **Logs:** `sudo journalctl -u sadhana -f` (the API, one JSON line per request), `/var/log/caddy/sadhana.log` (HTTPS access log), `sudo journalctl -u sadhana-backup -n 20` (last backups).
- **Status:** `systemctl status sadhana caddy postgresql sadhana-backup.timer`; disk: `df -h /`.
- **Operating-system updates:** Ubuntu installs security updates automatically (`unattended-upgrades`). Reboot during a quiet hour when `/var/run/reboot-required` exists; every service comes back on its own.

## 10. If something goes wrong

| Symptom | What to do |
|---|---|
| The site does not load, or shows a certificate warning | DNS does not point at the server yet, or ports 80/443 are closed in the VCN security list. `sudo journalctl -u caddy -n 30` shows Caddy's certificate attempts. |
| Caddy shows 502 Bad Gateway | The API is not running: `sudo journalctl -u sadhana -n 50`. A wrong value in `/etc/sadhana/env` is the usual cause; the log says which. |
| The only administrator forgot their password | `sudo -u sadhana bash -c 'set -a; . /etc/sadhana/env; set +a; cd /opt/sadhana && npm run reset-password -w apps/api -- "+91 98450 00001"'` prints a one-time password. (Stop the service first only if the database is PGlite.) |
| The backup service fails | `sudo journalctl -u sadhana-backup -n 20`. Uploads fail when the pre-authenticated request URL has expired; local copies are still written. |
| Disk nearly full | Old backups are pruned after 14 days; `sudo journalctl --vacuum-size=200M` trims logs. |
| The instance was reclaimed as idle, or lost | Create a new one (sections 2 to 4, same domain, update the DNS record), run `install.sh` (section 5), download the newest backup from the bucket and run `restore.sh` (section 7). The app is back in about fifteen minutes; devotees sign in again. |
