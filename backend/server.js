import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import appointmentsRouter  from './src/routes/appointments.js';
import clientsRouter       from './src/routes/clients.js';
import blockedDatesRouter  from './src/routes/blockedDates.js';
import auditRouter         from './src/routes/audit.js';
import settingsRouter      from './src/routes/settings.js';
import { errorHandler }    from './src/middleware/errorHandler.js';

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ─────────────────────────────────────────────────────────────

// Allow one or more comma-separated origins via FRONTEND_URL env var
// e.g. FRONTEND_URL=https://dental-appointment.onrender.com
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use(express.json());

// ── Health check (no auth) ─────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── API Routes ─────────────────────────────────────────────────────────────
app.use('/api/appointments',  appointmentsRouter);
app.use('/api/clients',       clientsRouter);
app.use('/api/blocked-dates', blockedDatesRouter);
app.use('/api/audit',         auditRouter);
app.use('/api/settings',      settingsRouter);

// ── 404 catch-all ─────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ data: null, error: 'Route not found' });
});

// ── Global error handler ───────────────────────────────────────────────────
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Tooth&Care API running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Auth: Supabase JWT validation active\n`);
});