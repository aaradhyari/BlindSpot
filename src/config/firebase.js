/**
 * Blindspot — Firebase Admin SDK initialization
 */
import admin from 'firebase-admin';
import env from './environment.js';

let app;

if (env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Option A: use a service-account JSON file
  app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
} else if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
  // Option B: inline credentials from env vars
  app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY,
    }),
  });
} else if (process.env.NODE_ENV === 'test' || !env.isProd) {
  console.warn('[firebase] ⚠ Running without live Firebase credentials. Set credentials in .env for production.');
  try {
    app = admin.apps.length > 0 ? admin.apps[0] : admin.initializeApp({ projectId: 'blindspot-dev' });
  } catch {
    // admin already initialized or dummy
  }
} else {
  console.error('[firebase] ✖  No Firebase Admin credentials found. Check .env or GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

export const auth = admin.auth();
export const db = admin.firestore();
export { admin };
export default app;
