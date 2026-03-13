# ToothAid – Dental Data & Impact Monitoring

Offline-first PWA for dental clinic operations (MERN stack). Works fully offline on phones and laptops; syncs when online.

## Features

- **Children** – Register (with duplicate detection), search by name/school/barangay, view profile and visit history
- **Visits** – Record screening and treatment; DMFT tracking; pain/swelling flags; treatment types (Cleaning, Fluoride, etc.)
- **High-risk cases** – List and manage pain/swelling flags
- **Clinic days** – Create days (date, school, capacity, optional AM/PM split); build rosters with priority (High Priority, Routine) and time windows; appointment status: Scheduled, Attended, Missed, Rescheduled, Cancelled
- **Reports** – Dataset overview (totals, schools, date range); export treatment summary to Excel (monthly/yearly); swipeable charts: zero cavities by grade, decayed teeth over time, F/DMFT ratio, treatments by type/school, DMFT by school/time (monthly/quarterly/half-year filters)
- **Offline & sync** – Full operation in IndexedDB offline; manual or automatic sync when online (idempotent, no duplicate ops)
- **PWA** – Installable; touch-friendly UI; bottom nav (Today, Children, Visit, Clinic, Reports, Sync)

## Tech stack

- **Frontend:** React 18, Vite, React Router, PWA (vite-plugin-pwa), Recharts, Dexie (IndexedDB), xlsx (SheetJS)
- **Backend:** Node.js, Express, JWT, bcryptjs
- **Database:** MongoDB (Mongoose)

## Project structure

```
ToothAid/
├── server/
│   ├── models/       # Child, Visit, ClinicDay, Appointment, ProcessedOp, User
│   ├── routes/       # auth.js, sync.js
│   ├── middleware/   # auth.js (JWT)
│   ├── scripts/      # seed, view-data, migrate-visits, migrate-children-notes, import-csv
│   ├── data/         # optional (.gitkeep)
│   ├── .env.example  # copy to .env
│   ├── db.js, server.js, package.json
├── client/
│   ├── src/          # components, db (indexedDB), pages, utils, config, App.jsx, main.jsx
│   ├── public/       # tooth-icon.svg, manifest.json
│   ├── .env.example  # copy to .env for VITE_API_URL
│   ├── vite.config.js, index.html, package.json
├── docker-compose.yml   # MongoDB
└── README.md
```

## Quick start

**Prerequisites:** Node.js v18+, MongoDB (local, Docker, or Atlas).

- **Node:** `brew install node` (macOS) or [nodejs.org](https://nodejs.org/)
- **MongoDB:** Atlas (M0 cluster), or `docker-compose up -d` from repo root, or local install → `mongodb://localhost:27017/toothaid`

**Backend**

```bash
cd server
npm install
cp .env.example .env   # set MONGODB_URI, JWT_SECRET
npm run seed           # optional: demo user demo/demo
npm start              # http://localhost:3001
```

Other: `npm run view-data`, `npm run migrate-visits`, `npm run migrate-children-notes`, `npm run import-csv -- <children.csv> <visits.csv>`

**Frontend** (new terminal)

```bash
cd client
npm install
npm run dev   # http://localhost:3000, proxies /api to backend
```

**Demo login:** `demo` / `demo`

## Data models (summary)

- **Child:** childId, fullName, dob/age, sex, school, grade, barangay, guardianPhone
- **Visit:** visitId, childId, date, painFlag, swellingFlag, decayedTeeth, missingTeeth, filledTeeth, treatmentTypes[], notes
- **ClinicDay:** clinicDayId, date, school, capacity, amCapacity, pmCapacity, notes, createdBy
- **Appointment:** appointmentId, childId, clinicDayId, timeWindow, slotNumber, reason, status, priorityTier, createdBy

## Graph logic

- **DMFT** = decayedTeeth + missingTeeth + filledTeeth
- **Time bucketing:** `timeBuckets.js` — monthly, quarterly, half-year; rolling “latest visit per child” per bucket
- **Treatments:** Count each occurrence; visits with multiple types count in each

## Offline & sync

- Reads from IndexedDB; writes go to IndexedDB then outbox
- Sync: push outbox, then pull since last sync (manual or when online)
- Server tracks processed opIds (idempotent); visits append-only, children last-write-wins
- IndexedDB stores: `children`, `visits`, `clinicdays`, `appointments`, `outbox`, `meta` (deviceId, lastSyncAt)

## API

- **Auth:** `POST /auth/login` → `{ "username", "password" }` → JWT
- **Sync:** `POST /sync/push`, `GET /sync/pull?since=<ISO>&scope=<string>`

## Testing offline

1. DevTools → Network → Offline
2. Use app (e.g. add child/visit)
3. Sync page shows pending ops; go online → Sync Now

## Production

Configure via env; no localhost in production.

| Where        | Variable          | Purpose |
|-------------|-------------------|---------|
| Backend     | `PORT`            | Server port |
| Backend     | `MONGODB_URI`     | MongoDB URI |
| Backend     | `JWT_SECRET`      | Auth signing |
| Backend     | `FRONTEND_ORIGIN` | Optional CORS |
| Frontend    | `VITE_API_URL`    | Backend URL (required for production) |

**Backend:** Set vars from `server/.env.example`, then `npm start`.

**Frontend:** Set `VITE_API_URL` (no trailing slash), then `npm run build`; serve `client/dist/` (HTTPS for PWA).
