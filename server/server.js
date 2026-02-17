import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS: allow FRONTEND_ORIGIN in production (e.g. https://your-app.netlify.app), or allow all when unset
const frontendOrigin = process.env.FRONTEND_ORIGIN;
const corsOptions = frontendOrigin
  ? { origin: frontendOrigin.split(',').map((o) => o.trim()).filter(Boolean), credentials: true }
  : {};
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/sync', syncRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect to database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
