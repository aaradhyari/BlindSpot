/**
 * Blindspot — Report routes
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { reportQuerySchema } from '../validators/index.js';
import { exportLimiter } from '../middleware/rate-limit.js';
import { ROLES } from '../constants/index.js';
import reportService from '../services/report.service.js';

const router = Router();
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

/**
 * GET /api/admin/reports/summary
 */
router.get('/summary', validate({ query: reportQuerySchema }), async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    const report = await reportService.getSummaryReport(period, startDate, endDate);
    res.json(report);
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/reports/delays
 */
router.get('/delays', validate({ query: reportQuerySchema }), async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await reportService.getDelayDistribution(period, startDate, endDate);
    res.json(data);
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/reports/trends
 */
router.get('/trends', validate({ query: reportQuerySchema }), async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await reportService.getTrends(period, startDate, endDate);
    res.json(data);
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/reports/weekly
 */
router.get('/weekly', async (req, res, next) => {
  try {
    const data = await reportService.getWeeklyComparison();
    res.json(data);
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/reports/monthly
 */
router.get('/monthly', async (req, res, next) => {
  try {
    const data = await reportService.getMonthlyComparison();
    res.json(data);
  } catch (err) { next(err); }
});

/**
 * GET /api/admin/reports/export.csv
 */
router.get('/export.csv', exportLimiter, validate({ query: reportQuerySchema }), async (req, res, next) => {
  try {
    const { period, startDate, endDate } = req.query;
    const csv = await reportService.generateCSV(period, startDate, endDate);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=blindspot-report-${new Date().toISOString().slice(0,10)}.csv`);
    res.send(csv);
  } catch (err) { next(err); }
});

export default router;
