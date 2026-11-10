# Sweety – Blood Glucose Tracker

A small web app where a person with diabetes records up to four blood glucose readings a day and views daily, month-to-date and previous-month reports. Doctors can view the reports of patients who have shared them.

**Stack:** Node.js + Express 5 · PostgreSQL · React (Vite) · Redis (cache) · BullMQ (background job) · JWT auth with bcrypt-hashed passwords

## Features

| Area | What's included |
| --- | --- |
| Auth | Register / log in, bcrypt password hashing, JWT sessions. Every query is scoped to the logged-in user. |
| Readings | Add, view, edit, delete. Four slots: Morning (fasting), After breakfast, After lunch, After dinner. |
| Validation | Required value, whole number 40–600, one reading per slot per day, max 4 per day, no future dates. Clear messages in the UI. |
| Reports | Daily (with each reading and its slot), Month-to-date, Previous month. Highest, lowest, average (1 decimal) and count, plus a friendly empty state. |
| **Bonus – pagination** | `GET /api/readings?page=1&limit=20` (+ an "All readings" table in the UI). |
| **Bonus – charts** | Line chart of the month's readings (Recharts), one line per slot. |
| **Bonus – Docker** | `docker-compose.yml` starts PostgreSQL, Redis, the API, the worker and the web app. |
| **Bonus – frontend tests** | React Testing Library tests for the reading form, report panel and sign-up. |
| **Bonus – Redis caching** | Report results cached in Redis; the cache is invalidated whenever a reading is added, edited or deleted. |
| **Bonus – BullMQ job** | A worker runs daily and logs a reminder for every patient with fewer than 4 readings today. |
| **Bonus – Doctor role** | Doctor accounts view reports of patients assigned to them (read-only). Patients assign doctors themselves. |

## Run it

### Option A – everything in Docker

```bash
docker compose up --build
```

Open <http://localhost:8080>. The API is on <http://localhost:4000>. Watch the reminder worker with `docker compose logs -f worker`.

### Option B – local development

Requires Node 20+ and Docker (only for the databases).

```bash
# 1. PostgreSQL + Redis
docker compose up -d db redis

# 2. API  (http://localhost:4000)
cd server
cp .env.example .env
npm install
npm run dev          # creates the tables automatically on start

# 3. Reminder worker (separate terminal, optional)
npm run worker

# 4. Frontend  (http://localhost:5173, proxies /api to the API)
cd ../client
npm install
npm run dev
```

Redis is optional for the API: with no `REDIS_URL` it simply skips caching. The worker needs Redis.

## Bonus features in detail

### Redis report caching + invalidation

- Reports are cached per user, per report type and date, with a TTL (`REPORT_CACHE_TTL`, default 10 minutes).
- Every successful **POST / PUT / DELETE** on `/api/readings` invalidates that user's cached reports.
- Invalidation works by bumping a per-user version number (`reports:ver:<userId>`) that is part of every cache key, so old entries become unreachable instantly and expire on their own. This also avoids a race where a slow request could re-cache stale data after a change.
- Report responses carry an `X-Cache: HIT | MISS | BYPASS` header so you can see it working:

  ```bash
  curl -si -H "Authorization: Bearer $TOKEN" "localhost:4000/api/reports/daily?date=2026-10-15" | grep -i x-cache
  ```
- The cache is best-effort: if Redis is down, requests fall back to the database (`BYPASS`) instead of failing.
- Doctors viewing a patient's report share the patient's cache entries, and those are cleared when the patient changes a reading.

### BullMQ daily reminder

- `npm run worker` starts `src/worker.js`, which registers a repeatable job (default **8 PM** in `APP_TIMEZONE`, change with `REMINDER_CRON`) and processes it.
- The job finds every **patient** with fewer than 4 readings for today and logs a line such as:
  `[reminder] Asha <asha@example.com>: 2 of 4 readings logged for 2026-10-15 - 2 still to go.`
- Try it without waiting until 8 PM or running Redis: `npm run reminders:once`.
- Re-starting the worker updates the schedule rather than duplicating it.

### Doctor role

- Choose **Doctor** when signing up. Doctors have their own dashboard and cannot log readings; patients cannot use doctor endpoints (403).
- **Assignment is patient-initiated:** under **My doctors** a patient enters a doctor's email to share their reports, and can remove the doctor at any time. This way a doctor can never pull data from someone who hasn't agreed.
- A doctor sees a list of their patients and each patient's daily / month-to-date / previous-month reports and chart, read-only. Asking for a patient who hasn't shared returns 403.
- Note: anyone can pick the Doctor role at sign-up. That's fine for this exercise; a real system would verify doctors (admin approval, licence check).

## Tests

```bash
cd server && npm test    # dates, validation, report maths, cache, report loader, reminder job, auth/role guards
cd client && npm test    # reading form, report panel, sign-up role, chart data, date helpers
```

The server tests need no database or Redis: they use fakes for both, and the HTTP tests only cover requests rejected before any query runs.

## API

All routes except register/login need `Authorization: Bearer <token>`. Errors look like `{ "error": { "message": "...", "field": "value" } }`.

| Method | Path | Who | Notes |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | anyone | `{ name, email, password, role? }` – role is `patient` (default) or `doctor` |
| POST | `/api/auth/login` | anyone | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/readings?page=1&limit=20` | patient | Newest first, `limit` ≤ 100, optional `from` / `to`. Returns `{ data, page, limit, total, totalPages }` |
| POST | `/api/readings` | patient | `{ date: "YYYY-MM-DD", slot, value }` · slots: `morning`, `after_breakfast`, `after_lunch`, `after_dinner` |
| PUT | `/api/readings/:id` | patient | Same body as POST |
| DELETE | `/api/readings/:id` | patient | 204 on success |
| GET | `/api/reports/daily?date=` | patient | The selected date, includes `readings` |
| GET | `/api/reports/month-to-date?date=` | patient | 1st of the month → selected date |
| GET | `/api/reports/monthly?date=` | patient | The whole month before the selected date's month |
| GET | `/api/care/doctors` | patient | Doctors who can see my reports |
| POST | `/api/care/doctors` | patient | `{ email }` – share my reports with a doctor |
| DELETE | `/api/care/doctors/:doctorId` | patient | Stop sharing |
| GET | `/api/doctor/patients` | doctor | Patients who shared with me |
| GET | `/api/doctor/patients/:patientId/reports/:kind?date=` | doctor | `kind` = `daily`, `month-to-date`, `monthly`; 403 if not shared |

`date` defaults to today. Every report returns `{ range, count, highest, lowest, average, readings }`; for an empty period `count` is 0 and the stats are `null`.

Example for `date=2026-10-15`: daily → 15 Oct; month-to-date → 1 Oct–15 Oct; monthly → 1 Sep–30 Sep.

## Design decisions

- **Dates are plain `YYYY-MM-DD` strings** end to end (the pg DATE parser is overridden), avoiding off-by-one-day timezone bugs.
- **"Future" and "today" are judged in `APP_TIMEZONE`** (default `Asia/Kolkata`). Set it to your users' timezone.
- **Rules live in three layers:** instant client checks, full API validation, and database constraints (unique `(user, date, slot)`, `CHECK`s) as a last line of defence.
- **Max 4 per day under concurrency:** inserts run in a transaction that locks the user's row.
- **Order of checks when a day is full:** "only 4 readings per day" is checked before "already have a slot reading"; with exactly four slots the limit message would otherwise never appear.
- **Roles are enforced on the server** (`requireRole`), not just hidden in the UI.
- **Login errors are generic** and unknown emails still run a bcrypt compare, so neither message nor timing reveals which emails exist.
- **Token storage:** the JWT is kept in `localStorage` for simplicity; production should prefer an httpOnly cookie plus CSRF protection.

## Project structure

```
sweety/
├── docker-compose.yml        db, redis, server, worker, client
├── server/
│   ├── src/
│   │   ├── app.js            Express app
│   │   ├── index.js          API entry point (runs migrations)
│   │   ├── worker.js         BullMQ worker entry point
│   │   ├── schema.sql        users, readings, doctor_patients
│   │   ├── cache.js          report cache (versioned invalidation)
│   │   ├── redis.js          optional Redis connection
│   │   ├── routes/           auth, readings, reports, care (patient), doctor
│   │   ├── services/         reportService (maths), reportLoader (query + cache)
│   │   ├── jobs/             reminder job, runOnce
│   │   ├── middleware/       JWT auth + role guard
│   │   └── utils/            dates, validation, HttpError
│   └── tests/
└── client/src/
    ├── components/           AuthPage, Dashboard, DoctorDashboard, DoctorsPanel, ReadingForm,
    │                         ReportPanel, TrendChart, History, TopBar
    ├── api.js · AuthContext.jsx · validation.js · useReport.js
```
