# Operations guide

This is the production layout for Auralogic on one Ubuntu VPS.

| Public name | Points at | Process |
| --- | --- | --- |
| `auralogic.web.id` | `127.0.0.1:3000` through Nginx | Next.js |
| `api.auralogic.web.id` | `127.0.0.1:3001` through Nginx | NestJS |
| PostgreSQL and Redis | Docker network `fluentis` only | not reachable from the internet |

The API container applies `schema.prisma` with `prisma db push` every time it starts. Keep a database backup before a schema change.

## 1. Server

Use Ubuntu with at least 2 GB of RAM. The API image installs Chromium so it can render certificate PDFs.

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
sudo apt install -y nginx certbot
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

If `docker-compose-plugin` conflicts with Ubuntu's `docker-compose-v2`, keep the Ubuntu package. `docker compose version` is enough.

Leave ports 3000, 3001, 5432, and 6379 closed. Compose already binds the web and API to `127.0.0.1`.

## 2. DNS

Both names must be A records to the same VPS address.

| Name | Type | Value |
| --- | --- | --- |
| `auralogic.web.id` | A | public IP of this VPS |
| `api.auralogic.web.id` | A | the same IP |

Confirm from outside the VPS, because the VPS resolver can keep an old address:

```bash
dig +short api.auralogic.web.id @8.8.8.8
```

## 3. Environment

```bash
sudo mkdir -p /opt/auralogic
sudo chown "$USER":"$USER" /opt/auralogic
git clone https://github.com/bionte4/auralogic.git /opt/auralogic
cd /opt/auralogic
cp deploy/env.example .env
```

Set these before the first build:

```bash
FRONTEND_ORIGIN=https://auralogic.web.id
NEXT_PUBLIC_API_URL=https://api.auralogic.web.id/api
COOKIE_SAMESITE=lax
COOKIE_SECURE=true
COOKIE_DOMAIN=.auralogic.web.id
POSTGRES_PASSWORD=<openssl rand -hex 24>
JWT_SECRET=<openssl rand -hex 32>
```

`POSTGRES_PASSWORD` and `JWT_SECRET` must be letters and numbers. Replacing `JWT_SECRET` signs every current session out.

`MIDTRANS_SERVER_KEY` comes from the Midtrans dashboard. Use the sandbox key while testing, and set `MIDTRANS_IS_PRODUCTION=true` only for the live key.

Leave `VIDEO_MODE=mock` until Cloudflare Stream credentials are ready. Leave `MAIL_PROVIDER=log` until Resend is configured. Password-reset messages then appear in `sudo docker compose logs backend`. Lesson files stay on the `attachment_data` volume while `ATTACHMENT_STORAGE=local`.

The Settings screen in the admin UI stores SMTP, AI, Cloudflare, and payment values. Checkout, mail, and video playback still read this `.env` file. Saving the screen does not switch the live gateway.

## 4. Start

```bash
cd /opt/auralogic
sudo docker compose up -d --build
sudo docker compose ps
curl -fsS http://127.0.0.1:3001/api/health
```

The health body is `{"status":"ok"}`. The first API build is slow because it downloads Chromium.

If the API exits with `Prisma Client could not locate the Query Engine`, pull the latest `main` and build again. The image must generate the client for `debian-openssl-3.0.x`.

## 5. HTTPS

Install Nginx, then serve both names on port 80. The site file proxies the web app and the API and also exposes `/.well-known/acme-challenge/`.

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo rm -f /etc/nginx/sites-enabled/default
sudo cp deploy/nginx/auralogic.conf /etc/nginx/sites-available/auralogic.conf
sudo ln -sf /etc/nginx/sites-available/auralogic.conf /etc/nginx/sites-enabled/auralogic.conf
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d auralogic.web.id -d api.auralogic.web.id
sudo systemctl enable --now certbot.timer
curl -fsS https://api.auralogic.web.id/api/health
```

A local `curl` that reports a certificate name mismatch is usually the VPS DNS cache. Check `@8.8.8.8`, or call curl with `--resolve api.auralogic.web.id:443:<vps-ip>`.

## 6. Payments

In the Midtrans dashboard set the notification URL to:

`https://api.auralogic.web.id/api/payments/midtrans/notification`

Opening that address in a browser sends GET and shows `{"status":"ok","accept":"POST"}`. Midtrans sends POST. An empty POST returns `400 Invalid notification body`. A signed notification is what marks an enrollment paid.

Xendit callbacks, when that provider is selected:

- `https://api.auralogic.web.id/api/payments/xendit/invoices`
- `https://api.auralogic.web.id/api/payments/xendit/qris`

Access opens only after the verified notification matches the stored amount. The browser return URL does not enroll the student.

## 7. First super admin

Registration on the website creates students only. Create the first super admin once, inside the API container:

```bash
cd /opt/auralogic
sudo docker compose exec \
  -e ADMIN_EMAIL='admin@auralogic.web.id' \
  -e ADMIN_NAME='Auralogic Admin' \
  -e ADMIN_PASSWORD='' \
  backend node -e '
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
const email = process.env.ADMIN_EMAIL.trim().toLowerCase();
bcrypt.hash(process.env.ADMIN_PASSWORD, 12).then((passwordHash) =>
  prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: "SUPER_ADMIN", active: true, name: process.env.ADMIN_NAME },
    create: { email, passwordHash, role: "SUPER_ADMIN", name: process.env.ADMIN_NAME },
  })
).then(() => prisma.$disconnect());
'
```

Sign in at `https://auralogic.web.id/instructor/login`. Day-to-day admin work is described in the [admin guide](admin-guide.md). Keep at least one active super admin.

## 8. Updates

```bash
cd /opt/auralogic
git pull
sudo docker compose up -d --build
```

Build the frontend again whenever `NEXT_PUBLIC_API_URL` changes. Read the API log with `sudo docker compose logs -f backend`.

## 9. Backup

Dump the database from the Compose network:

```bash
cd /opt/auralogic
sudo docker compose exec -T postgres \
  pg_dump -U fluentis fluentis > "fluentis-$(date +%F).sql"
```

Lesson uploads live in the Docker volume `fluentis_attachment_data`. Copy that volume as well when attachments must be kept. Redis can be rebuilt from PostgreSQL if it is lost. The app continues without Redis and then uses the database for every read.
