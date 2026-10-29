/**
 * Blindspot — Corrective Action service
 */
import { db } from '../config/firebase.js';
import { COLLECTIONS, ACTION_STATUS } from '../constants/index.js';
import { serverTimestamp, toISO } from '../utils/index.js';
import { v4 as uuidv4 } from 'uuid';

const actionsRef = db.collection(COLLECTIONS.CORRECTIVE_ACTIONS);

/**
 * Create a corrective action.
 */
export async function createAction(data, actorUid) {
  const actionId = uuidv4();
  const now = serverTimestamp();

  const action = {
    actionId,
    title: data.title,
    description: data.description,
    relatedPackageIds: data.relatedPackageIds || [],
    relatedStage: data.relatedStage || null,
    rootCauseCategory: data.rootCauseCategory,
    proposedAction: data.proposedAction,
    assignedToUid: data.assignedToUid || null,
    createdByUid: actorUid,
    priority: data.priority || 'MEDIUM',
    status: ACTION_STATUS.OPEN,
    dueAt: data.dueAt ? new Date(data.dueAt) : null,
    createdAt: now,
    updatedAt: now,
    resolvedAt: null,
    verificationNotes: null,
    performanceImproved: null,
    evidenceSummary: null,
    progressNotes: '',
  };

  const docRef = await actionsRef.add(action);
  return { id: docRef.id, ...action };
}

/**
 * List corrective actions with optional filters.
 */
export async function listActions({ status, priority, stage, assignedToUid } = {}) {
  const snap = await actionsRef.orderBy('createdAt', 'desc').limit(500).get();
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (status) results = results.filter((a) => a.status === status);
  if (priority) results = results.filter((a) => a.priority === priority);
  if (stage) results = results.filter((a) => a.relatedStage === stage);
  if (assignedToUid) results = results.filter((a) => a.assignedToUid === assignedToUid);

  return results;
}

/**
 * Get a single corrective action.
 */
export async function getAction(actionId) {
  const doc = await actionsRef.doc(actionId).get();
  if (!doc.exists) {
    const err = new Error('Corrective action not found.');
    err.status = 404;
    throw err;
  }
  return { id: doc.id, ...doc.data() };
}

/**
 * Update a corrective action.
 */
export async function updateAction(actionId, data, actorUid) {
  const docRef = actionsRef.doc(actionId);
  const doc = await docRef.get();
  if (!doc.exists) {
    const err = new Error('Corrective action not found.');
    err.status = 404;
    throw err;
  }

  const now = serverTimestamp();
  const updates = { updatedAt: now, updatedBy: actorUid };

  if (data.title) updates.title = data.title;
  if (data.description) updates.description = data.description;
  if (data.status) {
    updates.status = data.status;
    if (data.status === ACTION_STATUS.RESOLVED) {
      updates.resolvedAt = now;
    }
  }
  if (data.priority) updates.priority = data.priority;
  if (data.progressNotes !== undefined) updates.progressNotes = data.progressNotes;
  if (data.dueAt) updates.dueAt = new Date(data.dueAt);
  if (data.assignedToUid !== undefined) updates.assignedToUid = data.assignedToUid;

  await docRef.update(updates);
  return { id: actionId, ...updates };
}

/**
 * Verify a resolved corrective action.
 */
export async function verifyAction(actionId, data, actorUid) {
  const docRef = actionsRef.doc(actionId);
  const doc = await docRef.get();
  if (!doc.exists) {
    const err = new Error('Corrective action not found.');
    err.status = 404;
    throw err;
  }

  const action = doc.data();
  if (action.status !== ACTION_STATUS.RESOLVED) {
    const err = new Error('Only resolved actions can be verified.');
    err.status = 400;
    throw err;
  }

  const now = serverTimestamp();
  await docRef.update({
    status: ACTION_STATUS.VERIFIED,
    verificationNotes: data.verificationNotes,
    performanceImproved: data.performanceImproved,
    evidenceSummary: data.evidenceSummary || '',
    verifiedByUid: actorUid,
    verifiedAt: now,
    updatedAt: now,
  });

  return { id: actionId, status: ACTION_STATUS.VERIFIED };
}

/**
 * Generate CSV for corrective actions.
 */
export async function generateActionsCSV() {
  const snap = await actionsRef.orderBy('createdAt', 'desc').limit(500).get();
  const actions = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const headers = [
    'Action ID', 'Title', 'Status', 'Priority', 'Related Stage',
    'Root Cause', 'Due Date', 'Created At', 'Resolved At', 'Verified',
  ];

  const { csvSafe } = await import('../utils/index.js');
  const rows = actions.map((a) => [
    csvSafe(a.actionId),
    csvSafe(a.title),
    csvSafe(a.status),
    csvSafe(a.priority),
    csvSafe(a.relatedStage),
    csvSafe(a.rootCauseCategory),
    csvSafe(toISO(a.dueAt)),
    csvSafe(toISO(a.createdAt)),
    csvSafe(toISO(a.resolvedAt)),
    csvSafe(a.performanceImproved != null ? String(a.performanceImproved) : ''),
  ]);

  const timestamp = new Date().toISOString();
  return [
    `# Blindspot Corrective Actions — Generated: ${timestamp}`,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');
}

export default {
  createAction,
  listActions,
  getAction,
  updateAction,
  verifyAction,
  generateActionsCSV,
};
