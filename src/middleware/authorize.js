/**
 * Blindspot — Role authorization middleware
 * Must be used AFTER authenticate middleware.
 */
import { STAGE_ROLES } from '../constants/index.js';

/**
 * Creates middleware that checks if req.employee.role is in the allowed list.
 * @param  {...string} allowedRoles — e.g. 'ADMIN', 'CONFIRM'
 */
export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.employee) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (!allowedRoles.includes(req.employee.role)) {
      return res.status(403).json({
        error: 'Access denied. You do not have permission for this operation.',
      });
    }

    next();
  };
}

/**
 * Middleware that checks the employee can operate on a specific workflow stage.
 * @param {string} stage — one of STAGES constants
 */
export function authorizeStage(stage) {
  return (req, res, next) => {
    if (!req.employee) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const allowedRoles = STAGE_ROLES[stage];
    if (!allowedRoles || !allowedRoles.includes(req.employee.role)) {
      return res.status(403).json({
        error: `Access denied. You are not authorized for the ${stage} stage.`,
      });
    }

    next();
  };
}
