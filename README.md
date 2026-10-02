# Fluentis

Fluentis is an English learning platform. Students move through a course one level at a time. The API refuses a lesson when the previous level is still incomplete. Video is streamed as encrypted HLS, and a paid enrollment is activated only after a verified payment notification.

The web app and the API are separate services.

| Service | Local | Production |
| --- | --- | --- |
| Web (Next.js) | http://localhost:3000 | https://fluentis.web.id |
| API (NestJS) | http://localhost:3001/api | https://api.fluentis.web.id/api |
| PostgreSQL | inside Compose, not published | inside Compose, not published |
| Redis | inside Compose, not published | inside Compose, not published |

## Guides

- [Operations](docs/operations.md) covers the VPS, environment, HTTPS, payments, backups, and updates.
- [Students](docs/student-guide.md) covers registration, learning, quizzes, and certificates.
- [Instructors](docs/instructor-guide.md) covers course building, publishing, and class materials.
- [Admins](docs/admin-guide.md) covers users, bulk enroll, finance, and settings.

## Roles

| Role | Signs in at | Can do |
| --- | --- | --- |
| Student | `/student/login` | Buy a course, learn in order, download lesson files, receive a certificate |
| Instructor | `/instructor/login` | Create courses, levels, lessons, quizzes, and file attachments |
| Super admin | `/instructor/login` | Everything an instructor can do, plus users, finance, and settings |

Public registration always creates a student. A super admin promotes an account to instructor.

## Run with Docker

```bash
cp deploy/env.example .env
docker compose up -d --build
```

Set `JWT_SECRET` to at least 32 characters before the first start. `NEXT_PUBLIC_API_URL` is copied into the web image at build time. Change it, then build the frontend again.

Health check: `curl -fsS http://127.0.0.1:3001/api/health` returns `{"status":"ok"}`.

## Run on the laptop without Docker

PostgreSQL must already be running. Copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`.

```bash
cd backend
npx prisma generate
npx prisma db push
set -a && source .env && set +a
npm run start:dev
```

```bash
cd frontend
npm run dev
```

The API reads environment variables from the shell. Next.js reads `frontend/.env` by itself.

Do not commit `.env` files. `masterprompt.md` stays on the machine that edits the product and is listed in `.gitignore`.
