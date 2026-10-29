/**
 * Blindspot — Employee management routes
 */
import { Router } from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { createEmployeeSchema, updateRoleSchema, updateStatusSchema } from '../validators/index.js';
import { ROLES } from '../constants/index.js';
import employeeService from '../services/employee.service.js';

const router = Router();
router.use(authenticate);
router.use(authorize(ROLES.ADMIN));

/**
 * GET /api/admin/employees
 */
router.get('/', async (req, res, next) => {
  try {
    const employees = await employeeService.listEmployees(req.query);
    res.json(employees);
  } catch (err) { next(err); }
});

/**
 * POST /api/admin/employees
 */
router.post('/', validate({ body: createEmployeeSchema }), async (req, res, next) => {
  try {
    const employee = await employeeService.createEmployee(req.body, req.employee.uid);
    res.status(201).json(employee);
  } catch (err) { next(err); }
});

/**
 * PATCH /api/admin/employees/:uid/role
 */
router.patch('/:uid/role', validate({ body: updateRoleSchema }), async (req, res, next) => {
  try {
    const result = await employeeService.updateRole(req.params.uid, req.body.role, req.employee.uid);
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * PATCH /api/admin/employees/:uid/status
 */
router.patch('/:uid/status', validate({ body: updateStatusSchema }), async (req, res, next) => {
  try {
    const result = await employeeService.updateStatus(req.params.uid, req.body.enabled, req.employee.uid);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
