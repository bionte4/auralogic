# Panduan operasi

Ini tata letak production Auralogic di satu VPS Ubuntu. Pekerjaan harian ada di [panduan peserta](student-guide.md), [panduan instruktur](instructor-guide.md), dan [panduan admin](admin-guide.md). Alur keputusannya ada di [alur proses](process-flow.md).

| Nama publik | Menuju | Proses |
| --- | --- | --- |
| `auralogic.web.id` | `127.0.0.1:3000` lewat Nginx | Next.js |
| `api.auralogic.web.id` | `127.0.0.1:3001` lewat Nginx | NestJS |
| PostgreSQL dan Redis | Jaringan Docker `fluentis` saja | tidak dapat dijangkau dari internet |

Kontainer API menerapkan `schema.prisma` dengan `prisma db push` setiap kali mulai. Buat cadangan basis data sebelum mengubah skema. Kontainer tidak mengisi kursus demo.

Basis data baru tidak membutuhkan `backend/prisma/domain-migration.sql`. Berkas itu hanya untuk basis data lama yang masih menyimpan jenjang CEFR.

## 1. Server

Pakai Ubuntu dengan RAM minimal 2 GB. Image API memasang Chromium agar dapat merender PDF sertifikat.

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"
sudo apt install -y nginx certbot
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Jika `docker-compose-plugin` bentrok dengan `docker-compose-v2` Ubuntu, pertahankan paket Ubuntu. `docker compose version` sudah cukup.

Biarkan port 3000, 3001, 5432, dan 6379 tertutup. Compose sudah mengikat web dan API ke `127.0.0.1`.

## 2. DNS

Kedua nama harus berupa record A ke alamat VPS yang sama.

| Nama | Tipe | Nilai |
| --- | --- | --- |
| `auralogic.web.id` | A | IP publik VPS ini |
| `api.auralogic.web.id` | A | IP yang sama |

Periksa dari luar VPS, karena resolver VPS dapat menyimpan alamat lama:

```bash
dig +short api.auralogic.web.id @8.8.8.8
```

## 3. Lingkungan

```bash
sudo mkdir -p /opt/auralogic
sudo chown "$USER":"$USER" /opt/auralogic
git clone https://github.com/bionte4/auralogic.git /opt/auralogic
cd /opt/auralogic
cp deploy/env.example .env
```

Isi nilai ini sebelum build pertama:

```bash
FRONTEND_ORIGIN=https://auralogic.web.id
NEXT_PUBLIC_API_URL=https://api.auralogic.web.id/api
COOKIE_SAMESITE=lax
COOKIE_SECURE=true
COOKIE_DOMAIN=.auralogic.web.id
POSTGRES_PASSWORD=<openssl rand -hex 24>
JWT_SECRET=<openssl rand -hex 32>
```

`POSTGRES_PASSWORD` dan `JWT_SECRET` harus huruf dan angka. Mengganti `JWT_SECRET` mengeluarkan semua sesi yang sedang berjalan.

`POSTGRES_USER` dan `POSTGRES_DB` boleh tetap `fluentis`, atau keduanya diganti `auralogic` sebelum `docker compose up` yang pertama. Kolom kata sandi yang kosong tidak aman: Compose mengisinya dengan `fluentis` lewat `${POSTGRES_PASSWORD:-fluentis}`. Setelah volume Postgres ada, mengubah `.env` tidak mengganti nama basis data dan tidak mengganti kata sandi yang sudah tersimpan. Menggantinya berarti menghapus volume, dan data di dalamnya hilang.

`MIDTRANS_SERVER_KEY` berasal dari dasbor Midtrans. Pakai kunci sandbox saat uji, dan set `MIDTRANS_IS_PRODUCTION=true` hanya untuk kunci hidup.

Biarkan `VIDEO_MODE=mock` sampai kredensial Cloudflare Stream siap. Dalam mode itu, pelajaran yang boleh diputar memakai aliran uji, bukan berkas `.mp4` di dalam kursus. Biarkan `MAIL_PROVIDER=log` sampai Resend dikonfigurasi. Pesan atur ulang kata sandi lalu muncul di `sudo docker compose logs backend`. Berkas pelajaran tinggal di volume `attachment_data` selama `ATTACHMENT_STORAGE=local`. Nama volume di host mengikuti nama proyek Compose, yaitu `auralogic_attachment_data` jika direktori instalasinya `/opt/auralogic`.

Layar Settings di admin menyimpan nilai SMTP, AI, Cloudflare, dan pembayaran. Checkout, surat, dan pemutaran video tetap membaca berkas `.env` ini. Menyimpan layar itu tidak memindahkan gerbang yang sedang hidup.

Cookie sesi tetap bernama `fluentis_access` dan `fluentis_csrf`.

## 4. Mulai

```bash
cd /opt/auralogic
sudo docker compose up -d --build
sudo docker compose ps
curl -fsS http://127.0.0.1:3001/api/health
```

Isi health adalah `{"status":"ok"}`. Build API pertama lambat karena mengunduh Chromium.

Jika API berhenti dengan `Prisma Client could not locate the Query Engine`, tarik `main` terbaru lalu build lagi. Image harus menghasilkan klien untuk `debian-openssl-3.0.x`.

## 5. HTTPS

Pasang Nginx, lalu layani kedua nama di port 80. Berkas situs meneruskan web dan API, dan juga membuka `/.well-known/acme-challenge/`.

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

Certbot menyunting berkas Nginx yang hidup dan menambahkan HTTPS. Jangan menimpa `/etc/nginx/sites-available/auralogic.conf` dengan salinan HTTP dari repositori setelah sertifikat ada. `git pull` tidak mengubah `/etc/nginx`.

`curl` lokal yang melaporkan nama sertifikat tidak cocok biasanya cache DNS VPS. Periksa `@8.8.8.8`, atau panggil curl dengan `--resolve api.auralogic.web.id:443:<ip-vps>`.

## 6. Pembayaran

Di dasbor Midtrans, set URL notifikasi ke:

`https://api.auralogic.web.id/api/payments/midtrans/notification`

Membuka alamat itu di peramban mengirim GET dan menampilkan `{"status":"ok","accept":"POST"}`. Midtrans mengirim POST. POST kosong mengembalikan `400 Invalid notification body`. Notifikasi yang tanda tangannya sah menandai pendaftaran sebagai lunas.

Callback Xendit, jika penyedia itu yang dipilih:

- `https://api.auralogic.web.id/api/payments/xendit/invoices`
- `https://api.auralogic.web.id/api/payments/xendit/qris`

Akses terbuka hanya setelah notifikasi yang terverifikasi cocok dengan jumlah yang tersimpan. URL kembali peramban tidak mendaftarkan peserta.

## 7. Admin pertama

Pendaftaran di situs hanya membuat peserta. Buat admin pertama sekali, di dalam kontainer API. Ganti `ADMIN_PASSWORD` sebelum menjalankan perintah. Kata sandi tidak disimpan di repositori.

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

Masuk di `https://auralogic.web.id/instructor/login`. Pekerjaan admin sehari-hari ada di [panduan admin](admin-guide.md). Pertahankan sedikitnya satu super admin yang aktif. Menjalankan ulang perintah dengan `ADMIN_PASSWORD` baru mengganti kata sandi akun itu.

## 8. Kursus demo

Langkah ini opsional. Skrip `backend/prisma/seed-demo.cjs` membuat 12 kursus, tiga tiap jalur: dua terbit dan satu draf. Tiap kursus punya satu pelajaran video dan satu kuis defensif. Hanya `network-foundation` yang sudah lunas untuk `student@fluentis.test`. Beranda menampilkan delapan kursus terbit.

Skrip berhenti jika dua akun ini belum ada: `instructor@fluentis.test` dan `student@fluentis.test`. Di dalam kontainer, skrip juga menulis sampul ke `/frontend/public/covers`. Buat direktori itu sebagai root sebelum menjalankan skrip. Sampul yang dilihat pengunjung sudah ada di image frontend. Tulisan di kontainer API hanya agar skrip tidak gagal.

Ganti `DEMO_PASSWORD` sebelum menjalankan perintah.

```bash
cd /opt/auralogic
sudo docker compose exec -u root backend mkdir -p /frontend/public/covers
sudo docker compose exec -u root backend chown -R node:node /frontend
sudo docker compose exec \
  -e DEMO_PASSWORD='' \
  backend node -e '
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();
bcrypt.hash(process.env.DEMO_PASSWORD, 12).then(async (passwordHash) => {
  await prisma.user.upsert({
    where: { email: "instructor@fluentis.test" },
    update: { passwordHash, role: "INSTRUCTOR", active: true, name: "Auralogic Studio" },
    create: { email: "instructor@fluentis.test", passwordHash, role: "INSTRUCTOR", name: "Auralogic Studio" },
  });
  await prisma.user.upsert({
    where: { email: "student@fluentis.test" },
    update: { passwordHash, role: "STUDENT", active: true, name: "Peserta Demo" },
    create: { email: "student@fluentis.test", passwordHash, role: "STUDENT", name: "Peserta Demo" },
  });
  await prisma.$disconnect();
});
'
sudo docker compose exec backend node prisma/seed-demo.cjs
```

Peserta demo masuk di `/student/login`. Instruktur demo masuk di `/instructor/login`. Akun admin production tetap akun dari bagian 7.

## 9. Pembaruan

```bash
cd /opt/auralogic
git pull
sudo docker compose up -d --build
```

Build frontend lagi setiap kali `NEXT_PUBLIC_API_URL` berubah. Baca log API dengan `sudo docker compose logs -f backend`.

## 10. Cadangan

Buang basis data dari jaringan Compose. Nama pengguna dan nama basis data mengikuti `.env`.

```bash
cd /opt/auralogic
sudo docker compose exec -T postgres \
  pg_dump -U fluentis fluentis > "auralogic-$(date +%F).sql"
```

Jika `POSTGRES_USER` atau `POSTGRES_DB` diubah sebelum boot pertama, pakai kedua nama itu di `pg_dump`, bukan `fluentis`.

Unggahan pelajaran ada di volume Docker `auralogic_attachment_data`. Salin volume itu juga jika lampiran harus disimpan. Redis dapat dibangun ulang dari PostgreSQL jika hilang. Aplikasi tetap jalan tanpa Redis, lalu memakai basis data untuk setiap pembacaan.
