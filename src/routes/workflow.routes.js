/**
 * Blindspot — Workflow routes
 * Stage transitions, delays, dispatch, delivery.
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorizeStage } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  startStageSchema, completeStageSchema, recordDelaySchema,
  updateDeliverySchema, completeDeliverySchema, documentationSchema, dispatchSchema
} from '../validators/index.js';
import { STAGES } from '../constants/index.js';
import workflowService from '../services/workflow.service.js';

const router = Router();
router.use(authenticate);

// ── Confirmation ─────────────────────────────────────────────
router.post('/:packageId/confirmation/start',
  authorizeStage(STAGES.CONFIRMATION),
  validate({ body: startStageSchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.startStage(req.params.packageId, STAGES.CONFIRMATION, req.employee.uid, req.body.remarks);
      res.json(result);
    } catch (err) { next(err); }
  }
);

router.post('/:packageId/confirmation/complete',
  authorizeStage(STAGES.CONFIRMATION),
  validate({ body: completeStageSchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.completeStage(req.params.packageId, STAGES.CONFIRMATION, req.employee.uid, req.body.remarks);
      res.json(result);
    } catch (err) { next(err); }
  }
);

router.post('/:packageId/confirmation/delay',
  authorizeStage(STAGES.CONFIRMATION),
  validate({ body: recordDelaySchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.recordDelay(req.params.packageId, STAGES.CONFIRMATION, req.employee.uid, req.body);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// ── Packaging ────────────────────────────────────────────────
router.post('/:packageId/packaging/start',
  authorizeStage(STAGES.PACKAGING),
  validate({ body: startStageSchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.startStage(req.params.packageId, STAGES.PACKAGING, req.employee.uid, req.body.remarks);
      res.json(result);
    } catch (err) { next(err); }
  }
);

router.post('/:packageId/packaging/complete',
  authorizeStage(STAGES.PACKAGING),
  validate({ body: completeStageSchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.completeStage(req.params.packageId, STAGES.PACKAGING, req.employee.uid, req.body.remarks);
      res.json(result);
    } catch (err) { next(err); }
  }
);

router.post('/:packageId/packaging/delay',
  authorizeStage(STAGES.PACKAGING),
  validate({ body: recordDelaySchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.recordDelay(req.params.packageId, STAGES.PACKAGING, req.employee.uid, req.body);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// ── Documentation/Dispatch ───────────────────────────────────
router.post('/:packageId/documentation/start',
  authorizeStage(STAGES.DOCUMENTATION),
  validate({ body: startStageSchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.startStage(req.params.packageId, STAGES.DOCUMENTATION, req.employee.uid, req.body.remarks);
      res.json(result);
    } catch (err) { next(err); }
  }
);

router.post('/:packageId/documentation/update',
  authorizeStage(STAGES.DOCUMENTATION),
  validate({ body: documentationSchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.updateDocumentation(req.params.packageId, req.employee.uid, req.body);
      res.json(result);
    } catch (err) { next(err); }
  }
);

router.post('/:packageId/documentation/verify',
  authorizeStage(STAGES.DOCUMENTATION),
  async (req, res, next) => {
    try {
      const result = await workflowService.verifyDocumentation(req.params.packageId, req.employee.uid, req.body.remarks);
      res.json(result);
    } catch (err) { next(err); }
  }
);

router.post('/:packageId/dispatch/complete',
  authorizeStage(STAGES.DOCUMENTATION),
  validate({ body: dispatchSchema }),
  async (req, res, next) => {
    try {
      await workflowService.recordDispatch(req.params.packageId, req.employee.uid, req.body);
      const result = await workflowService.completeStage(req.params.packageId, STAGES.DOCUMENTATION, req.employee.uid, req.body.remarks);
      res.json(result);
    } catch (err) { next(err); }
  }
);

router.post('/:packageId/documentation/delay',
  authorizeStage(STAGES.DOCUMENTATION),
  validate({ body: recordDelaySchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.recordDelay(req.params.packageId, STAGES.DOCUMENTATION, req.employee.uid, req.body);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// ── Delivery ─────────────────────────────────────────────────
router.post('/:packageId/delivery/start',
  authorizeStage(STAGES.DELIVERY),
  validate({ body: startStageSchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.startStage(req.params.packageId, STAGES.DELIVERY, req.employee.uid, req.body.remarks);
      res.json(result);
    } catch (err) { next(err); }
  }
);

router.post('/:packageId/delivery/update',
  authorizeStage(STAGES.DELIVERY),
  validate({ body: updateDeliverySchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.updateDeliveryStatus(req.params.packageId, req.employee.uid, req.body);
      res.json(result);
    } catch (err) { next(err); }
  }
);

router.post('/:packageId/delivery/complete',
  authorizeStage(STAGES.DELIVERY),
  validate({ body: completeDeliverySchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.completeStage(req.params.packageId, STAGES.DELIVERY, req.employee.uid, req.body.remarks);
      res.json(result);
    } catch (err) { next(err); }
  }
);

router.post('/:packageId/delivery/delay',
  authorizeStage(STAGES.DELIVERY),
  validate({ body: recordDelaySchema }),
  async (req, res, next) => {
    try {
      const result = await workflowService.recordDelay(req.params.packageId, STAGES.DELIVERY, req.employee.uid, req.body);
      res.json(result);
    } catch (err) { next(err); }
  }
);

// ── Stage packages (for workflow pages) ──────────────────────
router.get('/stage/:stage', async (req, res, next) => {
  try {
    const stage = req.params.stage.toUpperCase();
    const result = await workflowService.getStagePackages(stage, req.query);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
