# ToothAid _(ToothAid)_

Offline-first dental clinic management PWA that allows clinics to record patient visits, track oral health data, and synchronize records in low-connectivity environments.

This repository is a full-stack application (client + server). The npm packages are `toothaid-client` and `toothaid-server`; the repo and folder name is ToothAid. It provides an installable PWA for clinic staff to register children (with duplicate detection), record screening and treatment visits, manage clinic days and appointments, view reports and charts, and export treatment summaries to Excel—all with full offline operation and idempotent sync when connectivity is available.

## Table of Contents

- [Background](#background)
- [Install](#install)
- [Usage](#usage)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Data Models](#data-models)
- [Graph Logic](#graph-logic)
- [Offline & Sync](#offline--sync)
- [Production](#production)
- [Testing Offline](#testing-offline)
- [API](#api)

## Background

ToothAid was built to support dental clinics operating in low- or intermittent-connectivity environments (e.g. school-based or mobile clinics). The app stores data locally in IndexedDB so staff can work offline; when online, a manual or automatic sync pushes local changes and pulls server updates using idempotent operations to avoid duplicates. The backend is a standard Node/Express/MongoDB API used for auth and sync; the frontend is a React/Vite PWA with Recharts for reports and xlsx for Excel export.

## Install

**Prerequisites:** Node.js v18+ and MongoDB (local, [Docker](https://www.docker.com/), or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)).

```bash
git clone <repository-url>
cd ToothAid
```

### Dependencies

- **Node.js:** Install from [nodejs.org](https://nodejs.org/) or via your package manager (e.g. `brew install node` on macOS).
- **MongoDB:** Use a local install, run `docker-compose up -d` from the repo root for a local MongoDB, or create an M0 cluster on Atlas and use its connection URI (e.g. `mongodb+srv://...`).

**Backend**

```bash
cd server
npm install
cp .env.example .env
# Edit .env: set MONGODB_URI, JWT_SECRET (see server/.env.example)
npm run seed   # optional: creates demo user demo/demo
npm start      # http://localhost:3001
```

**Frontend** (in a second terminal)

```bash
cd client
npm install
npm run dev    # http://localhost:3000; proxies /api to backend
```

The frontend expects the backend at `http://localhost:3001` in development. Demo login: `demo` / `demo`.

## Usage

After installing and starting both server and client:

1. Open the app at `http://localhost:3000` and log in (e.g. `demo` / `demo`).
2. Use **Children** to register a child (with duplicate detection) or search by name, school, or barangay.
3. Use **Visit** or a child’s profile to add a visit (DMFT, pain/swelling flags, treatment types).
4. Use **Clinic** to create clinic days and build rosters (priority and time windows).
5. Use **Reports** for the dataset overview, Excel export (treatment summary), and swipeable charts.
6. Use **Sync** to see pending changes and run “Sync Now” when online.

**Other backend scripts (from `server/`):**

```bash
npm run view-data
npm run migrate-visits
npm run migrate-children-notes
npm run import-csv -- <children.csv> <visits.csv>
```

## Features

- **Children** – Register (with duplicate detection), search by name/school/barangay, view profile and visit history.
- **Visits** – Record screening and treatment; DMFT tracking; pain/swelling flags; treatment types (e.g. Cleaning, Fluoride).
- **High-risk cases** – List and manage cases with pain/swelling flags.
- **Clinic days** – Create days (date, school, capacity, optional AM/PM split); build rosters with priority (High Priority, Routine) and time windows; appointment status: Scheduled, Attended, Missed, Rescheduled, Cancelled.
- **Reports** – Dataset overview (totals, schools, date range); export treatment summary to Excel (monthly/yearly); swipeable charts (zero cavities by grade, decayed teeth over time, F/DMFT ratio, treatments by type/school, DMFT by school and over time) with monthly/quarterly/half-year filters.
- **Offline & sync** – Full operation in IndexedDB offline; sync when online (idempotent, no duplicate ops).
- **PWA** – Installable; touch-friendly; bottom nav: Today, Children, Visit, Clinic, Reports, Sync.

## Tech Stack

- **Frontend:** React 18, Vite, React Router, PWA (vite-plugin-pwa), Recharts, Dexie (IndexedDB), xlsx (SheetJS).
- **Backend:** Node.js, Express, JWT (jsonwebtoken), bcryptjs.
- **Database:** MongoDB (Mongoose).

## Project Structure

```
ToothAid/
├── server/
│   ├── models/       # Child, Visit, ClinicDay, Appointment, ProcessedOp, User
│   ├── routes/      # auth.js, sync.js
│   ├── middleware/  # auth.js (JWT)
│   ├── scripts/     # seed, view-data, migrate-visits, migrate-children-notes, import-csv
│   ├── data/        # optional (.gitkeep)
│   ├── .env.example # copy to .env
│   ├── db.js, server.js, package.json
├── client/
│   ├── src/         # components, db (indexedDB), pages, utils, config, App.jsx, main.jsx
│   ├── public/      # tooth-icon.svg, manifest.json
│   ├── .env.example # copy to .env for VITE_API_URL
│   ├── vite.config.js, index.html, package.json
├── docker-compose.yml  # MongoDB
└── README.md
```

## Data Models

- **Child:** childId, fullName, dob/age, sex, school, grade, barangay, guardianPhone, notes, createdBy, updatedBy, createdAt, updatedAt.
- **Visit:** visitId, childId, date, painFlag, swellingFlag, decayedTeeth, missingTeeth, filledTeeth, treatmentTypes[], notes, createdBy, createdAt.
- **ClinicDay:** clinicDayId, date, school, capacity, amCapacity, pmCapacity, notes, createdBy.
- **Appointment:** appointmentId, childId, clinicDayId, timeWindow (AM|PM|FULL), slotNumber, reason, status, priorityTier, createdBy, createdAt.

## Graph Logic

- **DMFT** = decayedTeeth + missingTeeth + filledTeeth.
- **Time bucketing:** `client/src/utils/timeBuckets.js` supports monthly, quarterly, and half-year buckets; charts use a rolling “latest visit per child” per bucket.
- **Treatments:** Each treatment occurrence is counted; visits with multiple types count in each type.

## Offline & Sync

- **Reads** from IndexedDB; **writes** go to IndexedDB then to an outbox.
- **Sync:** Push outbox to server, then pull since last sync (manual “Sync Now” or when the app detects online).
- Server tracks processed operation IDs (idempotent); visits are append-only; children use last-write-wins.
- IndexedDB stores: `children`, `visits`, `clinicdays`, `appointments`, `outbox`, `meta` (deviceId, lastSyncAt).

## Production

Configure via environment variables; do not hardcode localhost. Set `VITE_API_URL` to your deployed backend URL so the built frontend talks to the correct server.

| Where     | Variable          | Purpose |
| --------- | ------------------ | ------- |
| Backend   | `PORT`             | Server port (host often sets this). |
| Backend   | `MONGODB_URI`      | MongoDB URI (e.g. Atlas). |
| Backend   | `JWT_SECRET`       | Auth signing; use a strong secret. |
| Backend   | `FRONTEND_ORIGIN`   | Optional CORS allow-list. |
| Frontend  | `VITE_API_URL`     | Backend URL, no trailing slash (required at build time). |

- **Backend:** Copy `server/.env.example` to `.env`, set the variables, then `npm start`.
- **Frontend:** Set `VITE_API_URL` at build time (e.g. in CI or `client/.env`), run `npm run build`, then serve the `client/dist/` directory over HTTPS (recommended for PWA).

## Testing Offline

1. Open the app in a browser; open DevTools → Network and set throttling to **Offline**.
2. Use the app (e.g. add a child or a visit).
3. Open the **Sync** page to see pending operations.
4. Go back online and click **Sync Now** to push and pull.

## API

- **Auth:** `POST /api/auth/login` with body `{ "username", "password" }` returns a JWT.
- **Sync:** `POST /api/sync/push` (body: push payload); `GET /api/sync/pull?since=<ISO>&scope=<string>` (returns changes since the given timestamp). See server routes and client sync logic for payload shapes.
