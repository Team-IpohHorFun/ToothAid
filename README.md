# ToothAid - Dental Data & Impact Monitoring System

An offline-first Progressive Web App (PWA) for managing dental clinic operations in Boctol, Upland Jagna. Built with MERN stack, designed to work fully offline on phones and laptops, with automatic sync when internet is available.

## 🚀 Features

### Core Functionality
- ✅ **Child Registration** - Register children with duplicate detection
- ✅ **Search & Browse** - Search children by name, school, or barangay
- ✅ **Visit Management** - Record screening, treatment, and follow-up visits
- ✅ **DMFT Tracking** - Track Decayed, Missing, and Filled Teeth
- ✅ **High-Risk Case Tracking** - Identify and monitor cases with pain or swelling flags
- ✅ **Follow-up Reminders** - Track and manage follow-up appointments
- ✅ **Clinic Day Management** - Create and manage clinic days with capacity planning
- ✅ **Appointment Scheduling** - Build rosters with priority-based scheduling (Emergency, High Priority, Follow-up, Routine)
- ✅ **Time Window Management** - Schedule appointments in AM, PM, or Full Day slots
- ✅ **Statistics & Graphs** - Comprehensive data visualization with interactive charts
- ✅ **Full Offline Support** - Works completely offline with IndexedDB
- ✅ **Automatic Sync** - Syncs data when internet connection is available
- ✅ **Idempotent Operations** - No duplicate data on retry

### Statistics & Analytics

The Graphs page provides comprehensive data visualization:

1. **Average DMFT Over Time** (Line Chart)
   - Monthly average DMFT scores
   - Uses latest visit per child per month
   - Tracks trends over time

2. **Average DMFT by School/Grade** (Bar Chart with Toggle)
   - View DMFT averages by school or grade
   - Toggle between views on the same screen
   - Color-coded bars (green/yellow/red) based on DMFT values

3. **Treatments by Type** (Pie Chart)
   - Distribution of treatment types: Filling, Extraction, Fluoride, Sealant, SDF
   - Shows percentages and counts
   - Counts each treatment occurrence (multiple treatments per visit allowed)

4. **Treatments by Month/School** (Stacked Bar Chart with Toggle)
   - View treatments grouped by month or school
   - Stacked bars show treatment type breakdown
   - Only includes visits with actual treatments (excludes screening-only visits)

### Clinic Day & Appointment Management

The app includes comprehensive clinic day and appointment scheduling features:

1. **Clinic Day Creation**
   - Create clinic days with date, school, and capacity settings
   - Set overall capacity or split into AM/PM capacity
   - Add notes for clinic day planning

2. **Roster Building**
   - Build appointment rosters with priority-based scheduling
   - Four priority tiers: Emergency, High Priority, Follow-up, Routine
   - Automatic prioritization based on:
     - High-risk cases (pain/swelling flags)
     - Follow-up due dates
     - Treatment history
   - Time window assignment (AM, PM, or Full Day)
   - Slot number management

3. **Appointment Management**
   - View all appointments for a clinic day
   - Track appointment status (Scheduled, Attended, Missed, Rescheduled, Cancelled)
   - Manage capacity across time windows
   - Remove appointments from roster

### UI Screens
- **Login** - Authentication with demo mode
- **Home** - Dashboard with quick actions and statistics
- **Search Child** - Search and browse children
- **Register Child** - Register new children with duplicate detection
- **Child Profile** - View child details and visit timeline
- **Add Visit** - Record screening, treatment, or follow-up visits
- **High-Risk List** - View and manage high-risk cases
- **Follow-ups List** - Track upcoming follow-up appointments
- **Clinic Days List** - View all scheduled clinic days
- **Create Clinic Day** - Create new clinic days with capacity settings
- **Build Roster** - Build appointment rosters with priority-based scheduling
- **Clinic Day Roster** - View and manage appointments for a clinic day
- **Graphs** - Interactive statistics and data visualization
- **Sync** - Manual sync and sync status

## 🛠 Tech Stack

- **Frontend**: React 18 (Vite), PWA enabled, React Router
- **Charts**: Recharts for data visualization
- **Offline Storage**: IndexedDB using Dexie
- **Backend**: Node.js + Express + JWT authentication
- **Database**: MongoDB (Mongoose)

## 📁 Project Structure

```
toothaid/
├── server/                 # Backend Express server
│   ├── models/            # Mongoose schemas
│   │   ├── Child.js       # Child data model
│   │   ├── Visit.js       # Visit data model
│   │   ├── ClinicDay.js   # Clinic day data model
│   │   ├── Appointment.js # Appointment data model
│   │   ├── ProcessedOp.js # Sync operation tracking
│   │   └── User.js        # User authentication
│   ├── routes/            # API routes
│   │   ├── auth.js        # Authentication endpoints
│   │   └── sync.js        # Sync endpoints
│   ├── middleware/        # Express middleware
│   │   └── auth.js        # JWT authentication
│   ├── scripts/           # Utility scripts
│   │   ├── seed.js        # Seed database with demo data
│   │   ├── view-data.js   # View database contents
│   │   └── migrate-visits.js # Data migration
│   ├── db.js              # MongoDB connection
│   ├── server.js          # Express app entry point
│   └── package.json
│
└── client/                # Frontend React app
    ├── src/
    │   ├── db/           # IndexedDB operations
    │   │   └── indexedDB.js
    │   ├── pages/        # React page components
    │   │   ├── Login.jsx
    │   │   ├── Home.jsx
    │   │   ├── SearchChild.jsx
    │   │   ├── RegisterChild.jsx
    │   │   ├── ChildProfile.jsx
    │   │   ├── AddVisit.jsx
    │   │   ├── HighRiskList.jsx
    │   │   ├── FollowUpsList.jsx
    │   │   ├── Graphs.jsx
    │   │   └── SyncPage.jsx
    │   ├── components/   # Reusable components
    │   │   ├── NavBar.jsx
    │   │   └── DateInput.jsx
    │   ├── App.jsx
    │   ├── App.css
    │   └── main.jsx
    ├── vite.config.js
    ├── index.html
    └── package.json
```

## 🚦 Quick Start

### Prerequisites

- **Node.js** (v18 or higher) and npm
- **MongoDB** (see setup options below)

#### Install Node.js

**macOS:**
```bash
brew install node
```

**Windows:**
Download from [nodejs.org](https://nodejs.org/) (LTS version)

**Linux (Ubuntu/Debian):**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Verify installation:**
```bash
node --version  # Should show v18.x.x or higher
npm --version   # Should show 9.x.x or higher
```

### MongoDB Setup

Choose one of the following options:

#### Option 1: MongoDB Atlas (Recommended - Free Cloud Database)

1. **Sign up** at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. **Create a cluster**:
   - Choose **FREE (M0)** tier
   - Select **Cloud** deployment
   - Choose region closest to you
   - Click "Create Cluster"
3. **Create database user**:
   - Security → Database Access → Add New Database User
   - Set username and password (save these!)
   - Set privileges to "Atlas admin"
4. **Configure network access**:
   - Security → Network Access → Add IP Address
   - For development: "Allow Access from Anywhere" (0.0.0.0/0)
5. **Get connection string**:
   - Database → Connect → Connect your application
   - Copy connection string
   - Format: `mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/toothaid?retryWrites=true&w=majority`
   - Replace `<username>` and `<password>` with your credentials
   - Add `/toothaid` before the `?` for database name

#### Option 2: Docker (Easiest Local Setup)

```bash
# From project root
docker-compose up -d
```

Connection string: `mongodb://localhost:27017/toothaid`

#### Option 3: Local Installation

**macOS:**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Windows:**
Download from [mongodb.com](https://www.mongodb.com/try/download/community)

**Linux:**
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

Connection string: `mongodb://localhost:27017/toothaid`

### Installation

1. **Clone or navigate to the project:**
```bash
cd /path/to/toothaid
```

2. **Backend Setup:**
```bash
cd server
npm install
```

3. **Create `.env` file:**
```bash
# Create .env file in server directory
cat > .env << EOF
PORT=3001
MONGODB_URI=mongodb://localhost:27017/toothaid
# Or for Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/toothaid?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-change-in-production
NODE_ENV=development
EOF
```

4. **Seed database (optional):**
```bash
npm run seed
# Creates demo user: username="demo", password="demo"
```

5. **Start backend server:**
```bash
npm start
# Server runs on http://localhost:3001
```

6. **Frontend Setup (in a new terminal):**
```bash
cd client
npm install
npm run dev
# App runs on http://localhost:3000
```

## 📊 Data Models

### Child
- `childId` (UUID, unique)
- `fullName`
- `dob` OR `age`
- `sex` (M/F/Other)
- `school`
- `grade`
- `barangay`
- `guardianPhone` (optional)
- `createdAt`, `updatedAt`

### Visit
- `visitId` (UUID, unique)
- `childId`
- `date`
- `type` (SCREENING/TREATMENT/FOLLOWUP)
- `painFlag`, `swellingFlag` (boolean)
- `decayedTeeth`, `missingTeeth`, `filledTeeth` (optional integers)
- `treatmentTypes[]` (array: Filling, Extraction, Fluoride, Sealant, SDF, Cleaning, Other)
- `followUpDate` (optional)
- `notes` (optional)
- `createdAt`

### ClinicDay
- `clinicDayId` (UUID, unique)
- `date` (Date)
- `school` (String)
- `capacity` (Number, minimum 1)
- `amCapacity` (Number, optional)
- `pmCapacity` (Number, optional)
- `notes` (String, optional)
- `createdBy` (String)
- `createdAt` (Date)

### Appointment
- `appointmentId` (UUID, unique)
- `childId` (UUID, references Child)
- `clinicDayId` (UUID, references ClinicDay)
- `timeWindow` (AM/PM/FULL)
- `slotNumber` (Number, optional)
- `reason` (EMERGENCY/HIGH_PRIORITY/FOLLOW_UP/ROUTINE)
- `status` (SCHEDULED/ATTENDED/MISSED/RESCHEDULED/CANCELLED)
- `priorityTier` (Number, optional)
- `urgencyScore` (Number, optional)
- `createdBy` (String)
- `createdAt` (Date)

## 📈 Graph Logic

### DMFT Calculations

**DMFT** = `decayedTeeth + missingTeeth + filledTeeth`

### Average DMFT Over Time
- Groups visits by month
- For each month, selects most recent visit per child
- Calculates average DMFT across unique children
- Each child contributes one observation per month

### Average DMFT by School/Grade
- Uses overall latest visit per child
- Groups by school or grade
- Calculates average DMFT per group
- Each child contributes one observation

### Treatment Charts
- **Counts each treatment occurrence** (double counting allowed)
- If a visit has `['Filling', 'Fluoride']`, counts as 2 treatments
- Only includes visits with `treatmentTypes.length > 0` (excludes screening-only visits)
- Filters out months/schools with zero treatments

## 🔄 Offline-First Architecture

### Data Flow
1. **All reads** come from IndexedDB (works offline)
2. **All writes** go to IndexedDB first, then enqueue to outbox
3. **Sync** happens when:
   - User manually triggers sync
   - App detects online status and auto-syncs (on write)

### Sync Mechanism
- **Outbox Pattern**: All offline operations stored in IndexedDB outbox table
- **Idempotency**: Server tracks processed `opId`s to prevent duplicates
- **Incremental Pull**: Only fetches records updated since last sync
- **Conflict Resolution**: 
  - Visits: Append-only (no conflicts)
  - Children: Last-write-wins

### IndexedDB Schema
- `children`: All child records
- `visits`: All visit records
- `clinicdays`: All clinic day records
- `appointments`: All appointment records
- `outbox`: Pending operations to sync
- `meta`: Metadata (deviceId, lastSyncAt)

## 🔌 API Endpoints

### Authentication
- `POST /auth/login` - Login and get JWT token
  ```json
  {
    "username": "demo",
    "password": "demo"
  }
  ```

### Sync
- `POST /sync/push` - Push local operations to server
- `GET /sync/pull?since=<ISO>&scope=<string>` - Pull updates from server
  - `since`: ISO timestamp for incremental sync
  - `scope`: Filter by school or barangay (format: `school:SchoolName` or `barangay:BarangayName`)

## 📱 Mobile Usage

The app is optimized for mobile devices:
- Large touch targets (min 48px height)
- Bottom navigation bar with swipe support
- Responsive design
- PWA installable on home screen
- Works offline after first load
- Swipe navigation in Graphs page

## 🧪 Testing Offline Mode

### Chrome DevTools Method
1. Open app in Chrome
2. Open DevTools (F12)
3. Network tab → Select "Offline"
4. App shows "Offline Mode" banner
5. Create child or visit - works offline
6. Check Sync page - see pending operations
7. Switch back to "Online"
8. Click "Sync Now" - operations sync to server

### Verify Data in MongoDB

**MongoDB Atlas Web Interface:**
1. Log into [MongoDB Atlas](https://cloud.mongodb.com/)
2. Browse Collections → Select `toothaid` database
3. View collections: `children`, `visits`, `clinicdays`, `appointments`, `processedops`, `users`

**MongoDB Compass:**
1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect using connection string
3. Browse collections in GUI

**Command Line:**
```bash
mongosh "mongodb://localhost:27017/toothaid"
# Or for Atlas:
mongosh "mongodb+srv://username:password@cluster.mongodb.net/toothaid"

use toothaid
db.children.find().pretty()
db.visits.find().pretty()
db.clinicdays.find().pretty()
db.appointments.find().pretty()
db.children.countDocuments()
db.visits.countDocuments()
db.clinicdays.countDocuments()
db.appointments.countDocuments()
```

**View Data Script:**
```bash
cd server
npm run view-data
```

## 🚀 Production Deployment

### Backend
1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure MongoDB connection string
4. Use process manager (PM2, systemd, etc.)
5. Set up reverse proxy (nginx) if needed

### Frontend
1. Build: `cd client && npm run build`
2. Serve `dist/` directory
3. Ensure HTTPS for PWA features
4. Configure API proxy or CORS

## 📝 Environment Variables

### Backend (.env)
- `PORT`: Server port (default: 3001)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT tokens (change in production!)
- `NODE_ENV`: Environment (development/production)