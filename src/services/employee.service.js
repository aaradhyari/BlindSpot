/**
 * Blindspot — Employee service
 */
import { auth, db } from '../config/firebase.js';
import { COLLECTIONS, ALL_ROLES, ROLES } from '../constants/index.js';
import { serverTimestamp } from '../utils/index.js';

const employeesRef = db.collection(COLLECTIONS.EMPLOYEES);

/**
 * Create a new employee — Firebase Auth account + Firestore profile.
 */
export async function createEmployee({ name, email, password, role }, actorUid) {
  if (!ALL_ROLES.includes(role)) {
    const err = new Error(`Invalid role: ${role}`);
    err.status = 400;
    throw err;
  }

  let userRecord;
  try {
    // Create Firebase Auth account
    userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
      disabled: false,
    });
  } catch (firebaseErr) {
    if (firebaseErr.code === 'auth/email-already-exists') {
      const err = new Error('An account with this email already exists.');
      err.status = 409;
      throw err;
    }
    throw firebaseErr;
  }

  try {
    // Create Firestore employee document
    const now = serverTimestamp();
    await employeesRef.doc(userRecord.uid).set({
      name,
      email,
      role,
      enabled: true,
      createdAt: now,
      updatedAt: now,
      lastRoleChangeAt: now,
      createdBy: actorUid,
    });
  } catch (firestoreErr) {
    // Rollback: delete the Auth account if Firestore write fails
    try {
      await auth.deleteUser(userRecord.uid);
    } catch (rollbackErr) {
      console.error('[employee] Failed to rollback Auth user after Firestore failure:', rollbackErr);
    }
    throw firestoreErr;
  }

  return {
    uid: userRecord.uid,
    name,
    email,
    role,
    enabled: true,
  };
}

/**
 * List all employees.
 */
export async function listEmployees({ search, role, enabled } = {}) {
  const snap = await employeesRef.limit(500).get();
  let results = snap.docs.map((d) => ({
    uid: d.id,
    ...d.data(),
  }));

  if (role) {
    results = results.filter((e) => e.role === role);
  }

  if (enabled !== undefined) {
    const enabledBool = enabled === 'true' || enabled === true;
    results = results.filter((e) => e.enabled === enabledBool);
  }

  if (search) {
    const s = search.toLowerCase();
    results = results.filter((e) =>
      (e.name && e.name.toLowerCase().includes(s)) ||
      (e.email && e.email.toLowerCase().includes(s))
    );
  }

  return results;
}

/**
 * Get a single employee.
 */
export async function getEmployee(uid) {
  const doc = await employeesRef.doc(uid).get();
  if (!doc.exists) {
    const err = new Error('Employee not found.');
    err.status = 404;
    throw err;
  }
  return { uid: doc.id, ...doc.data() };
}

/**
 * Update an employee's role.
 */
export async function updateRole(uid, newRole, actorUid) {
  if (!ALL_ROLES.includes(newRole)) {
    const err = new Error(`Invalid role: ${newRole}`);
    err.status = 400;
    throw err;
  }

  const doc = await employeesRef.doc(uid).get();
  if (!doc.exists) {
    const err = new Error('Employee not found.');
    err.status = 404;
    throw err;
  }

  const employee = doc.data();

  // Prevent demoting the last admin
  if (employee.role === ROLES.ADMIN && newRole !== ROLES.ADMIN) {
    const adminSnap = await employeesRef
      .where('role', '==', ROLES.ADMIN)
      .where('enabled', '==', true)
      .limit(2)
      .get();

    if (adminSnap.size <= 1) {
      const err = new Error('Cannot change the role of the last active administrator.');
      err.status = 400;
      throw err;
    }
  }

  const now = serverTimestamp();
  await employeesRef.doc(uid).update({
    role: newRole,
    lastRoleChangeAt: now,
    updatedAt: now,
    updatedBy: actorUid,
  });

  return { uid, role: newRole };
}

/**
 * Enable or disable an employee account.
 */
export async function updateStatus(uid, enabled, actorUid) {
  const doc = await employeesRef.doc(uid).get();
  if (!doc.exists) {
    const err = new Error('Employee not found.');
    err.status = 404;
    throw err;
  }

  const employee = doc.data();

  // Prevent disabling the last active admin
  if (!enabled && employee.role === ROLES.ADMIN) {
    const adminSnap = await employeesRef
      .where('role', '==', ROLES.ADMIN)
      .where('enabled', '==', true)
      .limit(2)
      .get();

    if (adminSnap.size <= 1) {
      const err = new Error('Cannot disable the last active administrator.');
      err.status = 400;
      throw err;
    }
  }

  // Prevent self-disable
  if (uid === actorUid && !enabled) {
    const err = new Error('You cannot disable your own account.');
    err.status = 400;
    throw err;
  }

  const now = serverTimestamp();

  // Update Firestore
  await employeesRef.doc(uid).update({
    enabled,
    updatedAt: now,
    updatedBy: actorUid,
  });

  // Update Firebase Auth
  await auth.updateUser(uid, { disabled: !enabled });

  return { uid, enabled };
}

export default {
  createEmployee,
  listEmployees,
  getEmployee,
  updateRole,
  updateStatus,
};
