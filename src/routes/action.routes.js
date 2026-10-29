/**
 * Blindspot — Corrective Action routes
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createActionSchema, updateActionSchema, verifyActionSchema } from '../validators/index.js';
import { exportLimiter } from '../middleware/rate-limit.js';
import { ROLES } from '../constants/index.js';
import actionService from '../services/action.service.js';

const router = Router();
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

/**
 * GET /api/admin/actions
 */
router.get('/', async (req, res, next) => {
  try {
    const actions = await actionService.listActions(req.query);
    res.json(actions);
  } catch (err) { next(err); }
});

/**
 * POST /api/admin/actions
 */
router.post('/', validate({ body: createActionSchema }), async (req, res, next) => {
  try {
    const action = await actionService.createAction(req.body, req.employee.uid);
    res.status(201).json(action);
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/actions/:actionId
 */
router.get('/:actionId', async (req, res, next) => {
  try {
    const action = await actionService.getAction(req.params.actionId);
    res.json(action);
  } catch (err) { next(err); }
});

/**
 * PATCH /api/admin/actions/:actionId
 */
router.patch('/:actionId', validate({ body: updateActionSchema }), async (req, res, next) => {
  try {
    const result = await actionService.updateAction(req.params.actionId, req.body, req.employee.uid);
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * POST /api/admin/actions/:actionId/verify
 */
router.post('/:actionId/verify', validate({ body: verifyActionSchema }), async (req, res, next) => {
  try {
    const result = await actionService.verifyAction(req.params.actionId, req.body, req.employee.uid);
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/actions/export.csv
 */
router.get('/export/csv', exportLimiter, async (req, res, next) => {
  try {
    const csv = await actionService.generateActionsCSV();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=blindspot-actions-${new Date().toISOString().slice(0,10)}.csv`);
    res.send(csv);
  } catch (err) { next(err); }
});

export default router;
