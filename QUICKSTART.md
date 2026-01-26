# Quick Start Guide

## Prerequisites

**Install Node.js first** (if you see "npm not found"):
- **macOS**: `brew install node` or download from [nodejs.org](https://nodejs.org/)
- **Windows**: Download installer from [nodejs.org](https://nodejs.org/)
- **Linux**: `curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs`

Verify: `node --version` and `npm --version` should work

- MongoDB (see setup below)

## MongoDB Setup (Choose One)

**Option 1: Docker (Easiest)**
```bash
# From project root
docker-compose up -d
# OR
docker run -d -p 27017:27017 --name mongodb mongo:latest
```
Then use: `mongodb://localhost:27017/toothaid` in your `.env`

**Option 2: MongoDB Atlas (Free Cloud)**
1. Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create free cluster → Get connection string
3. Use that connection string in your `.env`

**Option 3: Local Install**
- macOS: `brew install mongodb-community && brew services start mongodb-community`
- Windows: Download from mongodb.com
- Linux: See README.md for instructions

## 5-Minute Setup

### 1. Backend Setup (Terminal 1)
```bash
cd server
npm install
cp .env.example .env
# Edit .env: Set MONGODB_URI (use one of the options above)
npm run seed  # Optional: creates demo data
npm start
```

### 2. Frontend Setup (Terminal 2)
```bash
cd client
npm install
npm run dev
```

### 3. Access the App
- Open http://localhost:3000
- Login with: `demo` / `demo`

## Testing Offline Mode

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Select "Offline" from throttling dropdown
4. Try creating a child or visit - it works!
5. Check Sync page - see pending operations
6. Go back online and click "Sync Now"

## Default Credentials
- Username: `demo`
- Password: `demo`

## Troubleshooting

**MongoDB not connecting?**
- Check if MongoDB is running: `mongosh` or check service status
- Verify connection string in `server/.env`

**Port already in use?**
- Backend: Change `PORT` in `server/.env`
- Frontend: Change port in `client/vite.config.js`

**Sync not working?**
- Check browser console for errors
- Verify server is running on port 3001
- Check network tab for API calls
