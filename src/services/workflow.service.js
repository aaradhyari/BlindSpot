/**
 * Blindspot — Workflow service
 * Handles stage transitions, delay recording, and workflow validation.
 */
import { db } from '../config/firebase.js';
import { COLLECTIONS, STAGES, STATUS, STAGE_ORDER, EVENT_TYPES } from '../constants/index.js';
import { serverTimestamp, toISO } from '../utils/index.js';

const packagesRef = db.collection(COLLECTIONS.PACKAGES);

/**
 * Get the stage key (lowercase) for a stage constant.
 */
function stageKey(stage) {
  return stage.toLowerCase();
}

/**
 * Get the previous stage in the workflow, or null for CONFIRMATION.
 */
function previousStage(stage) {
  const idx = STAGE_ORDER.indexOf(stage);
  return idx > 0 ? STAGE_ORDER[idx - 1] : null;
}

/**
 * Validate that the previous stage is complete before starting the next.
 */
function validatePreviousStageComplete(pkg, stage) {
  const prev = previousStage(stage);
  if (!prev) return; // CONFIRMATION has no prerequisite

  const prevKey = stageKey(prev);
  const prevData = pkg[prevKey];
  if (!prevData || prevData.status !== STATUS.COMPLETED) {
    const err = new Error(`Cannot start ${stage}: previous stage ${prev} is not completed.`);
    err.status = 400;
    throw err;
  }
}

/**
 * Start a workflow stage.
 */
export async function startStage(packageId, stage, actorUid, remarks = '') {
  const docRef = packagesRef.doc(packageId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) {
      const err = new Error('Package not found.');
      err.status = 404;
      throw err;
    }

    const pkg = doc.data();
    const key = stageKey(stage);
    const stageData = pkg[key];

    // Validate current stage matches
    if (pkg.currentStage !== stage) {
      const err = new Error(`Package is currently in ${pkg.currentStage}, not ${stage}.`);
      err.status = 400;
      throw err;
    }

    // Validate previous stage is complete
    validatePreviousStageComplete(pkg, stage);

    // Don't start if already in progress or completed
    if (stageData.status === STATUS.IN_PROGRESS) {
      const err = new Error(`${stage} is already in progress.`);
      err.status = 400;
      throw err;
    }
    if (stageData.status === STATUS.COMPLETED) {
      const err = new Error(`${stage} is already completed.`);
      err.status = 400;
      throw err;
    }

    const now = serverTimestamp();

    tx.update(docRef, {
      [`${key}.status`]: STATUS.IN_PROGRESS,
      [`${key}.startedAt`]: now,
      [`${key}.startedBy`]: actorUid,
      status: STATUS.IN_PROGRESS,
      updatedAt: now,
      updatedBy: actorUid,
      lastPublicUpdate: now,
    });

    // Add history
    const histRef = docRef.collection(COLLECTIONS.HISTORY).doc();
    tx.set(histRef, {
      eventType: EVENT_TYPES.STAGE_STARTED,
      stage,
      previousStatus: stageData.status,
      newStatus: STATUS.IN_PROGRESS,
      actorUid,
      timestamp: now,
      remarks: remarks || `${stage} started.`,
    });

    return { success: true, stage, status: STATUS.IN_PROGRESS };
  });
}

/**
 * Complete a workflow stage and advance to the next.
 */
export async function completeStage(packageId, stage, actorUid, remarks = '') {
  const docRef = packagesRef.doc(packageId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) {
      const err = new Error('Package not found.');
      err.status = 404;
      throw err;
    }

    const pkg = doc.data();
    const key = stageKey(stage);
    const stageData = pkg[key];

    if (pkg.currentStage !== stage) {
      const err = new Error(`Package is currently in ${pkg.currentStage}, not ${stage}.`);
      err.status = 400;
      throw err;
    }

    if (stageData.status !== STATUS.IN_PROGRESS && stageData.status !== STATUS.DELAYED) {
      const err = new Error(`${stage} must be in progress or delayed to complete. Current status: ${stageData.status}`);
      err.status = 400;
      throw err;
    }

    const now = serverTimestamp();
    const nextStageIdx = STAGE_ORDER.indexOf(stage) + 1;
    const isLastStage = nextStageIdx >= STAGE_ORDER.length;
    const nextStage = isLastStage ? null : STAGE_ORDER[nextStageIdx];

    const updateData = {
      [`${key}.status`]: STATUS.COMPLETED,
      [`${key}.completedAt`]: now,
      [`${key}.completedBy`]: actorUid,
      updatedAt: now,
      updatedBy: actorUid,
      lastPublicUpdate: now,
    };

    if (isLastStage) {
      // Delivery complete — package is delivered
      updateData.status = STATUS.DELIVERED;
      updateData.actualDeliveryAt = now;
      updateData.progressPercent = 100;
      updateData['delivery.actualDeliveryAt'] = now;
    } else {
      // Advance to next stage
      updateData.currentStage = nextStage;
      updateData.status = STATUS.PENDING;
      updateData.progressPercent = { PACKAGING: 35, DOCUMENTATION: 60, DELIVERY: 80 }[nextStage] || 0;
    }

    tx.update(docRef, updateData);

    // History: stage completed
    const histRef = docRef.collection(COLLECTIONS.HISTORY).doc();
    tx.set(histRef, {
      eventType: isLastStage ? EVENT_TYPES.DELIVERY_COMPLETED : EVENT_TYPES.STAGE_COMPLETED,
      stage,
      previousStatus: stageData.status,
      newStatus: STATUS.COMPLETED,
      actorUid,
      timestamp: now,
      remarks: remarks || `${stage} completed.`,
    });

    return {
      success: true,
      stage,
      completed: true,
      nextStage: nextStage || 'DELIVERED',
      isDelivered: isLastStage,
    };
  });
}

/**
 * Record a delay for the current stage.
 */
export async function recordDelay(packageId, stage, actorUid, { reason, explanation, remarks }) {
  const docRef = packagesRef.doc(packageId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) {
      const err = new Error('Package not found.');
      err.status = 404;
      throw err;
    }

    const pkg = doc.data();
    const key = stageKey(stage);

    if (pkg.currentStage !== stage) {
      const err = new Error(`Package is currently in ${pkg.currentStage}, not ${stage}.`);
      err.status = 400;
      throw err;
    }

    // If reason is "Other", explanation is required
    if (reason === 'Other' && !explanation) {
      const err = new Error('An explanation is required when selecting "Other" as the delay reason.');
      err.status = 400;
      throw err;
    }

    const now = serverTimestamp();

    tx.update(docRef, {
      [`${key}.status`]: STATUS.DELAYED,
      [`${key}.delayReason`]: reason,
      [`${key}.delayExplanation`]: explanation || '',
      status: STATUS.DELAYED,
      updatedAt: now,
      updatedBy: actorUid,
      lastPublicUpdate: now,
    });

    const histRef = docRef.collection(COLLECTIONS.HISTORY).doc();
    tx.set(histRef, {
      eventType: EVENT_TYPES.DELAY_RECORDED,
      stage,
      previousStatus: pkg[key]?.status || STATUS.IN_PROGRESS,
      newStatus: STATUS.DELAYED,
      actorUid,
      timestamp: now,
      remarks: `Delay: ${reason}${explanation ? ` — ${explanation}` : ''}${remarks ? `. ${remarks}` : ''}`,
    });

    return { success: true, stage, status: STATUS.DELAYED, reason };
  });
}

/**
 * Add a remark to a package stage.
 */
export async function addRemark(packageId, stage, actorUid, remark) {
  const docRef = packagesRef.doc(packageId);
  const key = stageKey(stage);
  const now = serverTimestamp();

  await docRef.update({
    [`${key}.remarks`]: remark,
    updatedAt: now,
    updatedBy: actorUid,
  });

  await docRef.collection(COLLECTIONS.HISTORY).add({
    eventType: EVENT_TYPES.REMARK_ADDED,
    stage,
    previousStatus: null,
    newStatus: null,
    actorUid,
    timestamp: now,
    remarks: remark,
  });

  return { success: true };
}

/**
 * Update documentation details.
 */
export async function updateDocumentation(packageId, actorUid, data) {
  const docRef = packagesRef.doc(packageId);
  const doc = await docRef.get();
  if (!doc.exists) {
    const err = new Error('Package not found.');
    err.status = 404;
    throw err;
  }

  const pkg = doc.data();
  if (pkg.currentStage !== STAGES.DOCUMENTATION) {
    const err = new Error('Package is not in the documentation stage.');
    err.status = 400;
    throw err;
  }

  const now = serverTimestamp();
  const updates = { updatedAt: now, updatedBy: actorUid };

  if (data.invoiceReference !== undefined) updates['documentation.invoiceReference'] = data.invoiceReference;
  if (data.shippingDocReference !== undefined) updates['documentation.shippingDocReference'] = data.shippingDocReference;
  if (data.remarks !== undefined) updates['documentation.remarks'] = data.remarks;

  await docRef.update(updates);
  return { success: true };
}

/**
 * Verify documentation.
 */
export async function verifyDocumentation(packageId, actorUid, remarks = '') {
  const docRef = packagesRef.doc(packageId);
  const now = serverTimestamp();

  await docRef.update({
    'documentation.verificationStatus': 'VERIFIED',
    updatedAt: now,
    updatedBy: actorUid,
  });

  await docRef.collection(COLLECTIONS.HISTORY).add({
    eventType: EVENT_TYPES.STATUS_CHANGED,
    stage: STAGES.DOCUMENTATION,
    previousStatus: 'UNVERIFIED',
    newStatus: 'VERIFIED',
    actorUid,
    timestamp: now,
    remarks: remarks || 'Documentation verified.',
  });

  return { success: true };
}

/**
 * Record dispatch/handover details.
 */
export async function recordDispatch(packageId, actorUid, { transporterName, trackingNumber, remarks }) {
  const docRef = packagesRef.doc(packageId);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(docRef);
    if (!doc.exists) {
      const err = new Error('Package not found.');
      err.status = 404;
      throw err;
    }

    const pkg = doc.data();
    if (pkg.currentStage !== STAGES.DOCUMENTATION) {
      const err = new Error('Package is not in the documentation/dispatch stage.');
      err.status = 400;
      throw err;
    }

    const now = serverTimestamp();

    tx.update(docRef, {
      'documentation.transporterName': transporterName,
      'documentation.trackingNumber': trackingNumber,
      'documentation.dispatchedAt': now,
      'documentation.handoverAt': now,
      'delivery.transporterName': transporterName,
      'delivery.trackingNumber': trackingNumber,
      updatedAt: now,
      updatedBy: actorUid,
      lastPublicUpdate: now,
    });

    const histRef = docRef.collection(COLLECTIONS.HISTORY).doc();
    tx.set(histRef, {
      eventType: EVENT_TYPES.DISPATCH_RECORDED,
      stage: STAGES.DOCUMENTATION,
      previousStatus: null,
      newStatus: null,
      actorUid,
      timestamp: now,
      remarks: remarks || `Dispatched via ${transporterName} — tracking: ${trackingNumber}`,
    });

    return { success: true };
  });
}

/**
 * Update delivery status (in-transit, attempted, etc.).
 */
export async function updateDeliveryStatus(packageId, actorUid, { status, remarks }) {
  const docRef = packagesRef.doc(packageId);
  const doc = await docRef.get();

  if (!doc.exists) {
    const err = new Error('Package not found.');
    err.status = 404;
    throw err;
  }

  const pkg = doc.data();
  if (pkg.currentStage !== STAGES.DELIVERY) {
    const err = new Error('Package is not in the delivery stage.');
    err.status = 400;
    throw err;
  }

  const now = serverTimestamp();
  const updates = {
    'delivery.deliveryStatus': status,
    updatedAt: now,
    updatedBy: actorUid,
    lastPublicUpdate: now,
  };

  if (status === 'DELIVERY_ATTEMPTED' || status === 'FAILED_DELIVERY') {
    updates['delivery.attempts'] = (pkg.delivery?.attempts || 0) + 1;
  }

  await docRef.update(updates);

  await docRef.collection(COLLECTIONS.HISTORY).add({
    eventType: EVENT_TYPES.STATUS_CHANGED,
    stage: STAGES.DELIVERY,
    previousStatus: pkg.delivery?.deliveryStatus,
    newStatus: status,
    actorUid,
    timestamp: now,
    remarks: remarks || `Delivery status: ${status}`,
  });

  return { success: true };
}

/**
 * Get packages for a specific workflow stage.
 */
export async function getStagePackages(stage, { page = 1, limit = 20, status } = {}) {
  let query = packagesRef.where('currentStage', '==', stage);
  const snap = await query.limit(500).get();

  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (status) {
    results = results.filter((p) => p.status === status);
  }

  results.sort((a, b) => {
    const da = a.updatedAt ? (a.updatedAt.toDate ? a.updatedAt.toDate() : new Date(a.updatedAt)) : new Date(0);
    const db2 = b.updatedAt ? (b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt)) : new Date(0);
    return db2 - da;
  });

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paged = results.slice(start, start + limit);

  return {
    data: paged,
    pagination: { page, limit, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
  };
}

// ── Stage convenience completion helpers ──────────────────────

async function getPackageDoc(packageId) {
  const doc = await packagesRef.doc(packageId).get();
  if (!doc.exists) {
    const err = new Error('Package not found.');
    err.status = 404;
    throw err;
  }
  return { id: doc.id, ...doc.data() };
}

async function ensureStageStarted(packageId, stage, actorUid, remarks) {
  const pkg = await getPackageDoc(packageId);
  const key = stageKey(stage);

  if (pkg.currentStage !== stage) {
    const err = new Error(`Package is currently in ${pkg.currentStage}, not ${stage}.`);
    err.status = 400;
    throw err;
  }

  const stageData = pkg[key] || {};
  if (stageData.status === STATUS.COMPLETED) {
    const err = new Error(`${stage} is already completed.`);
    err.status = 400;
    throw err;
  }

  if (stageData.status === STATUS.PENDING) {
    await startStage(packageId, stage, actorUid, remarks || `${stage} started.`);
  }
  // IN_PROGRESS / DELAYED: already started — leave as-is
  return pkg;
}

export async function completeConfirmation(packageId, actorUid, data = {}) {
  await ensureStageStarted(packageId, STAGES.CONFIRMATION, actorUid, 'Confirmation started.');

  const now = serverTimestamp();
  const updates = { updatedAt: now, updatedBy: actorUid, lastPublicUpdate: now };
  if (data.estimatedPackMinutes) {
    updates['packaging.deadline'] = new Date(Date.now() + data.estimatedPackMinutes * 60 * 1000);
  }
  await packagesRef.doc(packageId).update(updates);

  if (data.delayReason) {
    await recordDelay(packageId, STAGES.CONFIRMATION, actorUid, {
      reason: data.delayReason,
      explanation: data.delayNotes,
      remarks: data.remarks,
    });
  }

  const remarks =
    data.remarks || 'Customer order and SKU items verified; inventory available.';
  return completeStage(packageId, STAGES.CONFIRMATION, actorUid, remarks);
}

export async function completePackaging(packageId, actorUid, data = {}) {
  await ensureStageStarted(packageId, STAGES.PACKAGING, actorUid, 'Packaging started.');

  const now = serverTimestamp();
  const updates = { updatedAt: now, updatedBy: actorUid, lastPublicUpdate: now };

  if (data.packagingType) updates['packaging.packagingType'] = data.packagingType;
  if (typeof data.packageWeightKg === 'number') updates['packaging.packageWeightKg'] = data.packageWeightKg;
  if (data.dimensions) {
    updates['packaging.dimensions'] = {
      lengthCm: data.dimensions.lengthCm ?? 0,
      widthCm: data.dimensions.widthCm ?? 0,
      heightCm: data.dimensions.heightCm ?? 0,
    };
  }
  if (typeof data.qualityCheckPassed === 'boolean') {
    updates['packaging.qualityCheckPassed'] = data.qualityCheckPassed;
  }
  if (Object.keys(updates).length > 3) {
    await packagesRef.doc(packageId).update(updates);
  }

  if (data.delayReason) {
    await recordDelay(packageId, STAGES.PACKAGING, actorUid, {
      reason: data.delayReason,
      explanation: data.delayNotes,
      remarks: data.remarks,
    });
  }

  const remarks = data.remarks || 'Packaging completed and quality checks passed.';
  return completeStage(packageId, STAGES.PACKAGING, actorUid, remarks);
}

export async function completeDocumentation(packageId, actorUid, data = {}) {
  await ensureStageStarted(packageId, STAGES.DOCUMENTATION, actorUid, 'Documentation started.');

  // Update doc references
  await updateDocumentation(packageId, actorUid, {
    invoiceReference: data.invoiceNumber,
    shippingDocReference: data.eWayBillNumber,
    remarks: data.remarks,
  });

  await verifyDocumentation(packageId, actorUid, data.remarks || 'Documentation verified.');

  const carrier = data.carrier || 'Carrier';
  const trackingNumber = data.trackingNumber || 'N/A';
  await recordDispatch(packageId, actorUid, {
    transporterName: carrier,
    trackingNumber,
    remarks: data.remarks,
  });

  if (data.delayReason) {
    await recordDelay(packageId, STAGES.DOCUMENTATION, actorUid, {
      reason: data.delayReason,
      explanation: data.delayNotes,
      remarks: data.remarks,
    });
  }

  const remarks = data.remarks || 'Documentation and dispatch completed.';
  return completeStage(packageId, STAGES.DOCUMENTATION, actorUid, remarks);
}

export async function completeDelivery(packageId, actorUid, data = {}) {
  await ensureStageStarted(packageId, STAGES.DELIVERY, actorUid, 'Delivery started.');

  const now = serverTimestamp();
  const updates = { updatedAt: now, updatedBy: actorUid, lastPublicUpdate: now };
  if (data.recipientName) updates['delivery.recipientName'] = data.recipientName;
  if (data.recipientPhone) updates['delivery.recipientPhone'] = data.recipientPhone;
  if (data.deliveryNotes) updates['delivery.deliveryNotes'] = data.deliveryNotes;
  const proofOfDelivery =
    data.proofOfDelivery ||
    [data.recipientName, data.deliveryNotes].filter(Boolean).join(' — ');
  if (proofOfDelivery) updates['delivery.proofOfDelivery'] = proofOfDelivery;
  if (Object.keys(updates).length > 3) {
    await packagesRef.doc(packageId).update(updates);
  }

  if (data.delayReason) {
    await recordDelay(packageId, STAGES.DELIVERY, actorUid, {
      reason: data.delayReason,
      explanation: data.delayNotes,
      remarks: data.remarks,
    });
  }

  const remarks = data.remarks || data.deliveryNotes || 'Delivery completed.';
  return completeStage(packageId, STAGES.DELIVERY, actorUid, remarks);
}

export default {
  startStage,
  completeStage,
  recordDelay,
  addRemark,
  updateDocumentation,
  verifyDocumentation,
  recordDispatch,
  updateDeliveryStatus,
  getStagePackages,
  completeConfirmation,
  completePackaging,
  completeDocumentation,
  completeDelivery,
};
