/**
 * Blindspot — Package routes
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createPackageSchema, paginationSchema } from '../validators/index.js';
import { ROLES } from '../constants/index.js';
import packageService from '../services/package.service.js';
import { analyzePackageDelays } from '../services/delay.service.js';

const router = Router();

// All package routes require authentication
router.use(authenticate);

/**
 * GET /api/packages
 */
router.get('/', validate({ query: paginationSchema }), async (req, res, next) => {
  try {
    const result = await packageService.listPackages(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/packages
 * Create a new package. ADMIN and CONFIRM roles.
 */
router.post('/', authorize(ROLES.ADMIN, ROLES.CONFIRM), validate({ body: createPackageSchema }), async (req, res, next) => {
  try {
    const pkg = await packageService.createPackage(req.body, req.employee.uid);
    res.status(201).json(pkg);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/packages/:packageId
 */
router.get('/:packageId', async (req, res, next) => {
  try {
    const pkg = await packageService.getPackageById(req.params.packageId);
    const delayAnalysis = analyzePackageDelays(pkg);
    res.json({ ...pkg, delayAnalysis });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/packages/:packageId/history
 */
router.get('/:packageId/history', async (req, res, next) => {
  try {
    const history = await packageService.getPackageHistory(req.params.packageId);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

export default router;
