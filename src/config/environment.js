/**
 * Blindspot — Environment configuration
 * Loads and validates all required environment variables.
 */
import { config } from 'dotenv';

// Load .env in development
config();

const env = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Firebase Admin
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_WEB_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,

  // Firebase Web (public — safe in client code)
  FIREBASE_WEB_API_KEY: process.env.FIREBASE_WEB_API_KEY || 'AIzaSyC45XQMClcfIlTAcrsGCMde-KWAT_-zhIU',
  FIREBASE_WEB_AUTH_DOMAIN: process.env.FIREBASE_WEB_AUTH_DOMAIN || 'blindspot-214d7.firebaseapp.com',
  FIREBASE_WEB_PROJECT_ID: process.env.FIREBASE_WEB_PROJECT_ID || 'blindspot-214d7',
  FIREBASE_WEB_STORAGE_BUCKET: process.env.FIREBASE_WEB_STORAGE_BUCKET || 'blindspot-214d7.firebasestorage.app',
  FIREBASE_WEB_MESSAGING_SENDER_ID: process.env.FIREBASE_WEB_MESSAGING_SENDER_ID || '645162862785',
  FIREBASE_WEB_APP_ID: process.env.FIREBASE_WEB_APP_ID || '1:645162862785:web:2d869c1e90868a3a322c40',

  // Session
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-session-secret-change-me',
  CSRF_SECRET: process.env.CSRF_SECRET || 'dev-csrf-secret-change-me',

  // CORS
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',

  // Bootstrap
  BOOTSTRAP_ADMIN_UID: process.env.BOOTSTRAP_ADMIN_UID,
};

/** Warn if critical vars are missing in production */
export function validateEnvironment() {
  const warnings = [];
  if (env.isProd && env.SESSION_SECRET.startsWith('dev-')) {
    warnings.push('SESSION_SECRET is using a development default — change it for production.');
  }
  if (!env.FIREBASE_WEB_API_KEY) {
    warnings.push('FIREBASE_WEB_API_KEY is not set — client auth will not work.');
  }
  if (!env.GOOGLE_APPLICATION_CREDENTIALS && !env.FIREBASE_PRIVATE_KEY) {
    warnings.push('No Firebase Admin credentials found. Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PRIVATE_KEY.');
  }
  warnings.forEach((w) => console.warn(`[env] ${w}`));
  return warnings.length === 0;
}

export default env;
