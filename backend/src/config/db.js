const admin = require('firebase-admin');
const { MockFirestore } = require('./mockFirestore');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../../.env') });

let db;
let isMock = false;

// Check if Firebase service account key exists
const firebaseConfigPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || path.join(__dirname, '../../serviceAccountKey.json');

if (process.env.USE_MOCK_FIREBASE === 'true') {
  console.log('Firebase: Using Local Mock Firestore (Explicitly requested in .env)');
  db = new MockFirestore();
  isMock = true;
} else if (fs.existsSync(firebaseConfigPath)) {
  try {
    const serviceAccount = require(firebaseConfigPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = admin.firestore();
    console.log('Firebase: Connected to real Firebase Firestore Cloud via serviceAccountKey.json');
  } catch (err) {
    console.error('Firebase: Failed to connect using key file, falling back to Local Mock Firestore. Error:', err.message);
    db = new MockFirestore();
    isMock = true;
  }
} else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      })
    });
    db = admin.firestore();
    console.log('Firebase: Connected to real Firebase Firestore Cloud via Env Variables');
  } catch (err) {
    console.error('Firebase: Failed to connect via env, falling back to Local Mock Firestore. Error:', err.message);
    db = new MockFirestore();
    isMock = true;
  }
} else {
  console.log('Firebase: No credentials found (serviceAccountKey.json missing). Using Local Mock Firestore (Zero-Configuration Fallback)');
  db = new MockFirestore();
  isMock = true;
}

module.exports = {
  db,
  isMock
};
