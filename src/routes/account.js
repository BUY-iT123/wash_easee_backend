import { Router } from 'express';
import User from '../models/User.js';
import Pickup from '../models/Pickup.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const slotLabels = { morning: 'Morning · 7 AM', afternoon: 'Afternoon · 2 PM', evening: 'Evening · 4 PM' };
const statusLabels = { scheduled: 'Pickup scheduled', picked_washing: 'Picked · Washing', delivered: 'Delivered' };

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const pickups = await Pickup.find({ userId: req.user.id }).sort({ pickupDate: -1 }).limit(10).lean();
    res.json({
      user: { id: req.user.id, name: req.user.name, email: req.user.email, pickupAddress: req.user.pickupAddress },
      subscription: { status: req.user.subscriptionStatus, nextBillingDate: req.user.nextBillingDate },
      pickups: pickups.map((pickup) => ({ ...pickup, pickupSlotLabel: slotLabels[pickup.pickupSlot], statusLabel: statusLabels[pickup.status] }))
    });
  } catch (error) { next(error); }
});

router.patch('/address', async (req, res, next) => {
  try {
    const pickupAddress = typeof req.body?.pickupAddress === 'string' ? req.body.pickupAddress.trim() : '';
    if (!pickupAddress || pickupAddress.length > 300) return res.status(400).json({ error: 'Enter a pickup address (up to 300 characters).' });
    req.user.pickupAddress = pickupAddress;
    await req.user.save();
    res.json({ pickupAddress: req.user.pickupAddress });
  } catch (error) { next(error); }
});

router.get('/pickups', async (req, res, next) => {
  try {
    const pickups = await Pickup.find({ userId: req.user.id }).sort({ pickupDate: -1 }).limit(20).lean();
    res.json({ pickups: pickups.map((pickup) => ({ ...pickup, pickupSlotLabel: slotLabels[pickup.pickupSlot], statusLabel: statusLabels[pickup.status] })) });
  } catch (error) { next(error); }
});

router.post('/pickups', async (req, res, next) => {
  try {
    const { pickupDate, pickupSlot } = req.body ?? {};
    const clothesCount = Number(req.body?.clothesCount);
    if (typeof pickupDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(pickupDate)) return res.status(400).json({ error: 'Choose a valid pickup date.' });
    const parsedDate = new Date(`${pickupDate}T00:00:00.000Z`);
    if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== pickupDate) return res.status(400).json({ error: 'Choose a valid pickup date.' });
    const localDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    if (pickupDate < localDate) return res.status(400).json({ error: 'Pickup date cannot be in the past.' });
    if (parsedDate.getUTCDay() !== 6) return res.status(400).json({ error: 'Pickup must be scheduled for a Saturday.' });
    if (!['morning', 'afternoon', 'evening'].includes(pickupSlot)) return res.status(400).json({ error: 'Choose a pickup time.' });
    if (!Number.isInteger(clothesCount) || clothesCount < 1 || clothesCount > 500) return res.status(400).json({ error: 'Enter a number of clothes from 1 to 500.' });

    const existing = await Pickup.findOne({ userId: req.user.id, pickupDate });
    if (existing && existing.status !== 'scheduled') return res.status(409).json({ error: 'This pickup can no longer be changed.' });
    const pickup = existing
      ? await Pickup.findByIdAndUpdate(existing.id, { pickupSlot, clothesCount }, { new: true, runValidators: true }).lean()
      : await Pickup.create({ userId: req.user.id, pickupDate, pickupSlot, clothesCount }).then((created) => created.toObject());

    res.status(200).json({ pickup: { ...pickup, pickupSlotLabel: slotLabels[pickup.pickupSlot], statusLabel: statusLabels[pickup.status] } });
  } catch (error) { next(error); }
});

export default router;
