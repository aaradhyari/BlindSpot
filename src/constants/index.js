/**
 * Blindspot — Application constants
 */

/** Employee roles */
export const ROLES = {
  ADMIN: 'ADMIN',
  CONFIRM: 'CONFIRM',
  PACK: 'PACK',
  DOC: 'DOC',
  DEL: 'DEL',
};

export const ALL_ROLES = Object.values(ROLES);

/** Package workflow stages */
export const STAGES = {
  CONFIRMATION: 'CONFIRMATION',
  PACKAGING: 'PACKAGING',
  DOCUMENTATION: 'DOCUMENTATION',
  DELIVERY: 'DELIVERY',
};

export const STAGE_ORDER = [
  STAGES.CONFIRMATION,
  STAGES.PACKAGING,
  STAGES.DOCUMENTATION,
  STAGES.DELIVERY,
];

/** Stage → required role mapping */
export const STAGE_ROLES = {
  [STAGES.CONFIRMATION]: [ROLES.ADMIN, ROLES.CONFIRM],
  [STAGES.PACKAGING]: [ROLES.ADMIN, ROLES.PACK],
  [STAGES.DOCUMENTATION]: [ROLES.ADMIN, ROLES.DOC],
  [STAGES.DELIVERY]: [ROLES.ADMIN, ROLES.DEL],
};

/** Package statuses */
export const STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DELAYED: 'DELAYED',
  DELIVERED: 'DELIVERED',
};

/** Delay-detection labels (for display, not DB status) */
export const DELAY_LABELS = {
  ON_TRACK: 'ON_TRACK',
  DUE_SOON: 'DUE_SOON',
  DELAYED: 'DELAYED',
  COMPLETED_ON_TIME: 'COMPLETED_ON_TIME',
  COMPLETED_LATE: 'COMPLETED_LATE',
  NO_DEADLINE: 'NO_DEADLINE',
};

/** Corrective-action statuses */
export const ACTION_STATUS = {
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  VERIFIED: 'VERIFIED',
  CANCELLED: 'CANCELLED',
};

/** Priority levels */
export const PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
};

/** Delay reason categories by stage */
export const DELAY_REASONS = {
  [STAGES.CONFIRMATION]: [
    'Incomplete order information',
    'Approval pending',
    'Incorrect order data',
    'Other',
  ],
  [STAGES.PACKAGING]: [
    'Material shortage',
    'Equipment problem',
    'Packaging error',
    'Rework required',
    'Other',
  ],
  [STAGES.DOCUMENTATION]: [
    'Missing document',
    'Incorrect document',
    'Verification pending',
    'Transporter unavailable',
    'Handover problem',
    'Other',
  ],
  [STAGES.DELIVERY]: [
    'Transit disruption',
    'Address issue',
    'Failed delivery attempt',
    'Transporter delay',
    'Customer unavailable',
    'Other',
  ],
};

/** History event types */
export const EVENT_TYPES = {
  PACKAGE_CREATED: 'PACKAGE_CREATED',
  STAGE_STARTED: 'STAGE_STARTED',
  STAGE_COMPLETED: 'STAGE_COMPLETED',
  DELAY_RECORDED: 'DELAY_RECORDED',
  DELAY_RESOLVED: 'DELAY_RESOLVED',
  STATUS_CHANGED: 'STATUS_CHANGED',
  DISPATCH_RECORDED: 'DISPATCH_RECORDED',
  DELIVERY_COMPLETED: 'DELIVERY_COMPLETED',
  REMARK_ADDED: 'REMARK_ADDED',
  ACTION_CREATED: 'ACTION_CREATED',
  ACTION_UPDATED: 'ACTION_UPDATED',
  ACTION_RESOLVED: 'ACTION_RESOLVED',
  ACTION_VERIFIED: 'ACTION_VERIFIED',
};

/** Firestore collection names */
export const COLLECTIONS = {
  EMPLOYEES: 'employees',
  PACKAGES: 'packages',
  HISTORY: 'history',
  CORRECTIVE_ACTIONS: 'correctiveActions',
  STAGE_POLICIES: 'stagePolicies',
  SETTINGS: 'settings',
};

/** Default stage durations in minutes */
export const DEFAULT_STAGE_DURATIONS = {
  [STAGES.CONFIRMATION]: 1440,    // 24 hours
  [STAGES.PACKAGING]: 2880,       // 48 hours
  [STAGES.DOCUMENTATION]: 1440,   // 24 hours
  [STAGES.DELIVERY]: 4320,        // 72 hours
};

/** Default warning thresholds in minutes (fires at X minutes before deadline) */
export const DEFAULT_WARNING_THRESHOLDS = {
  [STAGES.CONFIRMATION]: 360,     // 6 hours
  [STAGES.PACKAGING]: 720,        // 12 hours
  [STAGES.DOCUMENTATION]: 360,    // 6 hours
  [STAGES.DELIVERY]: 1440,        // 24 hours
};

/** Default stage policies */
export const DEFAULT_STAGE_POLICIES = {
  [STAGES.CONFIRMATION]: { targetDurationMinutes: 1440, warningThresholdMinutes: 360, enabled: true },
  [STAGES.PACKAGING]: { targetDurationMinutes: 2880, warningThresholdMinutes: 720, enabled: true },
  [STAGES.DOCUMENTATION]: { targetDurationMinutes: 1440, warningThresholdMinutes: 360, enabled: true },
  [STAGES.DELIVERY]: { targetDurationMinutes: 4320, warningThresholdMinutes: 1440, enabled: true },
};

/** Pagination defaults */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

/** Public fields allowed on the public dashboard */
export const PUBLIC_PACKAGE_FIELDS = [
  'publicReference',
  'projectName',
  'currentStage',
  'status',
  'progressPercent',
  'expectedDeliveryAt',
  'lastPublicUpdate',
  'publicDelayIndicator',
];
