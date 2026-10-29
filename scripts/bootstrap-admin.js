/**
 * Blindspot — Bootstrap Initial Administrator Account
 *
 * Usage:
 *   node scripts/bootstrap-admin.js <email> <password> [name]
 * or set environment variables:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
 */
import { auth, db } from '../src/config/firebase.js';
import { COLLECTIONS, ROLES } from '../src/constants/index.js';
import { serverTimestamp } from '../src/utils/index.js';

async function bootstrap() {
  const email = process.argv[2] || process.env.ADMIN_EMAIL;
  const password = process.argv[3] || process.env.ADMIN_PASSWORD;
  const name = process.argv[4] || process.env.ADMIN_NAME || 'System Administrator';

  if (!email || !password) {
    console.error(`
Usage:
  node scripts/bootstrap-admin.js <email> <password> [name]

Or set environment variables:
  ADMIN_EMAIL="admin@blindspot.local"
  ADMIN_PASSWORD="YourStrongPassword123!"
  ADMIN_NAME="Chief Logistics Admin"
`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  console.log(`[bootstrap] Creating or updating administrator: ${email}...`);

  let userRecord;
  try {
    userRecord = await auth.getUserByEmail(email);
    console.log(`[bootstrap] Existing Auth user found with UID: ${userRecord.uid}`);
    await auth.updateUser(userRecord.uid, {
      password,
      displayName: name,
    });
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
        emailVerified: true,
      });
      console.log(`[bootstrap] Created new Auth user with UID: ${userRecord.uid}`);
    } else {
      throw err;
    }
  }

  // Set custom user claims for role ADMIN
  await auth.setCustomUserClaims(userRecord.uid, { role: ROLES.ADMIN, admin: true });

  // Create or update employee record in Firestore
  const empRef = db.collection(COLLECTIONS.EMPLOYEES).doc(userRecord.uid);
  const empDoc = await empRef.get();

  const employeeData = {
    uid: userRecord.uid,
    name,
    email: email.toLowerCase(),
    role: ROLES.ADMIN,
    enabled: true,
    updatedAt: serverTimestamp(),
  };

  if (!empDoc.exists) {
    employeeData.createdAt = serverTimestamp();
    employeeData.createdBy = 'SYSTEM_BOOTSTRAP';
  }

  await empRef.set(employeeData, { merge: true });

  console.log(`
┌─────────────────────────────────────────────────────────────┐
│              ADMIN BOOTSTRAP SUCCESSFUL                     │
├─────────────────────────────────────────────────────────────┤
│  • UID    : ${userRecord.uid.padEnd(46)} │
│  • Email  : ${email.padEnd(46)} │
│  • Role   : ${ROLES.ADMIN.padEnd(46)} │
│  • Status : Enabled (Ready for login)                      │
└─────────────────────────────────────────────────────────────┘
  `);
}

bootstrap()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[bootstrap] Failed:', err);
    process.exit(1);
  });
