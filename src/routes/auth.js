import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many attempts. Please wait a little and try again.' } });
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, pickupAddress: user.pickupAddress, subscriptionStatus: user.subscriptionStatus };
}

function regenerateSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.userId = userId;
      req.session.save((saveError) => saveError ? reject(saveError) : resolve());
    });
  });
}

router.post('/register', authLimiter, async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const pickupAddress = typeof req.body?.pickupAddress === 'string' ? req.body.pickupAddress.trim() : '';

    if (!name || name.length > 80) return res.status(400).json({ error: 'Enter your name (up to 80 characters).' });
    if (!emailPattern.test(email) || email.length > 254) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (password.length < 6 || password.length > 72) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    if (!pickupAddress || pickupAddress.length > 300) return res.status(400).json({ error: 'Enter your pickup address (up to 300 characters).' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, pickupAddress });
    await regenerateSession(req, user.id);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: 'An account with that email already exists.' });
    next(error);
  }
});

router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!emailPattern.test(email) || !password) return res.status(400).json({ error: 'Enter your email and password.' });

    const user = await User.findOne({ email }).select('+passwordHash');
    const matches = user ? await bcrypt.compare(password, user.passwordHash) : false;
    if (!matches) return res.status(401).json({ error: 'Email or password is incorrect.' });

    await regenerateSession(req, user.id);
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));

router.post('/logout', (req, res, next) => {
  if (!req.session) return res.json({ ok: true });
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie('washease.sid', { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: process.env.COOKIE_SAME_SITE || 'lax', path: '/' });
    res.json({ ok: true });
  });
});

export default router;
