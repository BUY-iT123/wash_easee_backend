import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const helmet = require('helmet');
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import accountRoutes from './routes/account.js';
import operationsRoutes from './routes/operations.js';

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
const cookieSameSite = process.env.COOKIE_SAME_SITE || 'lax';
const cookieSecure = process.env.COOKIE_SECURE === 'true';

if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  throw new Error('SESSION_SECRET must be set to a random value at least 32 characters long.');
}

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('This website origin is not allowed by the API.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '20kb' }));
app.use((req, res, next) => {
  if (['POST', 'PATCH'].includes(req.method) && req.path.startsWith('/api/')) {
    const origin = req.get('origin');
    if (origin && !allowedOrigins.includes(origin)) return res.status(403).json({ error: 'This website origin is not allowed.' });
  }
  next();
});
app.use(session({
  name: 'washease.sid',
  secret: process.env.SESSION_SECRET,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI, collectionName: 'sessions', ttl: 30 * 24 * 60 * 60 }),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { httpOnly: true, secure: cookieSecure, sameSite: cookieSameSite, maxAge: 30 * 24 * 60 * 60 * 1000, path: '/' }
}));

app.get('/api/health', (_req, res) => res.json({ ok: true, database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' }));
app.use('/api/auth', authRoutes);
app.use('/api/account', accountRoutes);
app.use('/api/operations', operationsRoutes);
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));
app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.message?.includes('origin is not allowed')) return res.status(403).json({ error: 'This website origin is not allowed.' });
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

export default app;


