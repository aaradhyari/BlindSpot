/**
 * Blindspot — Authentication middleware
 * Verifies Firebase ID tokens and loads the employee profile from Firestore.
 * Attaches req.employee = { uid, name, email, role, enabled }.
 */
import { auth, db } from '../config/firebase.js';
import { COLLECTIONS } from '../constants/index.js';

/**
 * Authenticate via session cookie.
 * The cookie is set during POST /api/auth/session after Firebase client login.
 */
export async function authenticate(req, res, next) {
  try {
    const sessionCookie = req.cookies?.__session;
    if (!sessionCookie) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    // Verify the session cookie (checkRevoked = true)
    const decoded = await auth.verifySessionCookie(sessionCookie, true);

    // Load employee profile from Firestore
    const empDoc = await db.collection(COLLECTIONS.EMPLOYEES).doc(decoded.uid).get();
    if (!empDoc.exists) {
      return res.status(403).json({ error: 'Employee profile not found.' });
    }

    const employee = empDoc.data();
    if (!employee.enabled) {
      return res.status(403).json({ error: 'Account is disabled. Contact your administrator.' });
    }

    if (!employee.role) {
      return res.status(403).json({ error: 'No role assigned. Contact your administrator.' });
    }

    req.employee = {
      uid: decoded.uid,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      enabled: employee.enabled,
    };

    next();
  } catch (err) {
    if (err.code === 'auth/session-cookie-expired' || err.code === 'auth/session-cookie-revoked') {
      res.clearCookie('__session');
      return res.status(401).json({ error: 'Session expired. Please log in again.' });
    }
    console.error('[auth] Token verification failed:', err.message);
    return res.status(401).json({ error: 'Invalid authentication.' });
  }
}

/**
 * Optional authentication — sets req.employee if a session exists, but doesn't block.
 */
export async function optionalAuth(req, res, next) {
  try {
    const sessionCookie = req.cookies?.__session;
    if (!sessionCookie) return next();

    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    const empDoc = await db.collection(COLLECTIONS.EMPLOYEES).doc(decoded.uid).get();
    if (empDoc.exists && empDoc.data().enabled) {
      const employee = empDoc.data();
      req.employee = {
        uid: decoded.uid,
        name: employee.name,
        email: employee.email,
        role: employee.role,
        enabled: employee.enabled,
      };
    }
  } catch {
    // Ignore — optional
  }
  next();
}
