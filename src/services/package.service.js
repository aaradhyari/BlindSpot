/**
 * Blindspot — Package service
 * Handles CRUD operations for packages.
 */
import { db } from '../config/firebase.js';
import { COLLECTIONS, STAGES, STATUS, EVENT_TYPES, STAGE_ORDER } from '../constants/index.js';
import { serverTimestamp, toISO, calculateProgress, generatePublicReference } from '../utils/index.js';

const packagesRef = db.collection(COLLECTIONS.PACKAGES);

/**
 * Create a new package.
 */
export async function createPackage(data, actorUid) {
  // Check for duplicate packageCode
  const existing = await packagesRef.where('packageCode', '==', data.packageCode).limit(1).get();
  if (!existing.empty) {
    const err = new Error(`Package code "${data.packageCode}" already exists.`);
    err.status = 409;
    throw err;
  }

  const publicReference = generatePublicReference();
  const now = serverTimestamp();

  const pkg = {
    packageCode: data.packageCode,
    publicReference,
    projectName: data.projectName,
    customerName: data.customerName,
    orderReference: data.orderReference || '',
    orderDetails: data.orderDetails || '',
    priority: data.priority || 'MEDIUM',
    currentStage: STAGES.CONFIRMATION,
    status: STATUS.PENDING,
    progressPercent: 10,
    publicDisplayEnabled: true,

    confirmation: {
      status: STATUS.PENDING,
      deadline: data.confirmationDeadline || null,
      startedAt: null,
      completedAt: null,
      startedBy: null,
      completedBy: null,
      delayReason: null,
      delayExplanation: null,
      remarks: data.notes || '',
    },
    packaging: {
      status: STATUS.PENDING,
      deadline: null,
      startedAt: null,
      completedAt: null,
      startedBy: null,
      completedBy: null,
      delayReason: null,
      delayExplanation: null,
      remarks: '',
    },
    documentation: {
      status: STATUS.PENDING,
      deadline: null,
      invoiceReference: '',
      shippingDocReference: '',
      verificationStatus: 'UNVERIFIED',
      transporterName: '',
      trackingNumber: '',
      dispatchDeadline: null,
      dispatchedAt: null,
      handoverAt: null,
      startedAt: null,
      completedAt: null,
      startedBy: null,
      completedBy: null,
      delayReason: null,
      delayExplanation: null,
      remarks: '',
    },
    delivery: {
      status: STATUS.PENDING,
      deadline: null,
      startedAt: null,
      completedAt: null,
      startedBy: null,
      completedBy: null,
      deliveryStatus: null,
      actualDeliveryAt: null,
      proofOfDelivery: '',
      attempts: 0,
      delayReason: null,
      delayExplanation: null,
      remarks: '',
    },

    expectedDeliveryAt: data.expectedDeliveryAt ? new Date(data.expectedDeliveryAt) : null,
    actualDeliveryAt: null,
    lastPublicUpdate: now,
    createdAt: now,
    updatedAt: now,
    createdBy: actorUid,
    updatedBy: actorUid,
  };

  const docRef = await packagesRef.add(pkg);

  // Add history entry
  await docRef.collection(COLLECTIONS.HISTORY).add({
    eventType: EVENT_TYPES.PACKAGE_CREATED,
    stage: STAGES.CONFIRMATION,
    previousStatus: null,
    newStatus: STATUS.PENDING,
    actorUid,
    timestamp: now,
    remarks: data.notes || 'Package created.',
  });

  return { id: docRef.id, publicReference, ...pkg };
}

/**
 * Get a single package by Firestore ID.
 */
export async function getPackageById(packageId) {
  const doc = await packagesRef.doc(packageId).get();
  if (!doc.exists) {
    const err = new Error('Package not found.');
    err.status = 404;
    throw err;
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Get package history (subcollection).
 */
export async function getPackageHistory(packageId) {
  const snap = await packagesRef
    .doc(packageId)
    .collection(COLLECTIONS.HISTORY)
    .orderBy('timestamp', 'desc')
    .limit(200)
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/**
 * List packages with filters and pagination.
 */
export async function listPackages({ page = 1, limit = 20, search, stage, status, sortBy, sortDir = 'desc' }) {
  let query = packagesRef.orderBy('createdAt', 'desc');

  // Firestore doesn't support full-text search — we filter in-memory for small datasets
  // For production, use Algolia/Typesense or composite indexes
  const snap = await query.limit(500).get();
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Filter by stage
  if (stage) {
    results = results.filter((p) => p.currentStage === stage);
  }

  // Filter by status
  if (status) {
    results = results.filter((p) => p.status === status);
  }

  // Search by packageCode, publicReference, or projectName
  if (search) {
    const s = search.toLowerCase();
    results = results.filter((p) =>
      (p.packageCode && p.packageCode.toLowerCase().includes(s)) ||
      (p.publicReference && p.publicReference.toLowerCase().includes(s)) ||
      (p.projectName && p.projectName.toLowerCase().includes(s))
    );
  }

  // Sort
  if (sortBy === 'expectedDeliveryAt') {
    results.sort((a, b) => {
      const da = a.expectedDeliveryAt ? new Date(toISO(a.expectedDeliveryAt)) : new Date(0);
      const db2 = b.expectedDeliveryAt ? new Date(toISO(b.expectedDeliveryAt)) : new Date(0);
      return sortDir === 'asc' ? da - db2 : db2 - da;
    });
  } else if (sortBy === 'updatedAt') {
    results.sort((a, b) => {
      const da = a.updatedAt ? new Date(toISO(a.updatedAt)) : new Date(0);
      const db2 = b.updatedAt ? new Date(toISO(b.updatedAt)) : new Date(0);
      return sortDir === 'asc' ? da - db2 : db2 - da;
    });
  }

  // Paginate
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  return {
    data: paged,
    pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  };
}

/**
 * Get public dashboard data.
 */
export async function getPublicDashboard({ page = 1, limit = 20, search, stage, status, sortBy, sortDir = 'desc' }) {
  // Get settings for public display config
  const settingsDoc = await db.collection(COLLECTIONS.SETTINGS).doc('app').get();
  const settings = settingsDoc.exists ? settingsDoc.data() : {};
  const publicConfig = settings.publicDashboard || {};

  const snap = await packagesRef.limit(500).get();
  let results = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.publicDisplayEnabled !== false)
    .map((p) => {
    const publicPkg = {
      id: p.id,
      publicReference: p.publicReference,
      currentStage: p.currentStage,
      status: p.status,
      progressPercent: p.progressPercent || calculateProgress(p.currentStage, p.status),
      lastPublicUpdate: toISO(p.lastPublicUpdate || p.updatedAt),
      publicDelayIndicator: getPublicDelayIndicator(p),
    };

    // Conditionally include fields based on settings
    if (publicConfig.showProjectName !== false) {
      publicPkg.projectName = p.projectName;
    }
    if (publicConfig.showExpectedDelivery !== false) {
      publicPkg.expectedDeliveryAt = toISO(p.expectedDeliveryAt);
    }
    if (publicConfig.showCustomerName === true) {
      publicPkg.customerName = p.customerName;
    }

    return publicPkg;
  });

  // Search
  if (search) {
    const s = search.toLowerCase();
    results = results.filter((p) =>
      (p.publicReference && p.publicReference.toLowerCase().includes(s)) ||
      (p.projectName && p.projectName.toLowerCase().includes(s))
    );
  }

  // Filter
  if (stage) results = results.filter((p) => p.currentStage === stage);
  if (status) results = results.filter((p) => p.status === status);

  // Sort
  if (sortBy === 'expectedDeliveryAt') {
    results.sort((a, b) => {
      const da = a.expectedDeliveryAt ? new Date(a.expectedDeliveryAt) : new Date(0);
      const db2 = b.expectedDeliveryAt ? new Date(b.expectedDeliveryAt) : new Date(0);
      return sortDir === 'asc' ? da - db2 : db2 - da;
    });
  }

  // Counts
  const allPkgs = snap.docs.map((d) => d.data()).filter((p) => p.publicDisplayEnabled !== false);
  const counts = {
    total: allPkgs.length,
    confirmation: allPkgs.filter((p) => p.currentStage === 'CONFIRMATION').length,
    packaging: allPkgs.filter((p) => p.currentStage === 'PACKAGING').length,
    documentation: allPkgs.filter((p) => p.currentStage === 'DOCUMENTATION').length,
    delivery: allPkgs.filter((p) => p.currentStage === 'DELIVERY').length,
    delivered: allPkgs.filter((p) => p.status === 'DELIVERED').length,
    overdue: allPkgs.filter((p) => isOverdue(p)).length,
  };

  // Paginate
  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  return {
    counts,
    data: paged,
    pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  };
}

/**
 * Get admin dashboard summary.
 */
export async function getAdminSummary() {
  const snap = await packagesRef.limit(1000).get();
  const packages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const empSnap = await db.collection(COLLECTIONS.EMPLOYEES).where('enabled', '==', true).limit(200).get();
  const actionsSnap = await db.collection(COLLECTIONS.CORRECTIVE_ACTIONS)
    .where('status', 'in', ['OPEN', 'IN_PROGRESS']).limit(200).get();

  const now = new Date();
  const overdue = packages.filter((p) => isOverdue(p));
  const attention = packages.filter((p) => needsAttention(p, now));

  return {
    totalPackages: packages.length,
    activePackages: packages.filter((p) => p.status !== 'DELIVERED').length,
    deliveredPackages: packages.filter((p) => p.status === 'DELIVERED').length,
    overduePackages: overdue.length,
    needsAttention: attention.length,
    activeEmployees: empSnap.size,
    openActions: actionsSnap.size,
    recentOverdue: overdue.slice(0, 5).map(summarizePackage),
    recentAttention: attention.slice(0, 5).map(summarizePackage),
    stageBreakdown: {
      confirmation: packages.filter((p) => p.currentStage === 'CONFIRMATION' && p.status !== 'DELIVERED').length,
      packaging: packages.filter((p) => p.currentStage === 'PACKAGING').length,
      documentation: packages.filter((p) => p.currentStage === 'DOCUMENTATION').length,
      delivery: packages.filter((p) => p.currentStage === 'DELIVERY').length,
    },
  };
}

/**
 * Get recent activity events across packages.
 */
export async function getRecentActivity(limit = 20) {
  // Fetch last N packages ordered by updatedAt
  const snap = await packagesRef.orderBy('updatedAt', 'desc').limit(limit).get();
  const activities = [];

  for (const doc of snap.docs) {
    const pkg = doc.data();
    const histSnap = await doc.ref
      .collection(COLLECTIONS.HISTORY)
      .orderBy('timestamp', 'desc')
      .limit(3)
      .get();

    histSnap.docs.forEach((h) => {
      const hist = h.data();
      activities.push({
        packageId: doc.id,
        packageCode: pkg.packageCode,
        publicReference: pkg.publicReference,
        projectName: pkg.projectName,
        ...hist,
        timestamp: toISO(hist.timestamp),
      });
    });
  }

  // Sort all activities by timestamp desc, take the most recent
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  return activities.slice(0, limit);
}

// ── Helpers ──────────────────────────────────────────────────

function getPublicDelayIndicator(pkg) {
  if (pkg.status === 'DELIVERED') return 'DELIVERED';
  if (isOverdue(pkg)) return 'DELAYED';
  if (isDueSoon(pkg)) return 'DUE_SOON';
  return 'ON_TRACK';
}

function isOverdue(pkg) {
  if (pkg.status === 'DELIVERED') return false;
  const now = new Date();

  // Check expected delivery
  if (pkg.expectedDeliveryAt) {
    const exp = pkg.expectedDeliveryAt.toDate ? pkg.expectedDeliveryAt.toDate() : new Date(pkg.expectedDeliveryAt);
    if (now > exp) return true;
  }

  // Check current stage deadline
  const stageKey = pkg.currentStage?.toLowerCase();
  if (stageKey && pkg[stageKey]) {
    const stageData = pkg[stageKey];
    if (stageData.deadline && stageData.status !== 'COMPLETED') {
      const deadline = stageData.deadline.toDate ? stageData.deadline.toDate() : new Date(stageData.deadline);
      if (now > deadline) return true;
    }
  }

  return false;
}

function isDueSoon(pkg) {
  if (pkg.status === 'DELIVERED') return false;
  const now = new Date();
  const warningMs = 6 * 60 * 60 * 1000; // 6 hours

  if (pkg.expectedDeliveryAt) {
    const exp = pkg.expectedDeliveryAt.toDate ? pkg.expectedDeliveryAt.toDate() : new Date(pkg.expectedDeliveryAt);
    if (exp - now < warningMs && exp > now) return true;
  }

  return false;
}

function needsAttention(pkg, now) {
  if (pkg.status === 'DELIVERED') return false;
  return isOverdue(pkg) || isDueSoon(pkg) || pkg.status === 'DELAYED';
}

function summarizePackage(pkg) {
  return {
    id: pkg.id,
    packageCode: pkg.packageCode,
    publicReference: pkg.publicReference,
    projectName: pkg.projectName,
    currentStage: pkg.currentStage,
    status: pkg.status,
    priority: pkg.priority,
    expectedDeliveryAt: toISO(pkg.expectedDeliveryAt),
  };
}

export default {
  createPackage,
  getPackageById,
  getPackageHistory,
  listPackages,
  getPublicDashboard,
  getAdminSummary,
  getRecentActivity,
};
