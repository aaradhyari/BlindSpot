/**
 * Blindspot — Frontend Firebase Authentication Client
 * Loads configuration dynamically from /api/config and exchanges
 * client ID tokens for secure server-side session cookies.
 */
import { apiRequest, showToast } from './api.js';

let firebaseApp = null;
let firebaseAuth = null;

export async function getFirebaseConfig() {
  const data = await apiRequest('/api/config');
  return data.firebase;
}

export async function initFirebaseClient() {
  if (firebaseAuth) return { app: firebaseApp, auth: firebaseAuth };

  const config = await getFirebaseConfig();

  // Load Firebase from CDN if not already loaded
  if (!window.firebase) {
    await Promise.all([
      loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js'),
      loadScript('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js'),
    ]);
  }

  if (!window.firebase.apps.length) {
    firebaseApp = window.firebase.initializeApp(config);
  } else {
    firebaseApp = window.firebase.app();
  }

  firebaseAuth = window.firebase.auth();
  return { app: firebaseApp, auth: firebaseAuth };
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) return resolve();

    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Perform login: authenticate with Firebase Auth, then exchange ID token for session cookie
 */
export async function loginWithEmailPassword(email, password) {
  const { auth } = await initFirebaseClient();

  // 1. Sign in with Firebase Client
  const userCredential = await auth.signInWithEmailAndPassword(email, password);
  const idToken = await userCredential.user.getIdToken();

  // 2. Exchange ID Token with server for secure HTTP-only session cookie
  const sessionResult = await apiRequest('/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });

  return sessionResult;
}
