import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import Pickup from '../models/Pickup.js';

const router = Router();
const transitions = { scheduled: 'picked_washing', picked_washing: 'delivered' };

function matchesSecret(supplied, expected) {
  if (!supplied || !expected) return false;
  const suppliedHash = Buffer.from(supplied);
  const expectedHash = Buffer.from(expected);
  return suppliedHash.length === expectedHash.length && timingSafeEqual(suppliedHash, expectedHash);
}

router.patch('/pickups/:pickupId/status', async (req, res, next) => {
  try {
    const secret = process.env.OPS_API_KEY;
    if (!secret) return res.status(503).json({ error: 'Pickup status updates are not configured.' });
    const authorization = req.get('authorization') || '';
    const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    if (!matchesSecret(supplied, secret)) return res.status(401).json({ error: 'Not authorized.' });

    const pickup = await Pickup.findById(req.params.pickupId);
    if (!pickup) return res.status(404).json({ error: 'Pickup not found.' });
    const nextStatus = transitions[pickup.status];
    if (!nextStatus) return res.status(409).json({ error: 'This pickup has already been delivered.' });
    pickup.status = nextStatus;
    await pickup.save();
    res.json({ pickup: { id: pickup.id, pickupDate: pickup.pickupDate, status: pickup.status } });
  } catch (error) {
    if (error?.name === 'CastError') return res.status(400).json({ error: 'Invalid pickup ID.' });
    next(error);
  }
});

export default router;
