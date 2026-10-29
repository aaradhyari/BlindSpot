/**
 * Blindspot — Settings routes
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { updateSettingsSchema } from '../validators/index.js';
import { ROLES, COLLECTIONS } from '../constants/index.js';
import { db } from '../config/firebase.js';
import { serverTimestamp } from '../utils/index.js';

const router = Router();
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

/**
 * GET /api/admin/settings
 */
router.get('/', async (req, res, next) => {
  try {
    const doc = await db.collection(COLLECTIONS.SETTINGS).doc('app').get();
    const settings = doc.exists ? doc.data() : getDefaultSettings();
    res.json(settings);
  } catch (err) { next(err); }
});

/**
 * PATCH /api/admin/settings
 */
router.patch('/', validate({ body: updateSettingsSchema }), async (req, res, next) => {
  try {
    const updates = {
      ...req.body,
      updatedAt: serverTimestamp(),
      updatedBy: req.employee.uid,
    };

    await db.collection(COLLECTIONS.SETTINGS).doc('app').set(updates, { merge: true });
    res.json({ success: true, ...updates });
  } catch (err) { next(err); }
});

function getDefaultSettings() {
  return {
    stagePolicies: {
      CONFIRMATION: { targetDurationMinutes: 1440, warningThresholdMinutes: 360, enabled: true },
      PACKAGING: { targetDurationMinutes: 2880, warningThresholdMinutes: 720, enabled: true },
      DOCUMENTATION: { targetDurationMinutes: 1440, warningThresholdMinutes: 360, enabled: true },
      DELIVERY: { targetDurationMinutes: 4320, warningThresholdMinutes: 1440, enabled: true },
    },
    publicDashboard: {
      showProjectName: true,
      showExpectedDelivery: true,
      showCustomerName: false,
    },
    timezone: 'Asia/Kolkata',
    weekStartDay: 'monday',
    defaultReportPeriod: 'this_week',
  };
}

export default router;
