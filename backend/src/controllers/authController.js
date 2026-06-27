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

    const metrics = await computeMemberMetrics(userDoc.id, userData);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: userDoc.id,
        ...profile,
        ...metrics
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

    const metrics = await computeMemberMetrics(userDoc.id, userData);

    return res.status(200).json({
      id: userDoc.id,
      ...userData,
      ...metrics
    });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Failed to fetch user profile' });
  }
}

// Helper to calculate dynamic member metrics (tier, points expiration, birthday discount)
async function computeMemberMetrics(userId, userDocData) {
  if (userDocData.role !== 'customer') {
    return {
      membership_tier: null,
      accumulated_spending: 0,
      points_expiration_date: null,
      is_birthday_active: false
    };
  }

  try {
    // Fetch completed/paid orders for this customer
    const ordersSnapshot = await db.collection('orders')
      .where('customer_id', '==', userId)
      .get();

    let totalSpentLastYear = 0;
    let latestOrderDate = null;
    const now = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    ordersSnapshot.forEach(doc => {
      const o = doc.data();
      if (o.payment_status === 'paid' && o.status !== 'cancelled') {
        const orderDate = new Date(o.created_at);
        if (orderDate >= oneYearAgo) {
          totalSpentLastYear += parseFloat(o.total_price) || 0;
        }
        if (!latestOrderDate || orderDate > latestOrderDate) {
          latestOrderDate = orderDate;
        }
      }
    });

    // Calculate Tier
    let tier = 'Silver';
    if (totalSpentLastYear >= 3000000) {
      tier = 'Platinum';
    } else if (totalSpentLastYear >= 1500000) {
      tier = 'Gold';
    }

    // Calculate Expiration (12 months after latest order)
    let expirationDateStr = null;
    if (latestOrderDate) {
      const exp = new Date(latestOrderDate);
      exp.setMonth(exp.getMonth() + 12);
      expirationDateStr = exp.toISOString().split('T')[0];
    } else {
      // Default 12 months after user's created_at or now
      const exp = new Date(userDocData.created_at || now);
      exp.setMonth(exp.getMonth() + 12);
      expirationDateStr = exp.toISOString().split('T')[0];
    }

    // Calculate Birthday Discount Activity (H-3 to H+3)
    let isBirthdayActive = false;
    if (userDocData.birthday) {
      // Parse birthday MM-DD
      const bDate = new Date(userDocData.birthday);
      const bMonth = bDate.getMonth();
      const bDay = bDate.getDate();

      // Check H-3 to H+3 in current year
      const bToday = new Date(now.getFullYear(), bMonth, bDay);
      
      // We check three years: last year, this year, next year to handle year boundary wrapping
      const diffs = [-1, 0, 1].map(offset => {
        const bYear = new Date(now.getFullYear() + offset, bMonth, bDay);
        return Math.abs(now.getTime() - bYear.getTime()) / (1000 * 60 * 60 * 24);
      });
      
      if (diffs.some(diff => diff <= 3)) {
        isBirthdayActive = true;
      }
    }

    return {
      membership_tier: tier,
      accumulated_spending: totalSpentLastYear,
      points_expiration_date: expirationDateStr,
      is_birthday_active: isBirthdayActive
    };
  } catch (err) {
    console.error('computeMemberMetrics error:', err);
    return {
      membership_tier: 'Silver',
      accumulated_spending: 0,
      points_expiration_date: null,
      is_birthday_active: false
    };
  }
}

module.exports = {
  login,
  getProfile
};
