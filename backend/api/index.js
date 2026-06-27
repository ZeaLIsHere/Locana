const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load .env for local dev (on Vercel, env vars come from dashboard)
dotenv.config({ path: path.join(__dirname, '../.env') });

const { db } = require('../src/config/db');
const apiRouter = require('../src/routes/api');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', apiRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Locana API server is running (Vercel Serverless).' });
});

module.exports = app;
