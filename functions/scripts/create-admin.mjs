// One-time bootstrap: makes the first admin (everyone after that is added from the Users page).
//
//   cd functions
//   gcloud auth application-default login        # or: export GOOGLE_APPLICATION_CREDENTIALS=path/to/key.json
//   node scripts/create-admin.mjs --project YOUR-PROJECT-ID --email you@kcbobcat.com --name "Your Name"
//
// Prints a link to set the password. Running it again for the same email just makes sure they're an active admin.

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    project: { type: 'string' },
    email: { type: 'string' },
    name: { type: 'string' },
  },
});

if (!values.project || !values.email || !values.name) {
  console.error('Usage: node scripts/create-admin.mjs --project PROJECT_ID --email EMAIL --name "Full Name"');
  process.exit(1);
}

initializeApp({ credential: applicationDefault(), projectId: values.project });
const auth = getAuth();
const db = getFirestore();
const email = values.email.trim().toLowerCase();

let user;
try {
  user = await auth.getUserByEmail(email);
  console.log(`Auth user already exists (${user.uid}).`);
} catch (err) {
  if (err.code !== 'auth/user-not-found') throw err;
  user = await auth.createUser({ email, displayName: values.name, password: randomBytes(24).toString('base64url') });
  console.log(`Created auth user ${user.uid}.`);
}

await db.doc(`users/${user.uid}`).set(
  {
    email,
    displayName: values.name,
    role: 'admin',
    active: true,
    notifyNewUnits: 'all',
    notifyLocations: [],
    notifyAssigned: true,
    createdAt: FieldValue.serverTimestamp(),
  },
  { merge: true },
);

const link = await auth.generatePasswordResetLink(email);
console.log(`\n${email} is an admin.\nSet the password here:\n\n${link}\n`);
process.exit(0);
