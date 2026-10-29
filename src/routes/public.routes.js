/**
 * Blindspot — Public API routes
 * No authentication required.
 */
import { Router } from 'express';
import { publicLimiter } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { paginationSchema } from '../validators/index.js';
import packageService from '../services/package.service.js';

const router = Router();

// Rate limit all public routes
router.use(publicLimiter);

/**
 * GET /api/public/dashboard
 * Public summary cards + paginated package list.
 */
router.get('/dashboard', validate({ query: paginationSchema }), async (req, res, next) => {
  try {
    const result = await packageService.getPublicDashboard(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/packages
 * Public package list (same as dashboard but without counts).
 */
router.get('/packages', validate({ query: paginationSchema }), async (req, res, next) => {
  try {
    const result = await packageService.getPublicDashboard(req.query);
    res.json({ data: result.data, pagination: result.pagination });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/public/packages/:publicReference
 * Public single-package summary by public reference.
 */
router.get('/packages/:publicReference', async (req, res, next) => {
  try {
    const { publicReference } = req.params;
    const result = await packageService.getPublicDashboard({ search: publicReference, limit: 1 });

    if (result.data.length === 0) {
      return res.status(404).json({ error: 'Package not found.' });
    }

    res.json(result.data[0]);
  } catch (err) {
    next(err);
  }
});

export default router;
