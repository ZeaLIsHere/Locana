const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const { db } = require('./config/db');
const seedDatabase = require('./config/seeder');
const apiRouter = require('./routes/api');

dotenv.config({ path: path.join(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routing API
app.use('/api', apiRouter);

// Basic health check route
app.get('/', (req, res) => {
  res.json({ message: 'Locana API server is running.' });
});

// Auto-seed if database is empty on boot
async function initializeServer() {
  try {
    const usersSnapshot = await db.collection('users').get();
    if (usersSnapshot.empty) {
      console.log('Database is empty. Running full seeder to initialize demo accounts, menu products, and historical sales transactions...');
      await seedDatabase(false);
    } else {
      console.log('Database already has data. Syncing categories and products menu (overwriting with latest changes/images)...');
      await seedDatabase(true);
    }
  } catch (err) {
    console.error('Database check/seeding failed at startup. Server will continue running:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`  Locana API Server running on port ${PORT}`);
    console.log(`  Real-time SSE: http://localhost:${PORT}/api/realtime`);
    console.log(`========================================`);
  });
}

initializeServer();
