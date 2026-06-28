const { db } = require('../config/db');
const { broadcastEvent } = require('../config/sse');

// Utility to generate unique 8 digit alphanumeric code (e.g. LOC12345)
function generateOrderNumber() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'LOC';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function createOrder(req, res) {
  const { customer_id, items, payment_method, notes, table_number } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order items are required' });
  }

  if (!payment_method || !['online_qris', 'cashier'].includes(payment_method)) {
    return res.status(400).json({ error: 'Valid payment method is required' });
  }

  try {
    // 1. Fetch all products to verify details
    const productsSnapshot = await db.collection('products').get();
    const productsMap = {};
    productsSnapshot.forEach(doc => {
      productsMap[doc.id] = { id: doc.id, ...doc.data() };
    });

    // 1.1 Look up table_id from table_number
    let tableId = null;
    if (table_number) {
      const tableSnap = await db.collection('tables')
        .where('number', '==', parseInt(table_number))
        .where('is_active', '==', true)
        .get();
      if (!tableSnap.empty) {
        tableId = tableSnap.docs[0].id;
      }
    }

    // 2. Validate customer points if customer_id provided
    let customerDoc = null;
    let customerData = null;
    if (customer_id) {
      customerDoc = await db.collection('users').doc(customer_id).get();
      if (!customerDoc.exists) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      customerData = customerDoc.data();
    }

    // 2.1 Calculate customer metrics: tier multiplier and birthday activity
    let multiplier = 1.0;
    let isBirthdayActive = false;
    if (customer_id && customerData) {
      // Calculate accumulated spending in the last 12 months
      const ordersSnapshot = await db.collection('orders')
        .where('customer_id', '==', customer_id)
        .get();
      let totalSpentLastYear = 0;
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
        }
      });
      if (totalSpentLastYear >= 3000000) {
        multiplier = 1.5;
      } else if (totalSpentLastYear >= 1500000) {
        multiplier = 1.2;
      }

      // Calculate Birthday Activity
      if (customerData.birthday) {
        const bDate = new Date(customerData.birthday);
        const bMonth = bDate.getMonth();
        const bDay = bDate.getDate();
        const diffs = [-1, 0, 1].map(offset => {
          const bYear = new Date(now.getFullYear() + offset, bMonth, bDay);
          return Math.abs(now.getTime() - bYear.getTime()) / (1000 * 60 * 60 * 24);
        });
        if (diffs.some(diff => diff <= 3)) {
          isBirthdayActive = true;
        }
      }
    }

    let totalPrice = 0;
    let pointsRedeemed = 0;
    const processedItems = [];

    // 3. Process each item
    for (const item of items) {
      const qty = parseInt(item.quantity) || 1;

      // Handle Point Rewards
      if (item.product_id === 'reward-25' || item.product_id === 'reward-50' || item.product_id === 'reward-100') {
        if (!customer_id) {
          return res.status(400).json({ error: 'Must be logged in as a member to redeem rewards' });
        }
        let rewardPoints = 0;
        let rewardName = '';
        if (item.product_id === 'reward-25') {
          rewardPoints = 25;
          rewardName = 'Gratis Minuman Regular (Redeem 25 Poin)';
        } else if (item.product_id === 'reward-50') {
          rewardPoints = 50;
          rewardName = 'Gratis Minuman + Croissant (Redeem 50 Poin)';
        } else if (item.product_id === 'reward-100') {
          rewardPoints = 100;
          rewardName = 'Gratis Minuman Signature 1L (Redeem 100 Poin)';
        }

        pointsRedeemed += rewardPoints * qty;
        processedItems.push({
          product_id: item.product_id,
          name: rewardName,
          quantity: qty,
          price_per_unit: 0,
          notes: item.notes || '',
          is_redeemed_by_points: true
        });
        continue;
      }

      const product = productsMap[item.product_id];
      if (!product) {
        return res.status(400).json({ error: `Product with ID ${item.product_id} not found` });
      }
      if (!product.is_available) {
        return res.status(400).json({ error: `Product ${product.name} is currently unavailable` });
      }

      const isRedeemed = !!item.is_redeemed_by_points;

      if (isRedeemed) {
        if (!customer_id) {
          return res.status(400).json({ error: 'Must be logged in as a member to redeem items with points' });
        }
        if (!product.points_cost || product.points_cost === 0) {
          return res.status(400).json({ error: `Product ${product.name} cannot be redeemed with points` });
        }
        pointsRedeemed += product.points_cost * qty;
        processedItems.push({
          product_id: product.id,
          name: product.name,
          quantity: qty,
          price_per_unit: 0,
          notes: item.notes || '',
          is_redeemed_by_points: true
        });
      } else {
        // Apply 20% discount on drinks if birthday is active
        let itemPrice = product.price;
        if (isBirthdayActive && (product.category_id === 'cat-coffee' || product.category_id === 'cat-non-coffee')) {
          itemPrice = Math.round(product.price * 0.8);
        }
        totalPrice += itemPrice * qty;
        processedItems.push({
          product_id: product.id,
          name: product.name,
          quantity: qty,
          price_per_unit: itemPrice,
          notes: item.notes || '',
          is_redeemed_by_points: false
        });
      }
    }

    // 1 point for every Rp25,000 spent
    const pointsEarned = customer_id ? Math.floor(totalPrice / 25000) * multiplier : 0;

    // Check if customer has enough points for redemptions
    if (customer_id && pointsRedeemed > customerData.loyalty_points) {
      return res.status(400).json({
        error: `Poin tidak mencukupi. Anda butuh ${pointsRedeemed} poin, tetapi hanya memiliki ${customerData.loyalty_points} poin.`
      });
    }

    // 4. Set order statuses based on payment method
    let status = 'pending_payment';
    let payment_status = 'unpaid';
    
    // For online QRIS, we will simulate immediate successful payment in frontend 
    // but default state here is pending until confirmed.
    // For cashier, status is pending_payment and payment is unpaid.
    if (payment_method === 'online_qris') {
      // Mock QRIS online payments automatically succeed after checkout in our simulator
      status = 'pending_payment';
      payment_status = 'unpaid';
    }

    const orderId = 'ord-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const orderNumber = generateOrderNumber();

    const newOrder = {
      id: orderId,
      order_number: orderNumber,
      customer_id: customer_id || null,
      customer_name: customerData ? customerData.name : 'Guest/Umum',
      cashier_id: null,
      table_id: tableId,
      table_number: table_number ? parseInt(table_number) : null,
      status,
      payment_method,
      payment_status,
      total_price: totalPrice,
      points_earned: customer_id ? pointsEarned : 0,
      points_redeemed: customer_id ? pointsRedeemed : 0,
      notes: notes || '',
      created_at: new Date().toISOString(),
      items: processedItems
    };

    // Save order
    await db.collection('orders').doc(orderId).set(newOrder);

    // Mock QRIS payment payload (e.g. Midtrans mockup)
    let qris_url = null;
    if (payment_method === 'online_qris') {
      // QRIS mock payload: QR code generated via public barcode api or static mock image
      // We will provide a standard Google Charts QR generator URL encoding our order data
      qris_url = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=LOCANA-QRIS-${orderId}-${totalPrice}`;
    }

    // Broadcast new order to cashier
    broadcastEvent('NEW_ORDER', newOrder);

    return res.status(201).json({
      message: 'Order created successfully',
      order: newOrder,
      qris_url
    });

  } catch (err) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: 'Failed to place order' });
  }
}

async function getOrders(req, res) {
  const { status, customer_id, order_number } = req.query;

  try {
    const snapshot = await db.collection('orders').get();
    let orders = [];
    snapshot.forEach(doc => {
      orders.push({ id: doc.id, ...doc.data() });
    });

    // Sort by created_at descending
    orders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Filters
    if (status) {
      orders = orders.filter(o => o.status === status);
    }
    if (customer_id) {
      orders = orders.filter(o => o.customer_id === customer_id);
    }
    if (order_number) {
      orders = orders.filter(o => o.order_number.toUpperCase().includes(order_number.toUpperCase()));
    }

    return res.status(200).json(orders);
  } catch (err) {
    console.error('Get orders error:', err);
    return res.status(500).json({ error: 'Failed to fetch orders' });
  }
}

async function getOrderById(req, res) {
  const { id } = req.params;

  try {
    const doc = await db.collection('orders').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.status(200).json({ id: doc.id, ...doc.data() });
  } catch (err) {
    console.error('Get order by ID error:', err);
    return res.status(500).json({ error: 'Failed to fetch order details' });
  }
}

async function processPayment(req, res) {
  const { id } = req.params;
  const { cashier_id } = req.body; // cash payment processed by cashier

  try {
    const orderRef = db.collection('orders').doc(id);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = doc.data();
    if (orderData.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid' });
    }

    // Update status to Paid and Preparing (kitchen dashboard)
    const updatedFields = {
      payment_status: 'paid',
      status: 'preparing',
      cashier_id: cashier_id || null
    };

    await orderRef.update(updatedFields);
    
    // Resolve loyalty points changes
    if (orderData.customer_id) {
      const userRef = db.collection('users').doc(orderData.customer_id);
      const userDoc = await userRef.get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const ptsChange = orderData.points_earned - orderData.points_redeemed;
        const newPtsBalance = Math.max(0, (userData.loyalty_points || 0) + ptsChange);
        
        await userRef.update({
          loyalty_points: newPtsBalance
        });

        // Insert points history transaction
        if (orderData.points_earned > 0) {
          const earnTxId = `loy-${id}-earn`;
          await db.collection('loyalty_transactions').doc(earnTxId).set({
            id: earnTxId,
            customer_id: orderData.customer_id,
            order_id: id,
            points: orderData.points_earned,
            transaction_type: 'earn',
            created_at: new Date().toISOString()
          });
        }

        if (orderData.points_redeemed > 0) {
          const redeemTxId = `loy-${id}-redeem`;
          await db.collection('loyalty_transactions').doc(redeemTxId).set({
            id: redeemTxId,
            customer_id: orderData.customer_id,
            order_id: id,
            points: -orderData.points_redeemed,
            transaction_type: 'redeem',
            created_at: new Date().toISOString()
          });
        }
      }
    }

    const updatedOrder = { ...orderData, ...updatedFields };
    
    // Broadcast status change to kitchen and cashier POS realtime
    broadcastEvent('ORDER_UPDATED', updatedOrder);

    return res.status(200).json({
      message: 'Payment completed successfully. Order sent to kitchen.',
      order: updatedOrder
    });

  } catch (err) {
    console.error('Process payment error:', err);
    return res.status(500).json({ error: 'Failed to process payment' });
  }
}

async function updateOrderStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body; // 'preparing', 'completed', 'cancelled'

  if (!['preparing', 'completed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const orderRef = db.collection('orders').doc(id);
    const doc = await orderRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const orderData = doc.data();
    
    // Update order status
    await orderRef.update({ status });

    const updatedOrder = { ...orderData, status };
    
    // Broadcast status change to all pages realtime
    broadcastEvent('ORDER_UPDATED', updatedOrder);

    return res.status(200).json({
      message: `Order status updated to ${status}`,
      order: updatedOrder
    });

  } catch (err) {
    console.error('Update status error:', err);
    return res.status(500).json({ error: 'Failed to update order status' });
  }
}

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  processPayment,
  updateOrderStatus
};
