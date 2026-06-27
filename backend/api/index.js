const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load .env for local dev (on Vercel, env vars come from dashboard)
dotenv.config({ path: path.join(__dirname, '../.env') });

const { db, isMock, firebaseError } = require('../src/config/db');
const apiRouter = require('../src/routes/api');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRouter);

// Diagnostic endpoint — buka di browser untuk cek status koneksi database
app.get('/', (req, res) => {
  res.json({
    message: 'Locana API server is running (Vercel Serverless).',
    database: isMock ? 'MockFirestore (FALLBACK — NOT persistent!)' : 'Firebase Firestore Cloud',
    firebaseError: firebaseError || null,
    env: {
      USE_MOCK_FIREBASE: process.env.USE_MOCK_FIREBASE || '(not set)',
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'set' : 'MISSING',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'set' : 'MISSING',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? `set (len=${process.env.FIREBASE_PRIVATE_KEY.length})` : 'MISSING',
      FIREBASE_PRIVATE_KEY_BASE64: process.env.FIREBASE_PRIVATE_KEY_BASE64 ? `set (len=${process.env.FIREBASE_PRIVATE_KEY_BASE64.length})` : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'set' : 'MISSING',
    }
  });
});

module.exports = app;
