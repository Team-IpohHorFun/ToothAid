# ToothAid – Dental Data & Impact Monitoring

Offline-first Progressive Web App (PWA) for dental clinic operations. Built with the MERN stack, designed to work fully offline on phones and laptops, with sync when the internet is available.

## Features

### Core
- **Child registration** – Register children with duplicate detection
- **Search & browse** – Search by name, school, or barangay
- **Visit management** – Record screening and treatment visits
- **DMFT tracking** – Decayed, Missing, and Filled Teeth
- **High-risk cases** – Track pain/swelling flags and monitor cases
- **Clinic days** – Create and manage clinic days with capacity
- **Appointments** – Build rosters with priority (High Priority, Routine) and time windows (AM, PM, Full Day)
- **Statistics & graphs** – Interactive, swipeable charts with multiple time views
- **Offline-first** – Full operation in IndexedDB when offline
- **Sync** – Push/pull when online; idempotent operations to avoid duplicates

### Statistics & Reports

The **Reports** page includes a **Dataset Overview** (Total Children, Total Visits, Schools Covered, date range), **Export** (treatment summary as Excel), and **swipeable chart slides** with time filters.

**Charts (in order):**
1. **% with Zero Cavities by Grade** – Bar chart; year selector (latest visit per child in that year)
2. **Average Decayed Teeth (D) per child** – Line chart; view by Monthly, Quarterly, or Half-year
3. **% of children with ≥1 decayed tooth** – Line chart; same granularity options
4. **F/DMFT ratio** – Line chart; population-level filled vs total DMFT
5. **Treatments by type** – Pie chart; filter by Last 6 months, 1 year, or All
6. **Treatments by school** – Stacked bar chart (top schools)
7. **Average DMFT by school** – Bar chart; latest visit per child (top schools)
8. **Average DMFT over time** – Line chart; same granularity as (2)–(4)

Charts use **rolling latest-visit-per-child** per time bucket (no gaps for missing months). Line charts have large touch targets and tooltips; horizontal swipes change slides without scrolling the page.

**Report generation:**
- **Dataset Overview** – Headline metrics (total children, total visits, schools covered, coverage date range).
- **Export** – **Treatment summary (Excel)**: choose Monthly or Yearly, then month/year; download generates an Excel file with treatment counts by type (aligned with treatment options in the app).

### Clinic days & appointments
- **Clinic day** – Date, school, capacity (total and optional AM/PM split; AM+PM = total)
- **Roster** – Priority-based scheduling (High Priority, Routine), time windows, slot numbers
- **Appointments** – Status: Scheduled, Attended, Missed, Rescheduled, Cancelled

### UI & UX
- **Quick Actions (Home)** – Add Visit, Find Child, New Child as liquid-glass style cards
- **Page headers** – Outline-style icons aligned with bottom nav
- **Bottom nav** – Today, Children, Visit, Clinic, Reports, Sync; active state uses teal, no background fill
- **Forms & inputs** – Light gray fields, teal focus ring, uppercase labels
- **Visit forms** – Flags (Pain, Swelling) and Treatment Types (Cleaning, Fluoride, etc.) use chip-style toggle buttons with teal styling and checkmarks; same UI for Add Visit (from Visit tab or Child profile) and when editing a visit in a child’s history
- **Search bars** – Rounded, light gray, inline search icon
- **PWA** – Installable; custom tooth icon and manifest (`public/tooth-icon.svg`, `public/manifest.json`)

### Screens
- **Login** – Auth with demo mode
- **Home** – Dashboard, High-Risk Cases, Today’s Clinic, Quick Actions (Add Visit, Find Child, New Child), pending sync alert, Logout
- **Children** – Search/browse; tap a child for profile, then “Add Visit” for the same visit form as the Visit tab
- **Visit** – Select child (search by name, school, or barangay), then add visit with chip-style Flags and Treatment Types
- **Child profile** – Details, visit timeline, Add Visit button, and edit existing visits (same chip-style form)
- **High-Risk Cases** – List and management
- **Clinic Days** – List, Create Clinic Day, Build Roster, Clinic Day Roster
- **Reports** – Dataset overview, Export (treatment summary Excel: monthly/yearly), swipeable charts; line charts: Monthly/Quarterly/Half-year; pie: 6 months/1 year/All
- **Sync** – Status, last sync, pending changes, manual Sync Now

## Tech stack

- **Frontend:** React 18, Vite, React Router, PWA (vite-plugin-pwa)
- **Charts:** Recharts
- **Offline:** IndexedDB via Dexie
- **Export:** xlsx (SheetJS) for treatment summary Excel download
- **Backend:** Node.js, Express, JWT (jsonwebtoken), bcryptjs
- **Database:** MongoDB (Mongoose)

## Project structure

```
ToothAid/
├── server/
│   ├── models/          # Child, Visit, ClinicDay, Appointment, ProcessedOp, User
│   ├── routes/          # auth.js, sync.js
│   ├── middleware/      # auth.js (JWT)
│   ├── scripts/         # seed.js, view-data.js, migrate-visits.js, migrate-children-notes.js, import-csv.js
│   ├── data/            # optional data dir (.gitkeep)
│   ├── .env.example     # env template; copy to .env
│   ├── db.js
│   ├── server.js
│   └── package.json
├── client/
│   ├── src/
│   │   ├── components/  # NavBar, PageHeader, DateInput, MainLayout
│   │   ├── db/          # indexedDB.js
│   │   ├── pages/       # Login, Home, SearchChild, RegisterChild, ChildProfile, etc.
│   │   ├── utils/       # timeBuckets.js (chart bucketing)
│   │   ├── config.js
│   │   ├── App.jsx, App.css, fonts.css, main.jsx
│   ├── public/          # tooth-icon.svg, manifest.json
│   ├── .env.example     # env template; copy to .env for VITE_API_URL
│   ├── vite.config.js   # dev server (port 3000), API proxy, PWA
│   ├── index.html
│   └── package.json
├── docker-compose.yml   # MongoDB
└── README.md
```

## Quick start

### Prerequisites
- **Node.js** v18+ and npm
- **MongoDB** (local, Docker, or Atlas)

**Node (macOS):** `brew install node`  
**Node (Windows/Linux):** [nodejs.org](https://nodejs.org/) or NodeSource.

**MongoDB options:**
- **Atlas:** Create free M0 cluster, add user and IP access, get URI like  
  `mongodb+srv://user:pass@cluster….mongodb.net/toothaid?retryWrites=true&w=majority`
- **Docker:** From repo root run `docker-compose up -d` → `mongodb://localhost:27017/toothaid`
- **Local:** Install MongoDB Community; default URI `mongodb://localhost:27017/toothaid`

### Run locally

1. **Backend**
   ```bash
   cd server
   npm install
   ```
   Copy `server/.env.example` to `server/.env` and set your values (e.g. `MONGODB_URI`, `JWT_SECRET`).
   ```bash
   npm run seed   # optional: demo user demo/demo
   npm start      # http://localhost:3001 (or npm run dev for auto-reload)
   ```
   **Other scripts:** `npm run view-data` (inspect DB), `npm run migrate-visits`, `npm run migrate-children-notes`, `npm run import-csv -- <children.csv> <visits.csv>` (bulk import).

2. **Frontend** (new terminal)
   ```bash
   cd client
   npm install
   npm run dev    # http://localhost:3000 (see vite.config.js server.port)
   ```
   The Vite dev server proxies `/api` to the backend. By default it targets `http://localhost:3001` so that edits and sync on localhost update your local MongoDB. To use the production backend instead, set `VITE_PROXY_TARGET=https://toothaid-backend.onrender.com` in `client/.env`.

### Demo login
- Username: `demo`  
- Password: `demo`

## Data models (summary)

- **Child:** childId, fullName, dob/age, sex, school, grade, barangay, guardianPhone, timestamps
- **Visit:** visitId, childId, date, painFlag, swellingFlag, decayedTeeth, missingTeeth, filledTeeth, treatmentTypes[], notes
- **ClinicDay:** clinicDayId, date, school, capacity, amCapacity, pmCapacity, notes, createdBy
- **Appointment:** appointmentId, childId, clinicDayId, timeWindow, slotNumber, reason, status, priorityTier, createdBy

## Graph logic

- **DMFT** = decayedTeeth + missingTeeth + filledTeeth
- **Time bucketing:** `timeBuckets.js` supports 1M (monthly), 3M (quarterly), 6M (half-year); rolling “latest visit per child” per bucket
- **Averages:** One observation per child per bucket (latest visit in that bucket); averages and percentages computed from those
- **Treatments:** Count each treatment occurrence; visits with multiple types count in each type

## Offline & sync

- **Reads:** From IndexedDB
- **Writes:** IndexedDB first, then outbox
- **Sync:** Manual “Sync Now” or when online; push outbox then pull since last sync
- **Idempotency:** Server tracks processed opIds
- **Conflict:** Visits append-only; children last-write-wins

IndexedDB: `children`, `visits`, `clinicdays`, `appointments`, `outbox`, `meta` (deviceId, lastSyncAt).

## API (summary)

- **Auth:** `POST /auth/login` with `{ "username", "password" }` → JWT
- **Sync:** `POST /sync/push`, `GET /sync/pull?since=<ISO>&scope=<string>`

## Mobile & PWA

- Touch-friendly targets; segmented controls and chips for selections
- Bottom nav; horizontal swipe on Reports without page scroll
- Installable PWA; works offline after first load

## Testing offline

1. Chrome DevTools → Network → Offline
2. Use app (e.g. add child/visit)
3. Sync page shows pending ops
4. Go online → Sync Now to push

## Production & Deployment

Nothing in the app is hardcoded to localhost in production. Configure via environment variables.

### Backend (e.g. Render, Railway, Fly.io)

1. Set environment variables (see `server/.env.example`):
   - `PORT` — often set by the host; default 3001 locally
   - `MONGODB_URI` — use Atlas or your production MongoDB (e.g. `mongodb+srv://...`)
   - `JWT_SECRET` — use a strong secret in production
   - `NODE_ENV=production`
   - `FRONTEND_ORIGIN` (optional) — your frontend URL for CORS, e.g. `https://your-app.netlify.app`. If unset, all origins are allowed.

2. Start: `npm start` (or the start command your host uses).

### Frontend (e.g. Netlify, Vercel, static host)

1. **Set the API URL at build time.** The client calls your backend for auth and sync; it has no localhost in production. Set:
   - `VITE_API_URL=https://your-backend-url.com`  
   (no trailing slash; use the real URL of your deployed backend.)

2. Build and serve:
   ```bash
   cd client
   npm install
   npm run build
   ```
   Serve the `client/dist/` folder (HTTPS recommended for PWA).

3. Copy `client/.env.example` to `client/.env` and set `VITE_API_URL` before building, or set `VITE_API_URL` in your hosting dashboard’s build environment variables.

### Summary

| Where        | Variable          | Purpose |
|-------------|-------------------|---------|
| Backend     | `PORT`            | Server port (host often sets this) |
| Backend     | `MONGODB_URI`     | Production database |
| Backend     | `JWT_SECRET`      | Auth signing |
| Backend     | `FRONTEND_ORIGIN` | Optional CORS allow-list |
| Frontend build | `VITE_API_URL` | Backend URL for auth/sync (required in production) |

## Environment

**Backend (`server/.env`):** See `server/.env.example`.  
**Client:** For production, set `VITE_API_URL` when running `npm run build`. Dev proxy is in `client/vite.config.js` (dev only).
