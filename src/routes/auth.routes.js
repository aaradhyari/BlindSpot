/**
 * Blindspot — Auth routes
 */
import { Router } from 'express';
import { auth, db } from '../config/firebase.js';
import { COLLECTIONS } from '../constants/index.js';
import { authLimiter } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { sessionSchema } from '../validators/index.js';
import { authenticate } from '../middleware/authenticate.js';
import env from '../config/environment.js';

const router = Router();

/**
 * POST /api/auth/session
 * Exchange a Firebase ID token for a server-side session cookie.
 */
router.post('/session', authLimiter, validate({ body: sessionSchema }), async (req, res, next) => {
  try {
    const { idToken } = req.body;

    // Verify the ID token
    const decoded = await auth.verifyIdToken(idToken);

    // Load employee profile
    const empDoc = await db.collection(COLLECTIONS.EMPLOYEES).doc(decoded.uid).get();
    if (!empDoc.exists) {
      return res.status(403).json({ error: 'No employee profile found. Contact your administrator.' });
    }

    const employee = empDoc.data();
    if (!employee.enabled) {
      return res.status(403).json({ error: 'Account is disabled. Contact your administrator.' });
    }
    if (!employee.role) {
      return res.status(403).json({ error: 'No role assigned. Contact your administrator.' });
    }

    // Create a session cookie (5 days)
    const expiresIn = 5 * 24 * 60 * 60 * 1000;
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    // Set HTTP-only cookie
    res.cookie('__session', sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: env.isProd,
      sameSite: env.isProd ? 'strict' : 'lax',
      path: '/',
    });

    res.json({
      success: true,
      employee: {
        uid: decoded.uid,
        name: employee.name,
        email: employee.email,
        role: employee.role,
      },
      redirect: getRedirectPath(employee.role),
    });
  } catch (err) {
    console.error('[auth] Session creation failed:', err.message);
    if (err.code?.startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    next(err);
  }
});

/**
 * POST /api/auth/logout
 * Clear the session cookie and revoke tokens.
 */
router.post('/logout', async (req, res) => {
  const sessionCookie = req.cookies?.__session;

  res.clearCookie('__session', { path: '/' });

  if (sessionCookie) {
    try {
      const decoded = await auth.verifySessionCookie(sessionCookie);
      await auth.revokeRefreshTokens(decoded.uid);
    } catch {
      // Cookie may be invalid — ignore
    }
  }

  res.json({ success: true });
});

/**
 * GET /api/auth/me
 * Get the current authenticated employee's profile.
 */
router.get('/me', authenticate, async (req, res) => {
  res.json({
    uid: req.employee.uid,
    name: req.employee.name,
    email: req.employee.email,
    role: req.employee.role,
  });
});

function getRedirectPath(role) {
  const paths = {
    ADMIN: '/admin',
    CONFIRM: '/confirm',
    PACK: '/pack',
    DOC: '/doc',
    DEL: '/del',
  };
  return paths[role] || '/';
}

export default router;
