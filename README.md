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
- **Appointments** – Build rosters with priority (Emergency, High Priority, Routine) and time windows (AM, PM, Full Day)
- **Statistics & graphs** – Interactive, swipeable charts with multiple time views
- **Offline-first** – Full operation in IndexedDB when offline
- **Sync** – Push/pull when online; idempotent operations to avoid duplicates

### Statistics & Reports

The **Reports** (Graphs) page uses swipeable slides and time filters:

1. **Average Decayed Teeth (D) per child** – Line chart; view by Monthly, Quarterly, or Half-year
2. **% of children with ≥1 decayed tooth** – Line chart; same granularity options
3. **F/DMFT ratio** – Line chart; population-level filled vs total DMFT
4. **Treatments by type** – Pie chart; filter by Last 6 months, 1 year, or All
5. **Treatments by school** – Stacked bar chart
6. **Average DMFT by school** – Bar chart; latest visit per child
7. **Average DMFT over time** – Line chart; same granularity as (1)–(3)

Charts use **rolling latest-visit-per-child** per time bucket (no gaps for missing months). Line charts have large touch targets and tooltips; horizontal swipes change slides without scrolling the page.

### Clinic days & appointments
- **Clinic day** – Date, school, capacity (total and optional AM/PM split; AM+PM = total)
- **Roster** – Priority-based scheduling (Emergency, High Priority, Routine), time windows, slot numbers
- **Appointments** – Status: Scheduled, Attended, Missed, Rescheduled, Cancelled

### UI & UX
- **Quick Actions (Home)** – Add Visit, Find Child, New Child as liquid-glass style cards
- **Page headers** – Outline-style icons aligned with bottom nav
- **Bottom nav** – Today, Children, Visit, Clinic, Reports, Sync; active state uses teal, no background fill
- **Forms & inputs** – Light gray fields, teal focus ring, uppercase labels
- **Search bars** – Rounded, light gray, inline search icon
- **PWA** – Installable; custom tooth icon and manifest (`public/tooth-icon.svg`, `public/manifest.json`)

### Screens
- **Login** – Auth with demo mode
- **Home** – Dashboard, High-Risk Cases, Today’s Clinic, Quick Actions (Add Visit, Find Child, New Child), pending sync alert, Logout
- **Children** – Search/browse
- **Add Visit** – Record visit; select child then add visit (Flags and Treatment Types as chips)
- **Child profile** – Details and visit timeline
- **High-Risk Cases** – List and management
- **Clinic Days** – List, Create Clinic Day, Build Roster, Clinic Day Roster
- **Reports** – Swipeable charts; View: Monthly/Quarterly/Half-year; pie: 6 months/1 year/All
- **Sync** – Status, last sync, pending changes, manual Sync Now

## Tech stack

- **Frontend:** React 18, Vite, React Router, PWA (vite-plugin-pwa)
- **Charts:** Recharts
- **Offline:** IndexedDB via Dexie
- **Backend:** Node.js, Express, JWT
- **Database:** MongoDB (Mongoose)

## Project structure

```
ToothAid/
├── server/
│   ├── models/          # Child, Visit, ClinicDay, Appointment, ProcessedOp, User
│   ├── routes/          # auth.js, sync.js
│   ├── middleware/      # auth.js (JWT)
│   ├── scripts/         # seed.js, view-data.js, migrate-visits.js, import-csv.js
│   ├── data/            # optional data dir (.gitkeep)
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
│   ├── vite.config.js   # dev server (port 3000), API proxy, PWA
│   ├── index.html
│   └── package.json
├── docker-compose.yml   # MongoDB
├── DELETION_CHECKLIST.md  # log of removed unused files
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
   Create `server/.env`:
   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/toothaid
   JWT_SECRET=your-secret-key-change-in-production
   NODE_ENV=development
   ```
   ```bash
   npm run seed   # optional: demo user demo/demo
   npm start      # http://localhost:3001
   ```
   **Other scripts:** `npm run view-data` (inspect DB), `npm run migrate-visits`, `npm run import-csv -- <children.csv> <visits.csv>` (bulk import).

2. **Frontend** (new terminal)
   ```bash
   cd client
   npm install
   npm run dev    # http://localhost:3000 (see vite.config.js server.port)
   ```
   The Vite dev server proxies `/api` to the backend. In `vite.config.js`, set the proxy target to `http://localhost:3001` for a local backend (default may point to a remote Render URL).

### Demo login
- Username: `demo`  
- Password: `demo`

## Data models (summary)

- **Child:** childId, fullName, dob/age, sex, school, grade, barangay, guardianPhone, timestamps
- **Visit:** visitId, childId, date, type (SCREENING/TREATMENT/FOLLOWUP), painFlag, swellingFlag, decayedTeeth, missingTeeth, filledTeeth, treatmentTypes[], notes
- **ClinicDay:** clinicDayId, date, school, capacity, amCapacity, pmCapacity, notes, createdBy
- **Appointment:** appointmentId, childId, clinicDayId, timeWindow, slotNumber, reason, status, priorityTier, urgencyScore, createdBy

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

## Production

- **Backend:** `NODE_ENV=production`, strong `JWT_SECRET`, MongoDB URI, PM2 or similar
- **Frontend:** `npm run build` in `client`, serve `dist/`, HTTPS for PWA
- **Proxy:** Point client API proxy (or production API base URL) to your backend (e.g. Render or your server)

## Environment

**Backend (.env):**
- `PORT` (default 3001)
- `MONGODB_URI`
- `JWT_SECRET`
- `NODE_ENV`

**Client:** API base URL and path in `client/src/config.js`; dev proxy in `client/vite.config.js` (e.g. `/api` → backend). For production, build with `npm run build` and serve `client/dist/`.
