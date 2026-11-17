import User from '../models/User.js';

export async function requireAuth(req, res, next) {
  try {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ error: 'Please log in to continue.' });

    const user = await User.findById(userId);
    if (!user) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Your session has expired. Please log in again.' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
