const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load .env for local dev (on Vercel, env vars come from dashboard)
dotenv.config({ path: path.join(__dirname, '../.env') });

const { supabase } = require('../src/config/db');
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
    database: 'Supabase Postgres',
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? 'set' : 'MISSING',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'set' : 'MISSING',
    }
  });
});

module.exports = app;
