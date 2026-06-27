const admin = require('firebase-admin');
const { MockFirestore } = require('./mockFirestore');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config({ path: path.join(__dirname, '../../.env') });

let db;
let isMock = false;
let firebaseError = null; // pesan error terakhir saat init Firebase (untuk diagnostik)

// Check if Firebase service account key exists
const firebaseConfigPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || path.join(__dirname, '../../serviceAccountKey.json');

// Normalisasi private key agar tahan terhadap berbagai bentuk escaping saat
// disimpan di environment variable (Vercel/Render dll).
function normalizePrivateKey(raw) {
  if (!raw) return raw;
  let key = raw.trim();

  // 1. Jika seseorang menyimpan key dalam bentuk base64 penuh, decode dulu.
  //    PEM yang valid selalu mengandung "BEGIN". Kalau tidak ada, coba base64-decode.
  if (!key.includes('BEGIN')) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('BEGIN')) key = decoded;
    } catch (_) { /* abaikan */ }
  }

  // 2. Buang tanda kutip pembungkus jika ikut ter-copy.
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }

  // 3. Tangani escaping berlapis: \\n -> \n, lalu \n literal -> newline asli.
  key = key.replace(/\\\\n/g, '\\n').replace(/\\n/g, '\n').replace(/\\r/g, '');

  return key;
}

console.log('[DB] ENV CHECK:', {
  USE_MOCK_FIREBASE: process.env.USE_MOCK_FIREBASE,
  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? '✓ set' : '✗ missing',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? '✓ set' : '✗ missing',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? '✓ set' : '✗ missing',
  FIREBASE_PRIVATE_KEY_BASE64: process.env.FIREBASE_PRIVATE_KEY_BASE64 ? '✓ set' : '✗ missing',
});

// Sumber private key: utamakan versi base64 (paling aman), fallback ke yang biasa.
const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY_BASE64 || process.env.FIREBASE_PRIVATE_KEY;

if (process.env.USE_MOCK_FIREBASE === 'true') {
  console.log('Firebase: Using Local Mock Firestore (Explicitly requested in .env)');
  db = new MockFirestore();
  isMock = true;
} else if (fs.existsSync(firebaseConfigPath)) {
  try {
    const serviceAccount = require(firebaseConfigPath);
    if (admin.apps.length === 0) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    db = admin.firestore();
    console.log('Firebase: Connected to real Firebase Firestore Cloud via serviceAccountKey.json');
  } catch (err) {
    firebaseError = err.message;
    console.error('Firebase: Failed via key file, falling back to Mock. Error:', err.message);
    db = new MockFirestore();
    isMock = true;
  }
} else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && rawPrivateKey) {
  try {
    const privateKey = normalizePrivateKey(rawPrivateKey);

    // Validasi bentuk PEM sebelum diserahkan ke Firebase.
    if (!privateKey.includes('BEGIN PRIVATE KEY')) {
      throw new Error('Private key tidak berbentuk PEM yang valid setelah normalisasi (tidak ada header BEGIN PRIVATE KEY). Kemungkinan nilai env var rusak/terpotong.');
    }

    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        })
      });
    }
    db = admin.firestore();
    console.log('Firebase: Connected to real Firebase Firestore Cloud via Env Variables');
  } catch (err) {
    firebaseError = err.message;
    console.error('Firebase: Failed via env, falling back to Mock. Error:', err.message);
    db = new MockFirestore();
    isMock = true;
  }
} else {
  console.log('Firebase: No credentials found. Using Local Mock Firestore (Zero-Configuration Fallback)');
  db = new MockFirestore();
  isMock = true;
}

module.exports = {
  db,
  isMock,
  firebaseError,
};
