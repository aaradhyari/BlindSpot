/**
 * Blindspot — Firebase Admin SDK initialization
 * Supports Vercel Serverless, container, and local environments.
 */
import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import env from './environment.js';

let app;

function initFirebase() {
  if (admin.apps.length > 0) {
    return admin.apps[0];
  }

  // 1. Single JSON string env var (recommended for Vercel / Cloud environments)
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountJson) {
    try {
      const parsed = typeof serviceAccountJson === 'string' ? JSON.parse(serviceAccountJson) : serviceAccountJson;
      return admin.initializeApp({
        credential: admin.credential.cert(parsed),
      });
    } catch (e) {
      console.error('[firebase] Error parsing FIREBASE_SERVICE_ACCOUNT_JSON:', e.message);
    }
  }

  // 2. Service-account JSON file path
  const credPath = env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credPath) {
    const resolvedPath = path.isAbsolute(credPath) ? credPath : path.resolve(process.cwd(), credPath);
    if (fs.existsSync(resolvedPath)) {
      try {
        const fileContent = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
        return admin.initializeApp({
          credential: admin.credential.cert(fileContent),
        });
      } catch (e) {
        console.error(`[firebase] Error reading credentials file at ${resolvedPath}:`, e.message);
      }
    }
  }

  // 3. Inline credentials
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    try {
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: env.FIREBASE_PROJECT_ID,
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } catch (e) {
      console.error('[firebase] Error with inline credentials:', e.message);
    }
  }

  // 4. Fallback / Default project initialization (prevents FUNCTION_INVOCATION_FAILED)
  console.warn('[firebase] ⚠ Running with project ID fallback. Ensure FIREBASE_SERVICE_ACCOUNT_JSON or credentials are set in Vercel environment variables.');
  return admin.initializeApp({
    projectId: env.FIREBASE_PROJECT_ID || 'blindspot-214d7',
  });
}

app = initFirebase();

export const auth = admin.auth();
export const db = admin.firestore();
export { admin };
export default app;
