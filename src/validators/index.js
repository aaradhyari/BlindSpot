/**
 * Blindspot — Zod validation schemas
 */
import { z } from 'zod';
import { ALL_ROLES, STAGES, STATUS, PRIORITY, ACTION_STATUS, DELAY_REASONS, STAGE_ORDER } from '../constants/index.js';

// ── Helpers ──────────────────────────────────────────────────
const trimmedString = (min = 1, max = 500) =>
  z.string().trim().min(min).max(max);

const optionalTrimmed = (max = 500) =>
  z.string().trim().max(max).optional().or(z.literal(''));

const isoDate = z.string().datetime({ offset: true }).or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

// ── Auth ─────────────────────────────────────────────────────
export const sessionSchema = z.object({
  idToken: z.string().min(100, 'Invalid ID token'),
});

// ── Employee ─────────────────────────────────────────────────
export const createEmployeeSchema = z.object({
  name: trimmedString(2, 100),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  role: z.enum(ALL_ROLES),
});

export const updateRoleSchema = z.object({
  role: z.enum(ALL_ROLES),
});

export const updateStatusSchema = z.object({
  enabled: z.boolean(),
});

// ── Package ──────────────────────────────────────────────────
export const createPackageSchema = z.object({
  packageCode: trimmedString(2, 50),
  projectName: trimmedString(2, 200),
  customerName: trimmedString(2, 200),
  orderReference: optionalTrimmed(100),
  orderDetails: optionalTrimmed(2000),
  priority: z.enum(Object.values(PRIORITY)).optional().default('MEDIUM'),
  expectedDeliveryAt: isoDate.optional(),
  confirmationDeadline: isoDate.optional(),
  notes: optionalTrimmed(2000),
});

// ── Workflow actions ─────────────────────────────────────────
export const startStageSchema = z.object({
  remarks: optionalTrimmed(2000),
});

export const completeStageSchema = z.object({
  remarks: optionalTrimmed(2000),
});

export const recordDelaySchema = z.object({
  reason: trimmedString(2, 200),
  explanation: optionalTrimmed(2000),
  remarks: optionalTrimmed(2000),
});

export const updateDeliverySchema = z.object({
  status: z.enum(['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERY_ATTEMPTED', 'FAILED_DELIVERY']),
  remarks: optionalTrimmed(2000),
});

export const completeDeliverySchema = z.object({
  remarks: optionalTrimmed(2000),
  proofOfDelivery: optionalTrimmed(500),
});

export const documentationSchema = z.object({
  invoiceReference: optionalTrimmed(100),
  shippingDocReference: optionalTrimmed(100),
  remarks: optionalTrimmed(2000),
});

export const dispatchSchema = z.object({
  transporterName: trimmedString(2, 200),
  trackingNumber: trimmedString(2, 100),
  remarks: optionalTrimmed(2000),
});

// ── Corrective Actions ───────────────────────────────────────
export const createActionSchema = z.object({
  title: trimmedString(3, 200),
  description: trimmedString(10, 5000),
  relatedPackageIds: z.array(z.string()).optional().default([]),
  relatedStage: z.enum(Object.values(STAGES)).optional(),
  rootCauseCategory: trimmedString(2, 200),
  proposedAction: trimmedString(10, 5000),
  assignedToUid: z.string().optional(),
  priority: z.enum(Object.values(PRIORITY)).optional().default('MEDIUM'),
  dueAt: isoDate.optional(),
});

export const updateActionSchema = z.object({
  title: trimmedString(3, 200).optional(),
  description: trimmedString(10, 5000).optional(),
  status: z.enum(Object.values(ACTION_STATUS)).optional(),
  priority: z.enum(Object.values(PRIORITY)).optional(),
  progressNotes: optionalTrimmed(5000),
  dueAt: isoDate.optional(),
  assignedToUid: z.string().optional(),
});

export const verifyActionSchema = z.object({
  verificationNotes: trimmedString(10, 5000),
  performanceImproved: z.boolean(),
  evidenceSummary: optionalTrimmed(5000),
});

// ── Settings ─────────────────────────────────────────────────
export const updateSettingsSchema = z.object({
  stagePolicies: z.record(z.string(), z.object({
    targetDurationMinutes: z.number().int().min(1).max(525600),
    warningThresholdMinutes: z.number().int().min(1).max(525600),
    enabled: z.boolean().optional(),
  })).optional(),
  publicDashboard: z.object({
    showProjectName: z.boolean().optional(),
    showExpectedDelivery: z.boolean().optional(),
    showCustomerName: z.boolean().optional(),
  }).optional(),
  timezone: z.string().max(50).optional(),
  weekStartDay: z.enum(['monday', 'sunday']).optional(),
  defaultReportPeriod: z.enum(['this_week', 'this_month', 'last_week', 'last_month']).optional(),
});

// ── Query ────────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(200).optional(),
  stage: z.enum([...Object.values(STAGES), '']).optional(),
  status: z.enum([...Object.values(STATUS), '']).optional(),
  sortBy: z.string().max(50).optional(),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const reportQuerySchema = z.object({
  period: z.enum(['this_week', 'last_week', 'this_month', 'last_month', 'custom']).optional().default('this_week'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  stage: z.enum([...Object.values(STAGES), '']).optional(),
  status: z.enum([...Object.values(STATUS), '']).optional(),
});
