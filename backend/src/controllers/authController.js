const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'locana_secret_key_123';

async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Look up user by email
    const userQuery = await db.collection('users')
      .where('email', '==', email.trim().toLowerCase())
      .get();

    if (userQuery.empty) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const userDoc = userQuery.docs[0];
    const userData = userDoc.data();

    // Verify password
    const isPasswordValid = bcrypt.compareSync(password, userData.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    // Generate token (valid for 24h)
    const token = jwt.sign(
      {
        id: userDoc.id,
        username: userData.username,
        email: userData.email,
        role: userData.role,
        name: userData.name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return profile details (without hash)
    const profile = { ...userData };
    delete profile.password_hash;

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: userDoc.id,
        ...profile
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
}

async function getProfile(req, res) {
  try {
    const userDoc = await db.collection('users').doc(req.user.id).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = userDoc.data();
    delete userData.password_hash;

    return res.status(200).json({
      id: userDoc.id,
      ...userData
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
}

module.exports = {
  login,
  getProfile
};
